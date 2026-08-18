// src/index.ts

import express from 'express';
import dotenv from 'dotenv';
import path from 'path';

import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import productsRoutes from './routes/products.routes';
import servicesRoutes from './routes/services.routes';
import usersRoutes from './routes/users.routes';
import appointmentsRoutes from './routes/appointments.routes';
import backupRoutes from './routes/backups.routes';
import statsRoutes from './routes/stats.routes';
import dashboardRoutes from './routes/dashboard.routes';
import analyticsRoutes from './routes/analytics.routes';
import alexaRoutes from './routes/alexa.routes';
import alexaOAuthRoutes from './routes/alexaOAuth.routes';

dotenv.config();

const app = express();

// ============================================================================
// CORS
// ============================================================================

const allowedOrigins = [
  // Frontend nuevo de Héctor
  'https://esteticaa-frontend-ten.vercel.app',

  // Frontend anterior
  'https://frontend-javier20230069s-projects.vercel.app',

  // Netlify anterior
  'https://stetica.netlify.app',

  // Desarrollo local
  'http://localhost:5173',
  'http://localhost:5174',
];

// Permite también deployments Preview de este frontend en Vercel.
const isAllowedVercelPreview = (origin: string): boolean => {
  return (
    origin.startsWith('https://esteticaa-frontend-') &&
    origin.endsWith('.vercel.app')
  );
};

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (
    origin &&
    (
      allowedOrigins.includes(origin) ||
      isAllowedVercelPreview(origin)
    )
  ) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE, OPTIONS'
  );

  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );

  res.setHeader(
    'Access-Control-Allow-Credentials',
    'true'
  );

  // Responder correctamente al preflight de navegador
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }

  next();
});

// ============================================================================
// MIDDLEWARES
// ============================================================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================================
// RUTAS
// ============================================================================

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/backups', backupRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/analytics', analyticsRoutes);

// Alexa
app.use('/api/alexa', alexaRoutes);
app.use('/api/alexa/oauth', alexaOAuthRoutes);

// Archivos públicos
app.use(
  '/uploads',
  express.static(path.join(process.cwd(), 'uploads'))
);

// ============================================================================
// RUTA PRINCIPAL
// ============================================================================

app.get('/', (_req, res) => {
  res.json({
    message: 'Backend Estética Online 🚀',
    status: 'Online',
    environment: process.env.NODE_ENV || 'development',
  });
});

// ============================================================================
// SERVIDOR
// ============================================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('---------------------------------------------------');
  console.log(`✅ Servidor encendido: http://localhost:${PORT}`);
  console.log('🛡️ CORS configurado para frontend, Alexa y localhost');
  console.log('---------------------------------------------------');
});

export default app;
