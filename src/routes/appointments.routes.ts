// src/routes/appointments.routes.ts
import { Router } from 'express';
import {
  getAppointments,
  updateAppointmentStatus,
  createAppointment,
  getAvailableSlots,
} from '../controllers/appointments.controller';

import { verifyToken, isAdmin } from '../middlewares/auth.middleware';

const router = Router();

// Obtener todas las citas para admin
router.get('/', verifyToken, isAdmin, getAppointments);

// Obtener horarios disponibles y ocupados
router.get('/slots', verifyToken, getAvailableSlots);

// Cambiar estado de cita
router.put('/:id/status', verifyToken, isAdmin, updateAppointmentStatus);

// Crear cita desde cliente
router.post('/', verifyToken, createAppointment);

export default router;