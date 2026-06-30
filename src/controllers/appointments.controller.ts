// src/controllers/appointments.controller.ts
import { Request, Response } from 'express';
import pool from '../config/db';

// Estados reales guardados en la base de datos
const VALID_DB_STATUSES = ['pending', 'confirmed', 'completed', 'canceled', 'no_show'];

// Orígenes permitidos
const VALID_ORIGINS = ['web', 'presencial'];

// Capacidad de atención de la estética
// Como actualmente trabajan 2 personas, se permiten máximo 2 citas al mismo tiempo.
const MAX_SIMULTANEOUS_APPOINTMENTS = 2;
const MIN_CLIENT_CANCEL_HOURS = 24;

// Horarios base del negocio
const BUSINESS_HOURS = {
  weekday: {
    open: '09:00',
    close: '19:00',
  },
  saturday: {
    open: '09:00',
    close: '19:00',
  },
};

// =========================================================================
// FUNCIONES AUXILIARES
// =========================================================================

const padNumber = (value: number) => String(value).padStart(2, '0');

const normalizeStatus = (status: string) => {
  if (status === 'cancelled') return 'canceled';
  return status;
};

const parseDateWithoutTimezone = (dateText: string): Date => {
  return new Date(dateText);
};

const addMinutes = (date: Date, minutes: number): Date => {
  return new Date(date.getTime() + minutes * 60000);
};

const formatDateForPostgres = (date: Date): string => {
  const year = date.getFullYear();
  const month = padNumber(date.getMonth() + 1);
  const day = padNumber(date.getDate());
  const hour = padNumber(date.getHours());
  const minute = padNumber(date.getMinutes());
  const second = padNumber(date.getSeconds());

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
};

