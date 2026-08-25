import { Request, Response } from 'express';
import pool from '../config/db';
import { getAppointmentTimeRemaining, getLocalNow, normalizeLocalDateTime } from '../services/agenda.service';

const calendarStatusSQL = `
  CASE
    WHEN a.status = 'canceled' THEN 'canceled'
    WHEN a.status = 'no_show' THEN 'no_show'
    WHEN a.status = 'completed' THEN 'completed'
    WHEN NOW() < a.appointment_date THEN a.status
    WHEN NOW() >= a.appointment_date
      AND NOW() < (a.appointment_date + (s.duration_minutes || ' minutes')::interval)
      AND a.status = 'confirmed'
      THEN 'in_process'
    WHEN NOW() >= (a.appointment_date + (s.duration_minutes || ' minutes')::interval)
      AND a.status IN ('pending', 'confirmed')
      THEN 'pending_review'
    ELSE a.status
  END AS calendar_status
`;

const calendarStatusLabelSQL = `
  CASE
    WHEN a.status = 'canceled' THEN 'Cancelada'
    WHEN a.status = 'no_show' THEN 'No asistió'
    WHEN a.status = 'completed' THEN 'Finalizada'
    WHEN NOW() < a.appointment_date AND a.status = 'confirmed' THEN 'Confirmada'
    WHEN NOW() < a.appointment_date AND a.status = 'pending' THEN 'Pendiente'
    WHEN NOW() >= a.appointment_date
      AND NOW() < (a.appointment_date + (s.duration_minutes || ' minutes')::interval)
      AND a.status = 'confirmed'
      THEN 'En proceso'
    WHEN NOW() >= (a.appointment_date + (s.duration_minutes || ' minutes')::interval)
      AND a.status IN ('pending', 'confirmed')
      THEN 'Pendiente de cierre'
    ELSE a.status
  END AS calendar_status_label
`;

export const getAppointmentsForAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { date_from, date_to, status, origin } = req.query;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (date_from) {
      params.push(date_from);
      conditions.push(`a.appointment_date >= $${params.length}::timestamp`);
    }
    if (date_to) {
      params.push(date_to);
      conditions.push(`a.appointment_date <= $${params.length}::timestamp`);
    }
    if (status) {
      params.push(status);
      conditions.push(`a.status = $${params.length}`);
    }
    if (origin) {
      params.push(origin);
      conditions.push(`a.appointment_origin = $${params.length}`);
    }

    const whereSQL = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT
        a.id,
        a.client_id,
        u.full_name AS cliente,
        u.email AS cliente_email,
        u.phone AS cliente_telefono,
        a.service_id,
        s.name AS servicio,
        s.name AS service_name,
        s.category AS service_category,
        s.category,
        s.duration_minutes,
        s.price AS service_price,
        s.price AS price,
        a.appointment_date,
        a.appointment_date::text AS appointment_local,
        (a.appointment_date + (s.duration_minutes || ' minutes')::interval) AS appointment_end,
        a.status,
        ${calendarStatusSQL},
        ${calendarStatusLabelSQL},
        a.total_amount,
        a.deposit_amount,
        (a.total_amount - a.deposit_amount) AS remaining_amount,
        COALESCE(a.appointment_origin, 'web') AS appointment_origin,
        COALESCE(a.appointment_origin, 'web') AS origin,
        a.created_at,
        a.updated_at
      FROM operations.appointments a
      LEFT JOIN auth.users u ON a.client_id = u.id
      LEFT JOIN operations.services s ON a.service_id = s.id
      ${whereSQL}
      ORDER BY a.appointment_date ASC`,
      params
    );

    res.json({ total: result.rows.length, appointments: result.rows });
  } catch (error) {
    console.error('🔥 Error al obtener las citas para admin:', error);
    res.status(500).json({ message: 'Error interno del servidor al cargar las citas' });
  }
};

export const cancelMyAppointmentFlexible = async (req: Request, res: Response): Promise<void> => {
  const appointmentId = Number(req.params.id);
  const clientId = (req as any).user?.id;

  try {
    if (!clientId) {
      res.status(401).json({ message: 'No se pudo identificar al cliente desde el token' });
      return;
    }
    if (!Number.isInteger(appointmentId)) {
      res.status(400).json({ message: 'ID de cita no válido' });
      return;
    }

    const currentResult = await pool.query(
      `SELECT a.id, a.client_id, a.status, a.appointment_date::text AS appointment_local,
              a.deposit_amount, s.name AS servicio
       FROM operations.appointments a
       LEFT JOIN operations.services s ON s.id = a.service_id
       WHERE a.id = $1 AND a.client_id = $2`,
      [appointmentId, clientId]
    );

    if (!currentResult.rows.length) {
      res.status(404).json({ message: 'Cita no encontrada' });
      return;
    }

    const appointment = currentResult.rows[0];
    if (!['pending', 'confirmed'].includes(appointment.status)) {
      res.status(409).json({ message: 'Esta cita ya no se puede cancelar desde el portal' });
      return;
    }

    const appointmentLocal = normalizeLocalDateTime(appointment.appointment_local);
    const nowLocal = normalizeLocalDateTime(getLocalNow());
    if (!appointmentLocal || !nowLocal || appointmentLocal <= nowLocal) {
      res.status(409).json({ message: 'No se puede cancelar una cita que ya inició o ya pasó' });
      return;
    }

    const remaining = getAppointmentTimeRemaining(appointmentLocal, nowLocal);
    const lateCancellation = remaining.minutes_until_appointment < 24 * 60;

    const result = await pool.query(
      `UPDATE operations.appointments
       SET status = 'canceled', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND client_id = $2
       RETURNING *`,
      [appointmentId, clientId]
    );

    res.json({
      message: lateCancellation
        ? 'Cita cancelada. Al faltar menos de 24 horas, el anticipo no es reembolsable.'
        : 'Cita cancelada correctamente',
      late_cancellation: lateCancellation,
      deposit_refundable: !lateCancellation,
      appointment: result.rows[0],
    });
  } catch (error) {
    console.error('🔥 Error al cancelar cita del cliente:', error);
    res.status(500).json({ message: 'Error interno al cancelar la cita' });
  }
};
