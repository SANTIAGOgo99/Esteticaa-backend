// src/routes/appointments.routes.ts
import { Router } from 'express';
import {
  getMyAppointments,
  updateAppointmentStatus,
  closeAppointment,
  createAppointment,
  getAvailabilityCalendar,
  rescheduleAppointment,
} from '../controllers/appointments.controller';
import {
  getAppointmentsForAdmin,
  cancelMyAppointmentFlexible,
} from '../controllers/appointments.portal.controller';
import { getAlexaDurationSlots } from '../controllers/alexaAgenda.controller';

import { verifyToken, isAdmin } from '../middlewares/auth.middleware';

const router = Router();

// Obtener todas las citas para admin con hora local explícita
router.get('/', verifyToken, isAdmin, getAppointmentsForAdmin);

// Obtener las citas del cliente autenticado
router.get('/my', verifyToken, getMyAppointments);

// Obtener disponibilidad mensual para calendario de cliente
router.get('/availability-calendar', verifyToken, getAvailabilityCalendar);

// Obtener horarios disponibles y ocupados.
// El paso de los horarios depende de duration_minutes del servicio.
router.get('/slots', verifyToken, getAlexaDurationSlots);

// Cancelar cita propia del cliente. Se permite antes de la cita; dentro de 24h no hay reembolso del anticipo.
router.patch('/:id/cancel', verifyToken, cancelMyAppointmentFlexible);

// Reagendar cita propia o, para administradores, cualquier cita
router.patch('/:id/reschedule', verifyToken, rescheduleAppointment);

// Cerrar cita desde administracion
router.patch('/:id/close', verifyToken, isAdmin, closeAppointment);

// Cambiar estado de cita
router.put('/:id/status', verifyToken, isAdmin, updateAppointmentStatus);

// Crear cita desde cliente
router.post('/', verifyToken, createAppointment);

export default router;
