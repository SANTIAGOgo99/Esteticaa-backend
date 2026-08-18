import { Request, Response } from 'express';
import pool from '../config/db';

// Estados reales guardados en la base de datos
const VALID_DB_STATUSES = ['pending', 'confirmed', 'completed', 'canceled', 'no_show'];

// Orígenes permitidos
const VALID_ORIGINS = ['web', 'presencial'];

// Capacidad de atención de la estética
// Como actualmente trabajan 2 personas, se permiten máximo 2 citas al mismo tiempo.
const MAX_SIMULTANEOUS_APPOINTMENTS = 2;

// Horarios base del negocio
const BUSINESS_HOURS = {
  weekday: {
    open: '11:00',
    close: '19:00',
  },
  saturday: {
    open: '10:00',
    close: '18:00',
  },
};

// =========================================================================
// FUNCIONES AUXILIARES
// =========================================================================

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
  const pad = (n: number) => String(n).padStart(2, '0');

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hour = pad(date.getHours());
  const minute = pad(date.getMinutes());
  const second = pad(date.getSeconds());

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
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

const getCalendarStatusSQL = `
  CASE
    WHEN a.status = 'canceled' THEN 'canceled'
    WHEN a.status = 'no_show' THEN 'no_show'
    WHEN a.status = 'completed' THEN 'completed'

    WHEN NOW() < a.appointment_date THEN 'pending'

    WHEN NOW() >= a.appointment_date
      AND NOW() < (a.appointment_date + (s.duration_minutes || ' minutes')::interval)
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

    WHEN NOW() < a.appointment_date THEN 'Pendiente'

    WHEN NOW() >= a.appointment_date
      AND NOW() < (a.appointment_date + (s.duration_minutes || ' minutes')::interval)
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

  const dateOnly =
    appointmentDate.split('T')[0] ||
    appointmentDate.split(' ')[0];

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

export const getAppointments = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { date_from, date_to, status, origin } = req.query;

    const conditions: string[] = [];
    const params: any[] = [];

    if (date_from) {
      params.push(date_from);
      conditions.push(
        `a.appointment_date >= $${params.length}::timestamp`
      );
    }

    if (date_to) {
      params.push(date_to);
      conditions.push(
        `a.appointment_date <= $${params.length}::timestamp`
      );
    }

    if (status) {
      params.push(status);
      conditions.push(`a.status = $${params.length}`);
    }

    if (origin) {
      params.push(origin);
      conditions.push(
        `a.appointment_origin = $${params.length}`
      );
    }

    const whereSQL =
      conditions.length > 0
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

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

        -- ==========================================================
        -- IMPORTANTE:
        -- Se devuelve como texto SIN zona horaria.
        -- Evita que una cita de 11:00 aparezca como 05:00
        -- al convertirla el navegador.
        -- ==========================================================
        TO_CHAR(
          a.appointment_date,
          'YYYY-MM-DD"T"HH24:MI:SS'
        ) AS appointment_date,

        TO_CHAR(
          a.appointment_date
            + (s.duration_minutes || ' minutes')::interval,
          'YYYY-MM-DD"T"HH24:MI:SS'
        ) AS appointment_end,

        a.status,
        ${getCalendarStatusSQL},
        ${getCalendarStatusLabelSQL},

        a.total_amount,
        a.deposit_amount,
        (a.total_amount - a.deposit_amount) AS remaining_amount,

        COALESCE(
          a.appointment_origin,
          'web'
        ) AS appointment_origin,

        a.created_at,
        a.updated_at

      FROM operations.appointments a
      LEFT JOIN auth.users u
        ON a.client_id = u.id
      LEFT JOIN operations.services s
        ON a.service_id = s.id

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
// 2. CONSULTAR DISPONIBILIDAD DE UN HORARIO
// =========================================================================

export const getAppointmentAvailability = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { appointment_date, service_id } = req.query;

    if (!appointment_date || !service_id) {
      res.status(400).json({
        message:
          'appointment_date y service_id son obligatorios',
      });
      return;
    }

    const availability = await checkAvailability(
      String(appointment_date),
      Number(service_id)
    );

    res.json(availability);
  } catch (error) {
    console.error(
      '🔥 Error al consultar disponibilidad:',
      error
    );

    res.status(500).json({
      message:
        'Error interno al consultar disponibilidad',
    });
  }
};

// =========================================================================
// 3. OBTENER HORARIOS DISPONIBLES POR DÍA Y SERVICIO
// =========================================================================

export const getAvailableSlots = async (
  req: Request,
  res: Response
): Promise<void> => {
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
      SELECT
        id,
        name,
        description,
        price,
        duration_minutes,
        is_active
      FROM operations.services
      WHERE id = $1;
      `,
      [Number(service_id)]
    );

    if (serviceResult.rows.length === 0) {
      res.status(404).json({
        message: 'Servicio no encontrado',
      });
      return;
    }

    const service = serviceResult.rows[0];

    const testDate = new Date(`${date}T12:00:00`);
    const day = testDate.getDay();

    if (day === 0) {
      res.json({
        date,
        service,
        available_slots: [],
        all_slots: [],
        message:
          'La estética no trabaja los domingos',
      });
      return;
    }

    const businessHours =
      day === 6
        ? { open: '10:00', close: '18:00' }
        : { open: '11:00', close: '19:00' };

    const addMinutesLocal = (
      fecha: Date,
      minutos: number
    ) => {
      return new Date(
        fecha.getTime() + minutos * 60000
      );
    };

    const pad = (n: number) =>
      String(n).padStart(2, '0');

    const formatDateForPostgresLocal = (
      fecha: Date
    ) => {
      const year = fecha.getFullYear();
      const month = pad(fecha.getMonth() + 1);
      const day = pad(fecha.getDate());
      const hour = pad(fecha.getHours());
      const minute = pad(fecha.getMinutes());
      const second = pad(fecha.getSeconds());

      return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
    };

    const openDate = new Date(
      `${date}T${businessHours.open}:00`
    );

    const closeDate = new Date(
      `${date}T${businessHours.close}:00`
    );

    const allSlots = [];
    const availableSlots = [];

    let current = new Date(openDate);

    while (current < closeDate) {
      const startDate = new Date(current);

      const endDate = addMinutesLocal(
        startDate,
        Number(service.duration_minutes)
      );

      if (endDate > closeDate) {
        allSlots.push({
          time: formatDateForPostgresLocal(startDate)
            .substring(11, 16),

          appointment_date:
            formatDateForPostgresLocal(startDate),

          appointment_end:
            formatDateForPostgresLocal(endDate),

          available: false,
          conflicts: 0,
          reason:
            'El servicio ya no cabe antes del cierre',
        });

        current = addMinutesLocal(current, 30);
        continue;
      }

      const conflictResult = await pool.query(
        `
        SELECT COUNT(*)::int AS total
        FROM operations.appointments a
        JOIN operations.services s
          ON s.id = a.service_id

        WHERE a.status IN ('pending', 'confirmed')

        AND a.appointment_date < $2::timestamp

        AND (
          a.appointment_date
          + (s.duration_minutes || ' minutes')::interval
        ) > $1::timestamp;
        `,
        [
          formatDateForPostgresLocal(startDate),
          formatDateForPostgresLocal(endDate),
        ]
      );

      const conflicts = Number(
        conflictResult.rows[0].total
      );

      const slot = {
        time:
          formatDateForPostgresLocal(startDate)
            .substring(11, 16),

        appointment_date:
          formatDateForPostgresLocal(startDate),

        appointment_end:
          formatDateForPostgresLocal(endDate),

        available:
          conflicts <
          MAX_SIMULTANEOUS_APPOINTMENTS,

        conflicts,

        reason:
          conflicts <
          MAX_SIMULTANEOUS_APPOINTMENTS
            ? 'Disponible'
            : 'Ocupado',
      };

      allSlots.push(slot);

      if (slot.available) {
        availableSlots.push(slot);
      }

      current = addMinutesLocal(current, 30);
    }

    res.json({
      date,
      service,
      business_hours: businessHours,
      available_slots: availableSlots,
      all_slots: allSlots,
    });
  } catch (error) {
    console.error(
      '🔥 Error al obtener horarios:',
      error
    );

    res.status(500).json({
      message:
        'Error interno al obtener horarios',
    });
  }
};

