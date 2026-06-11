// src/routes/analytics.routes.ts
import { Router } from 'express';
import {
    getBusinessAnalytics,
    getServiceDemandPrediction,
    getHistoricalAppointments
} from '../controllers/analytics.controller';

const router = Router();

// GET /api/analytics/business
// Retorna KPIs, tendencia diaria, horas pico, retención, modelo logístico predictivo e ingresos.
router.get('/business', getBusinessAnalytics);

// GET /api/analytics/service-demand-prediction
// Retorna top 5 servicios con predicción para la próxima semana,
// tendencia (up/down/stable), factor de temporada mensual y distribución por día.
router.get('/service-demand-prediction', getServiceDemandPrediction);

// GET /api/analytics/historical
// Retorna el histórico completo de citas con filtros por categoría y semana.
// Query params: ?categoria=Colorimetría&semana=2
router.get('/historical', getHistoricalAppointments);

export default router;