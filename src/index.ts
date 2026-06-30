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
import alexaRoutes from './routes/alexa.routes';
import siteSettingsRoutes from './routes/siteSettings.routes';
import clientsRoutes from './routes/clients.routes';

dotenv.config();
const app = express();

// CORS dinámico (igual que lo tienes)
app.use((req, res, next) => {
    const allowedOrigins = [
        'https://stetica.netlify.app',
        'http://localhost:5173',
        'http://localhost:5174'
    ];
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin as string)) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
    }
    next();
});

app.use(express.json());

// Rutas
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/backups', backupRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/alexa', alexaRoutes);
app.use('/api/site-settings', siteSettingsRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/', (req, res) => {
    res.json({
        message: "Backend Estética Online 🚀",
        status: "Online",
        environment: process.env.NODE_ENV || 'development'
    });
});

const PORT = process.env.PORT || 3000;

// En local arrancamos Express. En Vercel la plataforma ejecuta la app exportada.
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`---------------------------------------------------`);
        console.log(`✅ Servidor encendido: http://localhost:${PORT}`);
        console.log(`🛡️  CORS configurado para: Netlify y Localhost`);
        console.log(`---------------------------------------------------`);
    });
}

export default app;
