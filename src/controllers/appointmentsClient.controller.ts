import { Request, Response } from 'express';
import pool from '../config/db';
import {
  getAppointmentTimeRemaining,
  getLocalNow,
  getRescheduleEligibility,
  normalizeLocalDateTime,
} from '../services/agenda.service';

const addLocalMinutes = (localDateTime: string, minutes: number): string | null => {
  const normalized = normalizeLocalDateTime(localDateTime);
  if (!normalized || !Number.isFinite(minutes)) return null;
  const [date, time] = normalized.split(' ');
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute, second] = time.split(':').map(Number);
  const result = new Date(Date.UTC(year, month - 1, day, hour, minute + minutes, second));
  return `${result.getUTCFullYear()}-${String(result.getUTCMonth() + 1).padStart(2, '0')}-${String(result.getUTCDate()).padStart(2, '0')} ${String(result.getUTCHours()).padStart(2, '0')}:${String(result.getUTCMinutes()).padStart(2, '0')}:${String(result.getUTCSeconds()).padStart(2, '0')}`;
};

const statusPresentation = (
  status: string,
  appointmentLocal: string,
  durationMinutes: number,
  nowLocal: string
) => {
  if (status === 'canceled') return { calendar_status: 'canceled', calendar_status_label: 'Cancelada' };
  if (status === 'no_show') return { calendar_status: 'no_show', calendar_status_label: 'No asistió' };
  if (status === 'completed') return { calendar_status: 'completed', calendar_status_label: 'Completada' };

  const endLocal = addLocalMinutes(appointmentLocal, durationMinutes);
  if (appointmentLocal > nowLocal) {
    return {
      calendar_status: status,
      calendar_status_label: status === 'confirmed' ? 'Confirmada' : 'Pendiente',
    };
  }

  if (endLocal && nowLocal < endLocal && status === 'confirmed') {
    return { calendar_status: 'in_process', calendar_status_label: 'En proceso' };
  }

  if (endLocal && nowLocal >= endLocal && ['pending', 'confirmed'].includes(status)) {
    return { calendar_status: 'pending_review', calendar_status_label: 'Pendiente de cierre' };
  }

  return {
    calendar_status: status,
    calendar_status_label: status === 'pending' ? 'Pendiente' : status,
  };
};

export const getMyAppointmentsLocal = async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = (req as any).user?.id;
    if (!clientId) {
      res.status(401).json({ message: 'No se pudo identificar al cliente desde el token' });
      return;
    }

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
        a.appointment_date::text AS appointment_date_local,
        a.status,
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
      WHERE a.client_id = $1
      ORDER BY a.appointment_date DESC`,
      [clientId]
    );

    const nowLocal = getLocalNow();
    const appointments = result.rows.map((row) => {
      const appointmentLocal = normalizeLocalDateTime(row.appointment_date_local) || row.appointment_date_local;
      const durationMinutes = Number(row.duration_minutes || 0);
      const appointmentEndLocal = addLocalMinutes(appointmentLocal, durationMinutes);
      const presentation = statusPresentation(row.status, appointmentLocal, durationMinutes, nowLocal);
      const localForBrowser = appointmentLocal ? appointmentLocal.replace(' ', 'T') : row.appointment_date_local;

      return {
        ...row,
        appointment_date: localForBrowser,
        appointment_local: appointmentLocal,
        appointment_end: appointmentEndLocal ? appointmentEndLocal.replace(' ', 'T') : null,
        ...presentation,
        ...getAppointmentTimeRemaining(appointmentLocal, nowLocal),
        ...getRescheduleEligibility(row.status, appointmentLocal, nowLocal),
      };
    });

    res.json({
      total: appointments.length,
      local_now: nowLocal,
      appointments,
    });
  } catch (error) {
    console.error('🔥 Error al obtener citas locales del cliente:', error);
    res.status(500).json({ message: 'Error interno del servidor al cargar tus citas' });
  }
};