const formatDateKey = (date: Date): string => {
  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`;
};

const parseMonthParam = (monthParam?: string) => {
  const today = new Date();

  if (!monthParam) {
    return {
      year: today.getFullYear(),
      monthIndex: today.getMonth(),
    };
  }

  const match = /^(\d{4})-(\d{2})$/.exec(monthParam);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (month < 1 || month > 12) {
    return null;
  }

  return {
    year,
    monthIndex: month - 1,
  };
};

const getBusinessHoursByDate = (date: Date) => {
  const day = date.getDay();

  // Domingo cerrado
  if (day === 0) {
    return null;
  }

  // Sábado
  if (day === 6) {
    return BUSINESS_HOURS.saturday;
  }

  // Lunes a viernes
  return BUSINESS_HOURS.weekday;
};

const buildDateWithTime = (dateText: string, timeText: string): Date => {
  return new Date(`${dateText}T${timeText}:00`);
};

type BusyInterval = {
  start: Date;
  end: Date;
};

const getBusyIntervals = async (rangeStart: Date, rangeEnd: Date): Promise<BusyInterval[]> => {
  const result = await pool.query(
    `
    SELECT
      a.appointment_date,
      (a.appointment_date + (s.duration_minutes || ' minutes')::interval) AS appointment_end
    FROM operations.appointments a
    JOIN operations.services s ON s.id = a.service_id
    WHERE a.status IN ('pending', 'confirmed')
    AND a.appointment_date < $2::timestamp
    AND (a.appointment_date + (s.duration_minutes || ' minutes')::interval) > $1::timestamp;
    `,
    [
      formatDateForPostgres(rangeStart),
      formatDateForPostgres(rangeEnd),
    ]
  );

  return result.rows.map((row) => ({
    start: new Date(row.appointment_date),
    end: new Date(row.appointment_end),
  }));
};

const countOverlappingIntervals = (
  busyIntervals: BusyInterval[],
  startDate: Date,
  endDate: Date
) => {
  return busyIntervals.filter((interval) => interval.start < endDate && interval.end > startDate).length;
};

const getCalendarStatusSQL = `
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

const getCalendarStatusLabelSQL = `
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

// =========================================================================
// VALIDAR DISPONIBILIDAD
// =========================================================================

const checkAvailability = async (
  appointmentDate: string,
  serviceId: number,
  excludeAppointmentId?: number
) => {
  const serviceQuery = `
    SELECT id, name, price, duration_minutes, is_active
    FROM operations.services
    WHERE id = $1;
  `;

  const serviceResult = await pool.query(serviceQuery, [serviceId]);

  if (serviceResult.rows.length === 0) {
    return {
      available: false,
      reason: 'Servicio no encontrado',
      service: null,
      conflicts: 0,
    };
  }

  const service = serviceResult.rows[0];

  if (service.is_active === false) {
    return {
      available: false,
      reason: 'El servicio no está activo',
      service,
      conflicts: 0,
    };
  }

  const startDate = parseDateWithoutTimezone(appointmentDate);
  const endDate = addMinutes(startDate, Number(service.duration_minutes));

  const businessHours = getBusinessHoursByDate(startDate);

  if (!businessHours) {
    return {
      available: false,
      reason: 'La estética no trabaja los domingos',
      service,
      conflicts: 0,
    };
  }

  const dateOnly = appointmentDate.split('T')[0] || appointmentDate.split(' ')[0];
  const openDate = buildDateWithTime(dateOnly, businessHours.open);
  const closeDate = buildDateWithTime(dateOnly, businessHours.close);

  if (startDate < openDate || endDate > closeDate) {
    return {
      available: false,
      reason: `El horario está fuera del horario laboral (${businessHours.open} a ${businessHours.close})`,
      service,
      conflicts: 0,
    };
  }

  let conflictQuery = `
    SELECT COUNT(*)::int AS total
    FROM operations.appointments a
    JOIN operations.services s ON s.id = a.service_id
    WHERE a.status IN ('pending', 'confirmed')
    AND a.appointment_date < $2::timestamp
    AND (a.appointment_date + (s.duration_minutes || ' minutes')::interval) > $1::timestamp
  `;

  const params: any[] = [
    formatDateForPostgres(startDate),
    formatDateForPostgres(endDate),
  ];

  if (excludeAppointmentId) {
    conflictQuery += ` AND a.id <> $3`;
    params.push(excludeAppointmentId);
  }

  const conflictResult = await pool.query(conflictQuery, params);
  const conflicts = Number(conflictResult.rows[0].total);

  return {
    available: conflicts < MAX_SIMULTANEOUS_APPOINTMENTS,
    reason:
      conflicts < MAX_SIMULTANEOUS_APPOINTMENTS
        ? 'Horario disponible'
        : 'Horario no disponible, ya hay 2 citas en ese rango',
    service,
    conflicts,
  };
};

// =========================================================================
// 1. OBTENER CITAS PARA EL PANEL/CALENDARIO
// =========================================================================

export const getAppointments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { date_from, date_to, status, origin } = req.query;

    const conditions: string[] = [];
    const params: any[] = [];

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

    const whereSQL = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        a.id,
        a.client_id,
        u.full_name AS cliente,
        u.email AS cliente_email,
        u.phone AS cliente_telefono,

        a.service_id,
        s.name AS servicio,
        s.duration_minutes,
        s.price AS service_price,

        a.appointment_date,
        (a.appointment_date + (s.duration_minutes || ' minutes')::interval) AS appointment_end,

        a.status,
        ${getCalendarStatusSQL},
        ${getCalendarStatusLabelSQL},

        a.total_amount,
        a.deposit_amount,
        (a.total_amount - a.deposit_amount) AS remaining_amount,

        COALESCE(a.appointment_origin, 'web') AS appointment_origin,

        a.created_at,
        a.updated_at
      FROM operations.appointments a
      LEFT JOIN auth.users u ON a.client_id = u.id
      LEFT JOIN operations.services s ON a.service_id = s.id
      ${whereSQL}
      ORDER BY a.appointment_date ASC;
    `;

    const result = await pool.query(query, params);

    res.json({
      total: result.rows.length,
      appointments: result.rows,
    });
  } catch (error) {
    console.error('🔥 Error al obtener las citas:', error);
    res.status(500).json({
      message: 'Error interno del servidor al cargar las citas',
    });
  }
};

