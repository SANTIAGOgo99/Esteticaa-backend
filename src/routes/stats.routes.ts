// src/routes/stats.routes.ts
import { Router } from 'express';
import { getSystemStats } from '../controllers/stats.controller';
import { verifyToken, isAdmin } from '../middlewares/auth.middleware';

const router = Router();

// 🛡️ Ruta mega protegida: Solo si tienes Token válido y eres Administrador
router.get('/', verifyToken, isAdmin, getSystemStats);

export default router;