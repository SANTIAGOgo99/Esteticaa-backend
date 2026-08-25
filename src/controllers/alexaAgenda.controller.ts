import { Request, Response } from 'express';
import pool from '../config/db';
import {
  checkAppointmentAvailability,
  getBusinessHours,
  getLocalNow,
} from '../services/agenda.service';

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours * 60) + minutes;
};

const minutesToTime = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/**
 * Disponibilidad para Alexa con bloques cuyo paso es exactamente la duración
 * actual del servicio en la base de datos.
 *
 * Ejemplo: duración 40 min => 11:00, 11:40, 12:20, 13:00...
 * Si duration_minutes cambia en BD, la siguiente consulta usa el nuevo valor.
 * La validación real de traslapes/capacidad sigue delegada a agenda.service.
 */
export const getAlexaDurationSlots = async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = (req as any).user?.id;
    const date = String(req.query.date || '');
    const serviceId = Number(req.query.service_id);

    if (!clientId) {
      res.status(401).json({ message: 'No se pudo identificar al cliente desde el token' });
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isInteger(serviceId) || serviceId <= 0) {
      res.status(400).json({ message: 'date (YYYY-MM-DD) y service_id son obligatorios' });
      return;
    }

    const serviceResult = await pool.query(
      `SELECT id, name, category, price, duration_minutes, is_active
       FROM operations.services
       WHERE id = $1`,
      [serviceId]
    );

    if (!serviceResult.rows.length) {
      res.status(404).json({ message: 'Servicio no encontrado' });
      return;
    }

    const service = serviceResult.rows[0];
    const durationMinutes = Number(service.duration_minutes);

    if (service.is_active === false) {
      res.status(409).json({ message: 'El servicio no está activo' });
      return;
    }

    if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
      res.status(409).json({ message: 'El servicio no tiene una duración válida' });
      return;
    }

    const businessHours = getBusinessHours(date);
    if (!businessHours) {
      res.json({
        date,
        service_id: service.id,
        service_name: service.name,
        duration_minutes: durationMinutes,
        slot_step_minutes: durationMinutes,
        business_hours: null,
        available_slots: [],
        all_slots: [],
        message: 'La estética no trabaja los domingos',
      });
      return;
    }

    const openMinutes = timeToMinutes(businessHours.open);
    const closeMinutes = timeToMinutes(businessHours.close);
    const candidates: string[] = [];

    for (
      let current = openMinutes;
      current + durationMinutes <= closeMinutes;
      current += durationMinutes
    ) {
      candidates.push(minutesToTime(current));
    }

    const localNow = getLocalNow();
    const allSlots = await Promise.all(candidates.map(async (time) => {
      const appointmentDate = `${date} ${time}:00`;
      const availability = await checkAppointmentAvailability(
        pool,
        appointmentDate,
        serviceId,
        undefined,
        clientId,
        localNow
      );

      return {
        time,
        appointment_date: appointmentDate,
        appointment_end: availability.appointmentEnd || null,
        available: availability.available,
        reason: availability.reason,
        code: availability.code || null,
      };
    }));

    const availableSlots = allSlots.filter((slot) => slot.available);

    res.json({
      date,
      service_id: service.id,
      service_name: service.name,
      service,
      duration_minutes: durationMinutes,
      slot_step_minutes: durationMinutes,
      business_hours: businessHours,
      available_slots: availableSlots,
      all_slots: allSlots,
      message: availableSlots.length
        ? `Horarios calculados en bloques dinámicos de ${durationMinutes} minutos.`
        : 'No hay horarios disponibles para esa fecha.',
    });
  } catch (error) {
    console.error('Error al obtener bloques dinámicos para Alexa:', error);
    res.status(500).json({ message: 'Error interno al consultar horarios para Alexa' });
  }
};