// =========================================================================
// 2. OBTENER CITAS DEL CLIENTE AUTENTICADO
// =========================================================================

export const getMyAppointments = async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = (req as any).user?.id;

    if (!clientId) {
      res.status(401).json({
        message: 'No se pudo identificar al cliente desde el token',
      });
      return;
    }

    const query = `
      SELECT
        a.id,
        a.client_id,
        u.full_name AS cliente,
        u.email AS cliente_email,
        u.phone AS cliente_telefono,

        a.service_id,
        s.name AS servicio,
        s.duration_minutes,
        s.price AS service_price,

        a.appointment_date,
        (a.appointment_date + (s.duration_minutes || ' minutes')::interval) AS appointment_end,

        a.status,
        ${getCalendarStatusSQL},
        ${getCalendarStatusLabelSQL},

        a.total_amount,
        a.deposit_amount,
        (a.total_amount - a.deposit_amount) AS remaining_amount,

        COALESCE(a.appointment_origin, 'web') AS appointment_origin,

        a.created_at,
        a.updated_at
      FROM operations.appointments a
      LEFT JOIN auth.users u ON a.client_id = u.id
      LEFT JOIN operations.services s ON a.service_id = s.id
      WHERE a.client_id = $1
      ORDER BY a.appointment_date DESC;
    `;

    const result = await pool.query(query, [clientId]);

    res.json({
      total: result.rows.length,
      appointments: result.rows,
    });
  } catch (error) {
    console.error('🔥 Error al obtener citas del cliente:', error);
    res.status(500).json({
      message: 'Error interno del servidor al cargar tus citas',
    });
  }
};

// =========================================================================
// 3. CANCELAR CITA DEL CLIENTE AUTENTICADO
// =========================================================================

export const cancelMyAppointment = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const clientId = (req as any).user?.id;

    if (!clientId) {
      res.status(401).json({
        message: 'No se pudo identificar al cliente desde el token',
      });
      return;
    }

    const currentResult = await pool.query(
      `
      SELECT
        a.*,
        s.name AS servicio,
        s.duration_minutes
      FROM operations.appointments a
      LEFT JOIN operations.services s ON s.id = a.service_id
      WHERE a.id = $1 AND a.client_id = $2;
      `,
      [id, clientId]
    );

    if (currentResult.rows.length === 0) {
      res.status(404).json({
        message: 'Cita no encontrada',
      });
      return;
    }

    const appointment = currentResult.rows[0];

    if (!['pending', 'confirmed'].includes(appointment.status)) {
      res.status(409).json({
        message: 'Esta cita ya no se puede cancelar desde el portal',
      });
      return;
    }

    const appointmentDate = new Date(appointment.appointment_date);
    const minimumCancelDate = addMinutes(new Date(), MIN_CLIENT_CANCEL_HOURS * 60);

    if (appointmentDate <= minimumCancelDate) {
      res.status(409).json({
        message: `Solo puedes cancelar una cita con al menos ${MIN_CLIENT_CANCEL_HOURS} horas de anticipacion`,
      });
      return;
    }

    const result = await pool.query(
      `
      UPDATE operations.appointments
      SET status = 'canceled'
      WHERE id = $1 AND client_id = $2
      RETURNING *;
      `,
      [id, clientId]
    );

    res.json({
      message: 'Cita cancelada correctamente',
      appointment: result.rows[0],
    });
  } catch (error) {
    console.error('🔥 Error al cancelar cita del cliente:', error);
    res.status(500).json({
      message: 'Error interno al cancelar la cita',
    });
  }
};

// =========================================================================
// 4. OBTENER DISPONIBILIDAD MENSUAL PARA CALENDARIO DEL CLIENTE
// =========================================================================

