// src/routes/appointments.routes.ts

import { Router } from 'express';

import {
  getAppointments,
  getMyAppointments,
  updateAppointmentStatus,
  createAppointment,
  getAvailableSlots,
  cancelAppointment,
  updateAppointment,
  createManualAppointment,
  closeAppointment,
  getAppointmentAvailability,
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
// CONSULTAR DISPONIBILIDAD DE UN HORARIO
// =======================================================

router.get(
  '/availability',
  verifyToken,
  getAppointmentAvailability
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
// CREAR CITA MANUAL — ADMIN
// =======================================================

router.post(
  '/manual',
  verifyToken,
  isAdmin,
  createManualAppointment
);

// =======================================================
// EDITAR CITA
// =======================================================

router.put(
  '/:id',
  verifyToken,
  updateAppointment
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

// =======================================================
// CERRAR CITA — ADMIN
// completed / no_show
// =======================================================

router.put(
  '/:id/close',
  verifyToken,
  isAdmin,
  closeAppointment
);

// =======================================================
// CANCELAR CITA
// Esta es la ruta que faltaba y que usa tu frontend:
// PATCH /api/appointments/:id/cancel
// =======================================================

router.patch(
  '/:id/cancel',
  verifyToken,
  cancelAppointment
);

export default router;
