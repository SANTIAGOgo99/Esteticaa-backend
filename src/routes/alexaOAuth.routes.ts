import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool from '../config/db';

const router = express.Router();
router.use(express.urlencoded({ extended: true }));

const CLIENT_ID = () => process.env.ALEXA_CLIENT_ID || '';
const CLIENT_SECRET = () => process.env.ALEXA_CLIENT_SECRET || '';
const JWT_SECRET = () => process.env.JWT_SECRET || '';

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function base64UrlSha256(value: string) {
  return crypto.createHash('sha256').update(value).digest('base64url');
}

function getClientCredentials(req: Request) {
  let clientId = String(req.body.client_id || '');
  let clientSecret = String(req.body.client_secret || '');
  const auth = req.header('authorization') || '';

  if (auth.startsWith('Basic ')) {
    try {
      const decoded = Buffer.from(auth.slice(6), 'base64').toString('utf8');
      const splitAt = decoded.indexOf(':');

      if (splitAt >= 0) {
        clientId = decoded.slice(0, splitAt);
        clientSecret = decoded.slice(splitAt + 1);
      }
    } catch (_) {
      // Se validará abajo.
    }
  }

  return { clientId, clientSecret };
}

function isSafeRedirectUri(uri: string) {
  try {
    const parsed = new URL(uri);
    return parsed.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

function renderLoginPage(params: Record<string, string>, error = '') {
  const hidden = Object.entries(params)
    .map(
      ([key, value]) =>
        `<input type="hidden" name="${escapeHtml(key)}" value="${escapeHtml(value)}">`
    )
    .join('\n');

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Vincular cuenta - Ezequiel Castillo</title>
<style>
*{box-sizing:border-box}
body{
  margin:0;
  font-family:Arial,sans-serif;
  background:linear-gradient(135deg,#17120f,#3a2a22);
  color:#fff;
  min-height:100vh;
  display:grid;
  place-items:center;
  padding:24px
}
.card{
  width:min(430px,100%);
  background:#fff;
  color:#2b201b;
  border-radius:24px;
  padding:30px;
  box-shadow:0 20px 60px #0008
}
.brand{
  font-weight:800;
  letter-spacing:.08em;
  color:#a77d27;
  font-size:13px
}
.card h1{margin:9px 0 8px;font-size:30px}
.card p{margin:0 0 22px;color:#685950;line-height:1.45}
.field{margin-bottom:14px}
.field label{display:block;font-weight:700;margin-bottom:6px}
.field input{
  width:100%;
  padding:13px 14px;
  border-radius:12px;
  border:1px solid #d8cdc5;
  font-size:16px
}
.btn{
  width:100%;
  border:0;
  border-radius:13px;
  background:#caa54f;
  color:#21170f;
  font-weight:800;
  padding:14px;
  font-size:16px;
  cursor:pointer
}
.error{
  background:#fee8e8;
  color:#8c2525;
  border-radius:10px;
  padding:10px 12px;
  margin-bottom:15px
}
.note{
  font-size:12px;
  color:#87756a;
  margin-top:14px;
  text-align:center
}
</style>
</head>
<body>
<main class="card">
<div class="brand">EZEQUIEL CASTILLO ESTÉTICA</div>
<h1>Vincular con Alexa</h1>
<p>
Inicia sesión con la misma cuenta que utilizas en el sistema web.
Alexa recibirá un token y no tendrá acceso a tu contraseña.
</p>

${error ? `<div class="error">${escapeHtml(error)}</div>` : ''}

<form method="post" action="/api/alexa/oauth/authorize">
${hidden}

<div class="field">
<label>Correo</label>
<input name="email" type="email" autocomplete="email" required>
</div>

<div class="field">
<label>Contraseña</label>
<input name="password" type="password" autocomplete="current-password" required>
</div>

<button class="btn" type="submit">Vincular cuenta</button>
</form>

<div class="note">
La vinculación solo se usa para funciones privadas como agendar citas.
</div>
</main>
</body>
</html>`;
}

router.get('/authorize', (req: Request, res: Response) => {
  const clientId = String(req.query.client_id || '');
  const redirectUri = String(req.query.redirect_uri || '');
  const responseType = String(req.query.response_type || '');

  if (!CLIENT_ID() || !CLIENT_SECRET() || !JWT_SECRET()) {
    return res.status(500).send(
      'Faltan variables de entorno para Account Linking.'
    );
  }

  if (clientId !== CLIENT_ID()) {
    return res.status(400).send('client_id inválido.');
  }

  if (responseType !== 'code') {
    return res.status(400).send('response_type no soportado.');
  }

  if (!isSafeRedirectUri(redirectUri)) {
    return res.status(400).send('redirect_uri inválido.');
  }

  const params = {
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: responseType,
    state: String(req.query.state || ''),
    scope: String(req.query.scope || ''),
    code_challenge: String(req.query.code_challenge || ''),
    code_challenge_method: String(req.query.code_challenge_method || ''),
  };

  return res
    .status(200)
    .type('html')
    .send(renderLoginPage(params));
});

router.post('/authorize', async (req: Request, res: Response) => {
  const {
    email,
    password,
    client_id,
    redirect_uri,
    response_type,
    state,
    scope,
    code_challenge,
    code_challenge_method,
  } = req.body;

  const params = {
    client_id: String(client_id || ''),
    redirect_uri: String(redirect_uri || ''),
    response_type: String(response_type || ''),
    state: String(state || ''),
    scope: String(scope || ''),
    code_challenge: String(code_challenge || ''),
    code_challenge_method: String(code_challenge_method || ''),
  };

  try {
    if (params.client_id !== CLIENT_ID()) {
      return res
        .status(400)
        .type('html')
        .send(renderLoginPage(params, 'Solicitud no válida.'));
    }

    if (params.response_type !== 'code') {
      return res
        .status(400)
        .type('html')
        .send(renderLoginPage(params, 'Flujo no soportado.'));
    }

    if (!isSafeRedirectUri(params.redirect_uri)) {
      return res
        .status(400)
        .type('html')
        .send(renderLoginPage(params, 'Redirección no válida.'));
    }

    const result = await pool.query(
      'SELECT * FROM auth.users WHERE email = $1',
      [String(email || '').trim().toLowerCase()]
    );

    if (!result.rows.length) {
      return res
        .status(401)
        .type('html')
        .send(renderLoginPage(params, 'Correo o contraseña incorrectos.'));
    }

    const user = result.rows[0];

    if (user.is_active === false) {
      return res
        .status(403)
        .type('html')
        .send(renderLoginPage(params, 'La cuenta está suspendida.'));
    }

    const validPassword = await bcrypt.compare(
      String(password || ''),
      user.password_hash
    );

    if (!validPassword) {
      return res
        .status(401)
        .type('html')
        .send(renderLoginPage(params, 'Correo o contraseña incorrectos.'));
    }

    const code = jwt.sign(
      {
        kind: 'alexa_auth_code',
        id: user.id,
        role: user.role,
        email: user.email,
        client_id: params.client_id,
        redirect_uri: params.redirect_uri,
        scope: params.scope,
        code_challenge: params.code_challenge,
        code_challenge_method: params.code_challenge_method,
      },
      JWT_SECRET(),
      { expiresIn: '5m' }
    );

    const redirect = new URL(params.redirect_uri);
    redirect.searchParams.set('code', code);
    redirect.searchParams.set('state', params.state);

    return res.redirect(302, redirect.toString());
  } catch (error) {
    console.error('Alexa OAuth authorize:', error);

    return res
      .status(500)
      .type('html')
      .send(
        renderLoginPage(
          params,
          'No se pudo vincular la cuenta. Intenta de nuevo.'
        )
      );
  }
});

router.post('/token', async (req: Request, res: Response) => {
  const { clientId, clientSecret } = getClientCredentials(req);

  if (clientId !== CLIENT_ID() || clientSecret !== CLIENT_SECRET()) {
    return res.status(401).json({
      error: 'invalid_client',
    });
  }

  const grantType = String(req.body.grant_type || '');

  try {
    if (grantType === 'authorization_code') {
      const code = String(req.body.code || '');
      const redirectUri = String(req.body.redirect_uri || '');
      const verifier = String(req.body.code_verifier || '');

      const decoded: any = jwt.verify(code, JWT_SECRET());

      if (decoded.kind !== 'alexa_auth_code') {
        return res.status(400).json({
          error: 'invalid_grant',
        });
      }

      if (
        decoded.client_id !== clientId ||
        decoded.redirect_uri !== redirectUri
      ) {
        return res.status(400).json({
          error: 'invalid_grant',
        });
      }

      if (decoded.code_challenge) {
        if (
          decoded.code_challenge_method !== 'S256' ||
          !verifier
        ) {
          return res.status(400).json({
            error: 'invalid_grant',
          });
        }

        if (
          base64UrlSha256(verifier) !== decoded.code_challenge
        ) {
          return res.status(400).json({
            error: 'invalid_grant',
          });
        }
      }

      const accessToken = jwt.sign(
        {
          id: decoded.id,
          role: decoded.role,
          email: decoded.email,
          kind: 'alexa_access',
        },
        JWT_SECRET(),
        { expiresIn: '1h' }
      );

      const refreshToken = jwt.sign(
        {
          id: decoded.id,
          role: decoded.role,
          email: decoded.email,
          kind: 'alexa_refresh',
        },
        JWT_SECRET(),
        { expiresIn: '90d' }
      );

      return res.json({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: refreshToken,
      });
    }

    if (grantType === 'refresh_token') {
      const refreshToken = String(req.body.refresh_token || '');
      const decoded: any = jwt.verify(
        refreshToken,
        JWT_SECRET()
      );

      if (decoded.kind !== 'alexa_refresh') {
        return res.status(400).json({
          error: 'invalid_grant',
        });
      }

      const accessToken = jwt.sign(
        {
          id: decoded.id,
          role: decoded.role,
          email: decoded.email,
          kind: 'alexa_access',
        },
        JWT_SECRET(),
        { expiresIn: '1h' }
      );

      const newRefreshToken = jwt.sign(
        {
          id: decoded.id,
          role: decoded.role,
          email: decoded.email,
          kind: 'alexa_refresh',
        },
        JWT_SECRET(),
        { expiresIn: '90d' }
      );

      return res.json({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: newRefreshToken,
      });
    }

    return res.status(400).json({
      error: 'unsupported_grant_type',
    });
  } catch (error) {
    console.error('Alexa OAuth token:', error);

    return res.status(400).json({
      error: 'invalid_grant',
    });
  }
});

export default router;