// =========================================================================
// 4. CREAR CITA DESDE CLIENTE WEB / ALEXA
// =========================================================================

export const createAppointment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      service_id,
      appointment_date,
      deposit_amount = 0,
    } = req.body;

    const client_id = (req as any).user?.id;

    if (!client_id) {
      res.status(401).json({
        message:
          'No se pudo identificar al cliente desde el token',
      });
      return;
    }

    if (!service_id || !appointment_date) {
      res.status(400).json({
        message:
          'service_id y appointment_date son obligatorios',
      });
      return;
    }

    const availability =
      await checkAvailability(
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

    const totalAmount = Number(
      availability.service.price
    );

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
      VALUES (
        $1,
        NULL,
        $2,
        $3::timestamp,
        'pending',
        $4,
        $5,
        'web'
      )

      RETURNING
        id,
        client_id,
        stylist_id,
        service_id,

        TO_CHAR(
          appointment_date,
          'YYYY-MM-DD"T"HH24:MI:SS'
        ) AS appointment_date,

        status,
        total_amount,
        deposit_amount,
        appointment_origin,
        created_at,
        updated_at;
    `;

    const result = await pool.query(query, [
      client_id,
      service_id,
      appointment_date,
      totalAmount,
      deposit_amount,
    ]);

    res.status(201).json({
      message:
        'Cita registrada correctamente desde la web',
      appointment: result.rows[0],
    });
  } catch (error) {
    console.error(
      '🔥 Error al crear la cita:',
      error
    );

    res.status(500).json({
      message:
        'Error interno del servidor al crear la cita',
    });
  }
};

// =========================================================================
// 5. CREAR CITA MANUAL DESDE ADMINISTRADOR
// =========================================================================

export const createManualAppointment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      client_id,
      service_id,
      appointment_date,
      deposit_amount = 0,
    } = req.body;

    if (
      !client_id ||
      !service_id ||
      !appointment_date
    ) {
      res.status(400).json({
        message:
          'client_id, service_id y appointment_date son obligatorios',
      });
      return;
    }

    const availability =
      await checkAvailability(
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

    const totalAmount = Number(
      availability.service.price
    );

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
      VALUES (
        $1,
        NULL,
        $2,
        $3::timestamp,
        'pending',
        $4,
        $5,
        'presencial'
      )

      RETURNING
        id,
        client_id,
        stylist_id,
        service_id,

        TO_CHAR(
          appointment_date,
          'YYYY-MM-DD"T"HH24:MI:SS'
        ) AS appointment_date,

        status,
        total_amount,
        deposit_amount,
        appointment_origin,
        created_at,
        updated_at;
    `;

    const result = await pool.query(query, [
      client_id,
      service_id,
      appointment_date,
      totalAmount,
      deposit_amount,
    ]);

    res.status(201).json({
      message:
        'Cita registrada manualmente como presencial',
      appointment: result.rows[0],
    });
  } catch (error) {
    console.error(
      '🔥 Error al crear cita manual:',
      error
    );

    res.status(500).json({
      message:
        'Error interno del servidor al crear cita manual',
    });
  }
};

