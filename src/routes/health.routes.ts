import { Router } from 'express';
import { getPing } from '../controllers/health.controller';

const router = Router();

// Cuando alguien entre a /api/ping, ejecuta la función getPing
router.get('/ping', getPing);

export default router;