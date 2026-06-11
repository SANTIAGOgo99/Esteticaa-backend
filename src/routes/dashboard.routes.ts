// src/routes/dashboard.routes.ts
import { Router } from 'express';
import { getDashboardSummary } from '../controllers/dashboard.controller';
import { verifyToken, isAdmin } from '../middlewares/auth.middleware';

const router = Router();

// Ruta real: /api/dashboard/summary
router.get('/summary', verifyToken, isAdmin, getDashboardSummary);

export default router;