// src/routes/appointments.routes.ts
import { Router } from 'express';
import {
  getAppointments,
  getMyAppointments,
  cancelMyAppointment,
  updateAppointmentStatus,
  closeAppointment,
  createAppointment,
  getAvailableSlots,
  getAvailabilityCalendar,
} from '../controllers/appointments.controller';

import { verifyToken, isAdmin } from '../middlewares/auth.middleware';

const router = Router();

// Obtener todas las citas para admin
router.get('/', verifyToken, isAdmin, getAppointments);

// Obtener las citas del cliente autenticado
router.get('/my', verifyToken, getMyAppointments);

// Obtener disponibilidad mensual para calendario de cliente
router.get('/availability-calendar', verifyToken, getAvailabilityCalendar);

// Obtener horarios disponibles y ocupados
router.get('/slots', verifyToken, getAvailableSlots);

// Cancelar cita propia del cliente
router.patch('/:id/cancel', verifyToken, cancelMyAppointment);

// Cerrar cita desde administracion
router.patch('/:id/close', verifyToken, isAdmin, closeAppointment);

// Cambiar estado de cita
router.put('/:id/status', verifyToken, isAdmin, updateAppointmentStatus);

// Crear cita desde cliente
router.post('/', verifyToken, createAppointment);

export default router;