export const getAvailabilityCalendar = async (req: Request, res: Response): Promise<void> => {
  try {
    const { service_id, month } = req.query;

    if (!service_id) {
      res.status(400).json({
        message: 'service_id es obligatorio',
      });
      return;
    }

    const parsedMonth = parseMonthParam(month ? String(month) : undefined);

    if (!parsedMonth) {
      res.status(400).json({
        message: 'El mes debe tener formato YYYY-MM',
      });
      return;
    }

    const serviceResult = await pool.query(
      `
      SELECT id, name, description, price, duration_minutes, is_active
      FROM operations.services
      WHERE id = $1;
      `,
      [Number(service_id)]
    );

    if (serviceResult.rows.length === 0) {
      res.status(404).json({ message: 'Servicio no encontrado' });
      return;
    }

    const service = serviceResult.rows[0];

    if (service.is_active === false) {
      res.status(409).json({ message: 'El servicio no esta activo' });
      return;
    }

    const { year, monthIndex } = parsedMonth;
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const monthStart = new Date(year, monthIndex, 1, 0, 0, 0);
    const monthEnd = new Date(year, monthIndex + 1, 1, 0, 0, 0);
    const busyIntervals = await getBusyIntervals(monthStart, monthEnd);
    const now = new Date();
    const todayKey = formatDateKey(now);

    const days = [];

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, monthIndex, day, 12, 0, 0);
      const dateKey = formatDateKey(date);
      const businessHours = getBusinessHoursByDate(date);

      if (!businessHours) {
        days.push({
          date: dateKey,
          status: 'closed',
          label: 'Cerrado',
          available_slots: 0,
          total_slots: 0,
        });
        continue;
      }

      if (dateKey < todayKey) {
        days.push({
          date: dateKey,
          status: 'past',
          label: 'Pasado',
          available_slots: 0,
          total_slots: 0,
          business_hours: businessHours,
        });
        continue;
      }

      const openDate = new Date(`${dateKey}T${businessHours.open}:00`);
      const closeDate = new Date(`${dateKey}T${businessHours.close}:00`);
      let current = new Date(openDate);
      let totalSlots = 0;
      let availableSlots = 0;

      while (current < closeDate) {
        const startDate = new Date(current);
        const endDate = addMinutes(startDate, Number(service.duration_minutes));

        if (endDate > closeDate) {
          current = addMinutes(current, 30);
          continue;
        }

        if (startDate <= now) {
          current = addMinutes(current, 30);
          continue;
        }

        totalSlots += 1;

        const conflicts = countOverlappingIntervals(busyIntervals, startDate, endDate);

        if (conflicts < MAX_SIMULTANEOUS_APPOINTMENTS) {
          availableSlots += 1;
        }

        current = addMinutes(current, 30);
      }

      let status = 'available';
      let label = 'Disponible';

      if (totalSlots === 0 || availableSlots === 0) {
        status = 'full';
        label = 'Saturado';
      } else if (availableSlots < totalSlots) {
        status = 'limited';
        label = 'Pocos espacios';
      }

      days.push({
        date: dateKey,
        status,
        label,
        available_slots: availableSlots,
        total_slots: totalSlots,
        business_hours: businessHours,
      });
    }

    res.json({
      month: `${year}-${padNumber(monthIndex + 1)}`,
      service,
      days,
    });
  } catch (error) {
    console.error('🔥 Error al obtener calendario de disponibilidad:', error);
    res.status(500).json({
      message: 'Error interno al obtener disponibilidad del calendario',
    });
  }
};

// =========================================================================
// 5. CONSULTAR DISPONIBILIDAD DE UN HORARIO
// =========================================================================

export const getAppointmentAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    const { appointment_date, service_id } = req.query;

    if (!appointment_date || !service_id) {
      res.status(400).json({
        message: 'appointment_date y service_id son obligatorios',
      });
      return;
    }

    const availability = await checkAvailability(
      String(appointment_date),
      Number(service_id)
    );

    res.json(availability);
  } catch (error) {
    console.error('🔥 Error al consultar disponibilidad:', error);
    res.status(500).json({
      message: 'Error interno al consultar disponibilidad',
    });
  }
};

