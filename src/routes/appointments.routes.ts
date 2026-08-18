// src/routes/appointments.routes.ts

import { Router } from 'express';

import {
  getAppointments,
  getMyAppointments,
  updateAppointmentStatus,
  createAppointment,
  getAvailableSlots,
} from '../controllers/appointments.controller';

import {
  verifyToken,
  isAdmin,
} from '../middlewares/auth.middleware';

const router = Router();

// =======================================================
// CITAS DEL CLIENTE LOGUEADO
// =======================================================

router.get(
  '/my',
  verifyToken,
  getMyAppointments
);

// =======================================================
// HORARIOS DISPONIBLES
// =======================================================

router.get(
  '/slots',
  verifyToken,
  getAvailableSlots
);

// =======================================================
// TODAS LAS CITAS — ADMIN
// =======================================================

router.get(
  '/',
  verifyToken,
  isAdmin,
  getAppointments
);

// =======================================================
// CREAR CITA DESDE CLIENTE / ALEXA
// =======================================================

router.post(
  '/',
  verifyToken,
  createAppointment
);

// =======================================================
// ACTUALIZAR ESTADO — ADMIN
// =======================================================

router.put(
  '/:id/status',
  verifyToken,
  isAdmin,
  updateAppointmentStatus
);

export default router;
