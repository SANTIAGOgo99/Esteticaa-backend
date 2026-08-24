import { Pool, PoolClient } from 'pg';

export const BUSINESS_TIME_ZONE = 'America/Mexico_City';
export const MAX_SIMULTANEOUS_APPOINTMENTS = 2;
export const SLOT_STEP_MINUTES = 30;
export const SCHEDULING_STATUSES = ['pending', 'confirmed'] as const;

export type Queryable = Pick<Pool | PoolClient, 'query'>;

export type BusinessHours = { open: string; close: string };

export const BUSINESS_HOURS = {
  weekday: { open: '11:00', close: '19:00' },
  saturday: { open: '10:00', close: '18:00' },
} as const;

const DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,6})?)?$/;
const OFFSET_DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})$/;

export const normalizeLocalDateTime = (value: string): string | null => {
  const trimmedValue = value.trim();
  if (OFFSET_DATE_TIME_PATTERN.test(trimmedValue)) {
    const instant = new Date(trimmedValue);
    if (Number.isNaN(instant.getTime())) return null;
    return getLocalNow(instant);
  }

  const match = DATE_TIME_PATTERN.exec(trimmedValue);
  if (!match) return null;

  const [, year, month, day, hour, minute, second = '00'] = match;
  const parts = [year, month, day, hour, minute, second].map(Number);
  const validationDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]));

  if (
    validationDate.getUTCFullYear() !== parts[0]
    || validationDate.getUTCMonth() + 1 !== parts[1]
    || validationDate.getUTCDate() !== parts[2]
    || parts[3] > 23
    || parts[4] > 59
    || parts[5] > 59
  ) return null;

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
};

export const getLocalNow = (now = new Date()): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(now).reduce<Record<string, string>>((result, part) => {
    if (part.type !== 'literal') result[part.type] = part.value;
    return result;
  }, {});

  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
};

export const getBusinessHours = (date: string): BusinessHours | null => {
  const [year, month, day] = date.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  if (weekday === 0) return null;
  return weekday === 6 ? BUSINESS_HOURS.saturday : BUSINESS_HOURS.weekday;
};

const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

export const generateCandidateTimes = (date: string, durationMinutes: number): string[] => {
  const hours = getBusinessHours(date);
  if (!hours || !Number.isFinite(durationMinutes) || durationMinutes <= 0) return [];
  const starts: string[] = [];
  const close = timeToMinutes(hours.close);
  for (let current = timeToMinutes(hours.open); current + durationMinutes <= close; current += SLOT_STEP_MINUTES) {
    starts.push(minutesToTime(current));
  }
  return starts;
};

export type AvailabilityResult = {
  available: boolean;
  reason: string;
  service: any | null;
  conflicts: number;
  appointmentDate?: string;
  appointmentEnd?: string;
  code?: 'INVALID_DATE' | 'SERVICE_NOT_FOUND' | 'SERVICE_INACTIVE' | 'INVALID_DURATION' | 'CLOSED' | 'OUTSIDE_HOURS' | 'PAST' | 'CAPACITY';
};

export const checkAppointmentAvailability = async (
  db: Queryable,
  appointmentDateInput: string,
  serviceId: number,
  excludeAppointmentId?: number,
  now = getLocalNow()
): Promise<AvailabilityResult> => {
  const appointmentDate = normalizeLocalDateTime(appointmentDateInput);
  if (!appointmentDate) return { available: false, reason: 'La fecha y hora no tienen un formato válido', service: null, conflicts: 0, code: 'INVALID_DATE' };

  const serviceResult = await db.query(
    `SELECT id, name, category, price, duration_minutes, is_active
     FROM operations.services WHERE id = $1`, [serviceId]
  );
  if (!serviceResult.rows.length) return { available: false, reason: 'Servicio no encontrado', service: null, conflicts: 0, code: 'SERVICE_NOT_FOUND' };
  const service = serviceResult.rows[0];
  if (service.is_active === false) return { available: false, reason: 'El servicio no está activo', service, conflicts: 0, code: 'SERVICE_INACTIVE' };

  const duration = Number(service.duration_minutes);
  if (!Number.isInteger(duration) || duration <= 0) return { available: false, reason: 'El servicio no tiene una duración válida', service, conflicts: 0, code: 'INVALID_DURATION' };

  const date = appointmentDate.slice(0, 10);
  const time = appointmentDate.slice(11, 16);
  const hours = getBusinessHours(date);
  if (!hours) return { available: false, reason: 'La estética no trabaja los domingos', service, conflicts: 0, code: 'CLOSED' };

  const startMinutes = timeToMinutes(time);
  if (startMinutes < timeToMinutes(hours.open) || startMinutes + duration > timeToMinutes(hours.close)) {
    return { available: false, reason: `El horario está fuera del horario laboral (${hours.open} a ${hours.close})`, service, conflicts: 0, code: 'OUTSIDE_HOURS' };
  }
  if (appointmentDate <= now) return { available: false, reason: 'No se puede reservar una cita en un horario pasado', service, conflicts: 0, code: 'PAST' };

  const params: any[] = [appointmentDate, duration];
  let exclusion = '';
  if (excludeAppointmentId !== undefined) {
    params.push(excludeAppointmentId);
    exclusion = `AND a.id <> $${params.length}`;
  }
  const conflictResult = await db.query(
    `WITH overlapping AS (
       SELECT a.appointment_date AS starts_at,
              a.appointment_date + (existing_service.duration_minutes * interval '1 minute') AS ends_at
       FROM operations.appointments a
       JOIN operations.services existing_service ON existing_service.id = a.service_id
       WHERE a.status IN ('pending', 'confirmed')
         AND a.appointment_date < ($1::timestamp + ($2 * interval '1 minute'))
         AND (a.appointment_date + (existing_service.duration_minutes * interval '1 minute')) > $1::timestamp
         ${exclusion}
     ), points AS (
       SELECT starts_at AS point FROM overlapping
       UNION SELECT $1::timestamp
     )
     SELECT COALESCE(MAX((
              SELECT COUNT(*) FROM overlapping appointment
              WHERE appointment.starts_at <= points.point AND appointment.ends_at > points.point
            )), 0)::int AS total,
            ($1::timestamp + ($2 * interval '1 minute'))::text AS appointment_end
     FROM points`,
    params
  );
  const conflicts = Number(conflictResult.rows[0].total);
  return {
    available: conflicts < MAX_SIMULTANEOUS_APPOINTMENTS,
    reason: conflicts < MAX_SIMULTANEOUS_APPOINTMENTS ? 'Horario disponible' : 'Horario no disponible: la capacidad de 2 citas simultáneas está completa',
    service, conflicts, appointmentDate,
    appointmentEnd: conflictResult.rows[0].appointment_end,
    code: conflicts < MAX_SIMULTANEOUS_APPOINTMENTS ? undefined : 'CAPACITY',
  };
};