// =========================================================================
// 3. OBTENER HORARIOS DISPONIBLES POR DÍA Y SERVICIO
// =========================================================================
export const getAvailableSlots = async (req: Request, res: Response): Promise<void> => {
  try {
    const { date, service_id } = req.query;

    if (!date || !service_id) {
      res.status(400).json({
        message: 'date y service_id son obligatorios',
      });
      return;
    }

    const serviceResult = await pool.query(
      `
      SELECT id, name, description, price, duration_minutes, is_active
      FROM operations.services
      WHERE id = $1;
      `,
      [Number(service_id)]
    );

    if (serviceResult.rows.length === 0) {
      res.status(404).json({ message: 'Servicio no encontrado' });
      return;
    }

    const service = serviceResult.rows[0];

    if (service.is_active === false) {
      res.status(409).json({ message: 'El servicio no esta activo' });
      return;
    }

    const testDate = new Date(`${date}T12:00:00`);
    const businessHours = getBusinessHoursByDate(testDate);

    if (!businessHours) {
      res.json({
        date,
        service,
        available_slots: [],
        all_slots: [],
        message: 'La estética no trabaja los domingos',
      });
      return;
    }

    const openDate = new Date(`${date}T${businessHours.open}:00`);
    const closeDate = new Date(`${date}T${businessHours.close}:00`);
    const busyIntervals = await getBusyIntervals(openDate, closeDate);

    const allSlots = [];
    const availableSlots = [];

    let current = new Date(openDate);

    while (current < closeDate) {
      const startDate = new Date(current);
      const endDate = addMinutes(startDate, Number(service.duration_minutes));

      if (endDate > closeDate) {
        allSlots.push({
          time: formatDateForPostgres(startDate).substring(11, 16),
          appointment_date: formatDateForPostgres(startDate),
          appointment_end: formatDateForPostgres(endDate),
          available: false,
          conflicts: 0,
          reason: 'El servicio ya no cabe antes del cierre',
        });

        current = addMinutes(current, 30);
        continue;
      }

      const conflicts = countOverlappingIntervals(busyIntervals, startDate, endDate);

      const slot = {
        time: formatDateForPostgres(startDate).substring(11, 16),
        appointment_date: formatDateForPostgres(startDate),
        appointment_end: formatDateForPostgres(endDate),
        available: conflicts < MAX_SIMULTANEOUS_APPOINTMENTS,
        conflicts,
        reason: conflicts < MAX_SIMULTANEOUS_APPOINTMENTS ? 'Disponible' : 'Ocupado',
      };

      allSlots.push(slot);

      if (slot.available) {
        availableSlots.push(slot);
      }

      current = addMinutes(current, 30);
    }

    res.json({
      date,
      service,
      business_hours: businessHours,
      available_slots: availableSlots,
      all_slots: allSlots,
    });
  } catch (error) {
    console.error('🔥 Error al obtener horarios:', error);
    res.status(500).json({
      message: 'Error interno al obtener horarios',
    });
  }
};


// =========================================================================
// 4. CREAR CITA DESDE CLIENTE WEB
// =========================================================================

export const createAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      service_id,
      appointment_date,
      deposit_amount = 0,
    } = req.body;

    const client_id = (req as any).user?.id;

    if (!client_id) {
      res.status(401).json({
        message: 'No se pudo identificar al cliente desde el token',
      });
      return;
    }

    if (!service_id || !appointment_date) {
      res.status(400).json({
        message: 'service_id y appointment_date son obligatorios',
      });
      return;
    }

    const availability = await checkAvailability(
      appointment_date,
      Number(service_id)
    );

    if (!availability.available) {
      res.status(409).json({
        message: availability.reason,
        availability,
      });
      return;
    }

    const totalAmount = Number(availability.service.price);

    const query = `
      INSERT INTO operations.appointments (
        client_id,
        stylist_id,
        service_id,
        appointment_date,
        status,
        total_amount,
        deposit_amount,
        appointment_origin
      )
      VALUES ($1, NULL, $2, $3, 'confirmed', $4, $5, 'web')
      RETURNING *;
    `;

    const result = await pool.query(query, [
      client_id,
      service_id,
      appointment_date,
      totalAmount,
      deposit_amount,
    ]);

    res.status(201).json({
      message: 'Cita confirmada automaticamente. Te esperamos en el horario seleccionado.',
      appointment: result.rows[0],
    });
  } catch (error) {
    console.error('🔥 Error al crear la cita:', error);
    res.status(500).json({
      message: 'Error interno del servidor al crear la cita',
    });
  }
};