// =========================================================================
// 6. ACTUALIZAR ESTADO DE UNA CITA
// =========================================================================

export const updateAppointmentStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
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

    const result = await pool.query(
      query,
      [status, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        message: 'Cita no encontrada',
      });
      return;
    }

    res.json({
      message:
        'Estado actualizado correctamente',
      appointment: result.rows[0],
    });
  } catch (error) {
    console.error(
      '🔥 Error al actualizar la cita:',
      error
    );

    res.status(500).json({
      message:
        'Error interno al actualizar la cita',
    });
  }
};

// =========================================================================
// 7. CERRAR CITA: FINALIZADA O NO ASISTIÓ
// =========================================================================

export const closeAppointment = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const { outcome } = req.body;

  try {
    if (!outcome) {
      res.status(400).json({
        message:
          'El resultado de cierre es obligatorio: completed o no_show',
      });
      return;
    }

    if (
      !['completed', 'no_show'].includes(outcome)
    ) {
      res.status(400).json({
        message:
          'Resultado no válido. Usa completed o no_show',
      });
      return;
    }

    const query = `
      UPDATE operations.appointments
      SET status = $1
      WHERE id = $2
      RETURNING *;
    `;

    const result = await pool.query(
      query,
      [outcome, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        message: 'Cita no encontrada',
      });
      return;
    }

    const appointment = result.rows[0];

    let message = '';

    if (outcome === 'completed') {
      message =
        'Cita marcada como finalizada. El servicio sí se realizó.';
    }

    if (outcome === 'no_show') {
      message =
        'Cita marcada como no asistió. No se registra como servicio realizado.';
    }

    res.json({
      message,
      appointment,
    });
  } catch (error) {
    console.error(
      '🔥 Error al cerrar la cita:',
      error
    );

    res.status(500).json({
      message:
        'Error interno al cerrar la cita',
    });
  }
};

