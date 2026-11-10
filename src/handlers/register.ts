import type { Request, Response } from 'express';

type PublicUser = { id: number; full_name: string; email: string; role: string };
type Dependencies = {
    query: (sql: string, values: unknown[]) => Promise<{ rows: PublicUser[] }>;
    hashPassword: (password: string) => Promise<string>;
    reportFailure: (code: string) => void;
};

/** El registro público solo permite crear clientes, independientemente del cuerpo recibido. */
export function createRegisterHandler({ query, hashPassword, reportFailure }: Dependencies) {
    return async (req: Request, res: Response) => {
        const body = req.body;
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            return res.status(400).json({ error: 'Revisa los datos de registro.' });
        }
        const { full_name, email, password, phone } = body;
        if (typeof full_name !== 'string' || full_name.trim().length < 3 || full_name.length > 120 ||
            typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
            typeof phone !== 'string' || !/^\d{10}$/.test(phone) ||
            typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
            return res.status(400).json({ error: 'Revisa nombre, correo, teléfono de 10 dígitos y contraseña de 8 caracteres o más (máximo 72 bytes).' });
        }

        try {
            const hashedPassword = await hashPassword(password);
            const result = await query(
                "INSERT INTO auth.users (full_name, email, password_hash, phone, role) VALUES ($1, $2, $3, $4, 'client') RETURNING id, full_name, email, role",
                [full_name.trim(), email.trim(), hashedPassword, phone],
            );
            const user = result.rows[0];
            if (!user || user.role !== 'client') throw new Error('Invalid registration result');
            return res.status(201).json({
                message: 'Usuario registrado',
                user: { id: user.id, full_name: user.full_name, email: user.email, role: 'client' },
            });
        } catch (error: unknown) {
            const candidate = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
            const code = typeof candidate === 'string' && /^[A-Z0-9]{5}$/.test(candidate) ? candidate : 'REGISTER_FAILED';
            if (code === '23505') return res.status(400).json({ error: 'El correo ya está registrado' });
            // El diagnóstico público no incluye SQL, credenciales, datos de cliente ni stack.
            reportFailure(code);
            return res.status(500).json({ error: 'Error del servidor' });
        }
    };
}