// =========================================================================
// 5. CREAR CITA MANUAL DESDE ADMINISTRADOR
// =========================================================================

export const createManualAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      client_id,
      service_id,
      appointment_date,
      deposit_amount = 0,
    } = req.body;

    if (!client_id || !service_id || !appointment_date) {
      res.status(400).json({
        message: 'client_id, service_id y appointment_date son obligatorios',
      });
      return;
    }

    const availability = await checkAvailability(
      appointment_date,
      Number(service_id)
    );

    if (!availability.available) {
      res.status(409).json({
        message: availability.reason,
        availability,
      });
      return;
    }

    const totalAmount = Number(availability.service.price);

    const query = `
      INSERT INTO operations.appointments (
        client_id,
        stylist_id,
        service_id,
        appointment_date,
        status,
        total_amount,
        deposit_amount,
        appointment_origin
      )
      VALUES ($1, NULL, $2, $3, 'confirmed', $4, $5, 'presencial')
      RETURNING *;
    `;

    const result = await pool.query(query, [
      client_id,
      service_id,
      appointment_date,
      totalAmount,
      deposit_amount,
    ]);

    res.status(201).json({
      message: 'Cita presencial confirmada automaticamente',
      appointment: result.rows[0],
    });
  } catch (error) {
    console.error('🔥 Error al crear cita manual:', error);
    res.status(500).json({
      message: 'Error interno del servidor al crear cita manual',
    });
  }
};

// =========================================================================
// 6. ACTUALIZAR ESTADO DE UNA CITA
// =========================================================================

export const updateAppointmentStatus = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  let { status } = req.body;

  try {
    if (!status) {
      res.status(400).json({
        message: 'El estado es obligatorio',
      });
      return;
    }

    status = normalizeStatus(status);

    if (!VALID_DB_STATUSES.includes(status)) {
      res.status(400).json({
        message: 'Estado no válido',
        allowed_statuses: VALID_DB_STATUSES,
      });
      return;
    }

    const query = `
      UPDATE operations.appointments
      SET status = $1
      WHERE id = $2
      RETURNING *;
    `;

    const result = await pool.query(query, [status, id]);

    if (result.rows.length === 0) {
      res.status(404).json({
        message: 'Cita no encontrada',
      });
      return;
    }

    res.json({
      message: 'Estado actualizado correctamente',
      appointment: result.rows[0],
    });
  } catch (error) {
    console.error('🔥 Error al actualizar la cita:', error);
    res.status(500).json({
      message: 'Error interno al actualizar la cita',
    });
  }
};

// =========================================================================
// 7. CERRAR CITA: FINALIZADA O NO ASISTIÓ
// =========================================================================