// =========================================================================
// 8. EDITAR FECHA/SERVICIO DE UNA CITA
// =========================================================================

export const updateAppointment = async (
  req: Request,
  res: Response
): Promise<void> => {
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

    const currentResult = await pool.query(
      currentQuery,
      [id]
    );

    if (currentResult.rows.length === 0) {
      res.status(404).json({
        message: 'Cita no encontrada',
      });
      return;
    }

    const currentAppointment =
      currentResult.rows[0];

    const newServiceId =
      service_id ||
      currentAppointment.service_id;

    const newAppointmentDate =
      appointment_date ||
      currentAppointment.appointment_date;

    const availability =
      await checkAvailability(
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

    const newTotalAmount = Number(
      availability.service.price
    );

    const query = `
      UPDATE operations.appointments

      SET
        service_id = $1,
        appointment_date = $2::timestamp,
        total_amount = $3,
        deposit_amount =
          COALESCE($4, deposit_amount),
        status = 'pending'

      WHERE id = $5

      RETURNING
        id,
        client_id,
        stylist_id,
        service_id,

        TO_CHAR(
          appointment_date,
          'YYYY-MM-DD"T"HH24:MI:SS'
        ) AS appointment_date,

        status,
        total_amount,
        deposit_amount,
        appointment_origin,
        created_at,
        updated_at;
    `;

    const result = await pool.query(query, [
      newServiceId,
      newAppointmentDate,
      newTotalAmount,
      deposit_amount ?? null,
      id,
    ]);

    res.json({
      message:
        'Cita actualizada correctamente',
      appointment: result.rows[0],
    });
  } catch (error) {
    console.error(
      '🔥 Error al editar cita:',
      error
    );

    res.status(500).json({
      message:
        'Error interno al editar la cita',
    });
  }
};

// =========================================================================
// 9. CANCELAR CITA
// =========================================================================

export const cancelAppointment = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;

  try {
    const query = `
      UPDATE operations.appointments
      SET status = 'canceled'
      WHERE id = $1
      RETURNING *;
    `;

    const result = await pool.query(
      query,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        message: 'Cita no encontrada',
      });
      return;
    }

    res.json({
      message:
        'Cita cancelada correctamente',
      appointment: result.rows[0],
    });
  } catch (error) {
    console.error(
      '🔥 Error al cancelar cita:',
      error
    );

    res.status(500).json({
      message:
        'Error interno al cancelar la cita',
    });
  }
};