export const closeAppointment = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { outcome } = req.body;
  const client = await pool.connect();

  try {
    if (!outcome) {
      res.status(400).json({
        message: 'El resultado de cierre es obligatorio: completed o no_show',
      });
      return;
    }

    if (!['completed', 'no_show'].includes(outcome)) {
      res.status(400).json({
        message: 'Resultado no válido. Usa completed o no_show',
      });
      return;
    }

    await client.query('BEGIN');

    const currentResult = await client.query(
      `
      SELECT
        a.*,
        s.name AS servicio,
        u.full_name AS cliente
      FROM operations.appointments a
      LEFT JOIN operations.services s ON s.id = a.service_id
      LEFT JOIN auth.users u ON u.id = a.client_id
      WHERE a.id = $1
      FOR UPDATE;
      `,
      [id]
    );

    if (currentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({
        message: 'Cita no encontrada',
      });
      return;
    }

    const currentAppointment = currentResult.rows[0];

    if (['completed', 'no_show', 'canceled'].includes(currentAppointment.status)) {
      await client.query('ROLLBACK');
      res.status(409).json({
        message: 'Esta cita ya esta cerrada y no puede volver a cerrarse',
        appointment: currentAppointment,
      });
      return;
    }

    const query = `
      UPDATE operations.appointments
      SET status = $1
      WHERE id = $2
      RETURNING *;
    `;

    const result = await client.query(query, [outcome, id]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({
        message: 'Cita no encontrada',
      });
      return;
    }

    const appointment = result.rows[0];
    let transaction = null;

    let message = '';

    if (outcome === 'completed') {
      const existingTransaction = await client.query(
        `
        SELECT id
        FROM public.transactions
        WHERE type = 'income'
          AND category = 'Citas'
          AND reference_id = $1
        LIMIT 1;
        `,
        [appointment.id]
      );

      if (existingTransaction.rows.length === 0) {
        const transactionResult = await client.query(
          `
          INSERT INTO public.transactions (
            type,
            amount,
            category,
            description,
            reference_id,
            transaction_date
          )
          VALUES (
            'income',
            $1,
            'Citas',
            $2,
            $3,
            CURRENT_TIMESTAMP
          )
          RETURNING *;
          `,
          [
            Number(appointment.total_amount || 0),
            `Ingreso por cita completada: ${currentAppointment.servicio || 'Servicio'} - ${currentAppointment.cliente || 'Cliente'}`,
            appointment.id,
          ]
        );

        transaction = transactionResult.rows[0];
      }

      message = 'Cita marcada como finalizada. El servicio sí se realizó.';
    }

    if (outcome === 'no_show') {
      message = 'Cita marcada como no asistió. No se registra como servicio realizado.';
    }

    await client.query('COMMIT');

    res.json({
      message,
      appointment,
      transaction,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('🔥 Error al cerrar la cita:', error);
    res.status(500).json({
      message: 'Error interno al cerrar la cita',
    });
  } finally {
    client.release();
  }
};

// =========================================================================
// 8. EDITAR FECHA/SERVICIO DE UNA CITA
// =========================================================================

export const updateAppointment = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const {
    service_id,
    appointment_date,
    deposit_amount,
  } = req.body;

  try {
    const currentQuery = `
      SELECT *
      FROM operations.appointments
      WHERE id = $1;
    `;

    const currentResult = await pool.query(currentQuery, [id]);

    if (currentResult.rows.length === 0) {
      res.status(404).json({
        message: 'Cita no encontrada',
      });
      return;
    }

    const currentAppointment = currentResult.rows[0];

    const newServiceId = service_id || currentAppointment.service_id;
    const newAppointmentDate = appointment_date || currentAppointment.appointment_date;

    const availability = await checkAvailability(
      String(newAppointmentDate),
      Number(newServiceId),
      Number(id)
    );

    if (!availability.available) {
      res.status(409).json({
        message: availability.reason,
        availability,
      });
      return;
    }

    const newTotalAmount = Number(availability.service.price);

    const query = `
      UPDATE operations.appointments
      SET
        service_id = $1,
        appointment_date = $2,
        total_amount = $3,
        deposit_amount = COALESCE($4, deposit_amount),
        status = 'confirmed'
      WHERE id = $5
      RETURNING *;
    `;

    const result = await pool.query(query, [
      newServiceId,
      newAppointmentDate,
      newTotalAmount,
      deposit_amount ?? null,
      id,
    ]);

    res.json({
      message: 'Cita actualizada y confirmada automaticamente',
      appointment: result.rows[0],
    });
  } catch (error) {
    console.error('🔥 Error al editar cita:', error);
    res.status(500).json({
      message: 'Error interno al editar la cita',
    });
  }
};

// =========================================================================
// 9. CANCELAR CITA
// =========================================================================

export const cancelAppointment = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const query = `
      UPDATE operations.appointments
      SET status = 'canceled'
      WHERE id = $1
      RETURNING *;
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      res.status(404).json({
        message: 'Cita no encontrada',
      });
      return;
    }

    res.json({
      message: 'Cita cancelada correctamente',
      appointment: result.rows[0],
    });
  } catch (error) {
    console.error('🔥 Error al cancelar cita:', error);
    res.status(500).json({
      message: 'Error interno al cancelar la cita',
    });
  }
};
