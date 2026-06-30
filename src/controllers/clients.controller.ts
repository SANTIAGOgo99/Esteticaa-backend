import { Response } from 'express';
import pool from '../config/db';
import { AuthRequest } from '../middlewares/auth.middleware';

const ensureClientNotesTable = async () => {
  await pool.query(`
    CREATE SCHEMA IF NOT EXISTS operations;

    CREATE TABLE IF NOT EXISTS operations.client_notes (
      id SERIAL PRIMARY KEY,
      client_id INTEGER NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      note TEXT NOT NULL,
      created_by INTEGER REFERENCES auth.users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
};

const getClientSummaryQuery = (whereClause = '') => `
  WITH client_appointments AS (
    SELECT
      a.client_id,
      COUNT(a.id)::int AS appointments_count,
      COUNT(a.id) FILTER (WHERE a.status = 'completed')::int AS completed_appointments,
      COUNT(a.id) FILTER (WHERE a.status IN ('canceled', 'cancelled'))::int AS canceled_appointments,
      COUNT(a.id) FILTER (WHERE a.status = 'no_show')::int AS no_show_appointments,
      COALESCE(SUM(CASE WHEN a.status = 'completed' THEN a.total_amount ELSE 0 END), 0)::numeric AS total_services_spent,
      MIN(a.appointment_date) FILTER (
        WHERE a.appointment_date >= NOW()
        AND a.status IN ('pending', 'confirmed')
      ) AS next_appointment,
      MAX(a.appointment_date) AS last_appointment
    FROM operations.appointments a
    GROUP BY a.client_id
  )
  SELECT
    u.id,
    u.full_name,
    u.email,
    u.phone,
    u.role,
    u.is_active,
    TO_CHAR(u.created_at, 'YYYY-MM-DD') AS fecha_registro,
    COALESCE(ca.appointments_count, 0) AS appointments_count,
    COALESCE(ca.completed_appointments, 0) AS completed_appointments,
    COALESCE(ca.canceled_appointments, 0) AS canceled_appointments,
    COALESCE(ca.no_show_appointments, 0) AS no_show_appointments,
    COALESCE(ca.total_services_spent, 0) AS total_services_spent,
    ca.next_appointment,
    ca.last_appointment,
    (
      SELECT COUNT(*)::int
      FROM operations.client_notes cn
      WHERE cn.client_id = u.id
    ) AS notes_count,
    (
      SELECT cn.note
      FROM operations.client_notes cn
      WHERE cn.client_id = u.id
      ORDER BY cn.updated_at DESC
      LIMIT 1
    ) AS last_note
  FROM auth.users u
  LEFT JOIN client_appointments ca ON ca.client_id = u.id
  WHERE u.role = 'client'
  ${whereClause}
`;

const getPurchaseHistory = async (clientId: number) => {
  const tableResult = await pool.query("SELECT to_regclass('operations.orders') AS table_name");

  if (!tableResult.rows[0]?.table_name) {
    return {
      available: false,
      message: 'El modulo de ventas en linea todavia no guarda pedidos reales en backend.',
      summary: {
        orders_count: 0,
        total_spent: 0,
      },
      items: [],
    };
  }

  const columnsResult = await pool.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'operations'
    AND table_name = 'orders';
  `);

  const columns = new Set(columnsResult.rows.map((row) => row.column_name));

  if (!columns.has('client_id')) {
    return {
      available: false,
      message: 'La tabla de pedidos existe, pero no esta conectada a clientes.',
      summary: {
        orders_count: 0,
        total_spent: 0,
      },
      items: [],
    };
  }

  const totalColumn = columns.has('total_amount')
    ? 'total_amount'
    : columns.has('total')
      ? 'total'
      : columns.has('amount')
        ? 'amount'
        : null;

  const dateColumn = columns.has('created_at')
    ? 'created_at'
    : columns.has('order_date')
      ? 'order_date'
      : null;

  const statusColumn = columns.has('status') ? 'status' : null;
  const totalExpression = totalColumn ? totalColumn : '0';
  const dateExpression = dateColumn ? dateColumn : 'NOW()';
  const statusExpression = statusColumn ? statusColumn : "'registrado'";

  const ordersResult = await pool.query(
    `
      SELECT
        id,
        ${statusExpression} AS status,
        ${totalExpression} AS total_amount,
        ${dateExpression} AS created_at
      FROM operations.orders
      WHERE client_id = $1
      ORDER BY ${dateExpression} DESC
      LIMIT 30;
    `,
    [clientId]
  );

  const summaryResult = await pool.query(
    `
      SELECT
        COUNT(*)::int AS orders_count,
        COALESCE(SUM(${totalExpression}), 0)::numeric AS total_spent
      FROM operations.orders
      WHERE client_id = $1;
    `,
    [clientId]
  );

  return {
    available: true,
    message: '',
    summary: summaryResult.rows[0],
    items: ordersResult.rows,
  };
};

export const getClients = async (req: AuthRequest, res: Response) => {
  try {
    await ensureClientNotesTable();

    const search = String(req.query.search || '').trim();
    const params: string[] = [];
    let searchClause = '';

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      searchClause = `
        AND (
          LOWER(u.full_name) LIKE $1
          OR LOWER(u.email) LIKE $1
          OR LOWER(COALESCE(u.phone, '')) LIKE $1
        )
      `;
    }

    const result = await pool.query(
      `
        ${getClientSummaryQuery(searchClause)}
        ORDER BY
          ca.next_appointment ASC NULLS LAST,
          ca.last_appointment DESC NULLS LAST,
          u.created_at DESC;
      `,
      params
    );

    const totalServices = result.rows.reduce(
      (sum, client) => sum + Number(client.total_services_spent || 0),
      0
    );

    res.json({
      total: result.rows.length,
      summary: {
        active_clients: result.rows.filter((client) => client.is_active).length,
        clients_with_appointments: result.rows.filter((client) => Number(client.appointments_count) > 0).length,
        total_services_revenue: totalServices,
      },
      clients: result.rows,
    });
  } catch (error) {
    console.error('ERROR OBTENIENDO CLIENTES:', error);
    res.status(500).json({ error: 'Error del servidor al obtener clientes' });
  }
};

export const getClientById = async (req: AuthRequest, res: Response) => {
  const clientId = Number(req.params.id);

  if (!Number.isInteger(clientId)) {
    return res.status(400).json({ error: 'Cliente invalido' });
  }

  try {
    await ensureClientNotesTable();

    const clientResult = await pool.query(
      `
        ${getClientSummaryQuery('AND u.id = $1')}
        LIMIT 1;
      `,
      [clientId]
    );

    if (clientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const appointmentsResult = await pool.query(
      `
        SELECT
          a.id,
          a.service_id,
          s.name AS servicio,
          s.duration_minutes,
          a.appointment_date,
          (a.appointment_date + (s.duration_minutes || ' minutes')::interval) AS appointment_end,
          a.status,
          a.total_amount,
          a.deposit_amount,
          (a.total_amount - a.deposit_amount) AS remaining_amount,
          COALESCE(a.appointment_origin, 'web') AS appointment_origin,
          a.created_at
        FROM operations.appointments a
        LEFT JOIN operations.services s ON s.id = a.service_id
        WHERE a.client_id = $1
        ORDER BY a.appointment_date DESC;
      `,
      [clientId]
    );

    const notesResult = await pool.query(
      `
        SELECT
          cn.id,
          cn.note,
          cn.created_at,
          cn.updated_at,
          cn.created_by,
          u.full_name AS created_by_name
        FROM operations.client_notes cn
        LEFT JOIN auth.users u ON u.id = cn.created_by
        WHERE cn.client_id = $1
        ORDER BY cn.updated_at DESC;
      `,
      [clientId]
    );

    const purchases = await getPurchaseHistory(clientId);

    res.json({
      client: clientResult.rows[0],
      appointments: appointmentsResult.rows,
      purchases,
      notes: notesResult.rows,
    });
  } catch (error) {
    console.error('ERROR OBTENIENDO DETALLE DE CLIENTE:', error);
    res.status(500).json({ error: 'Error del servidor al obtener el cliente' });
  }
};

export const createClientNote = async (req: AuthRequest, res: Response) => {
  const clientId = Number(req.params.id);
  const note = String(req.body?.note || '').trim();

  if (!Number.isInteger(clientId)) {
    return res.status(400).json({ error: 'Cliente invalido' });
  }

  if (note.length < 3) {
    return res.status(400).json({ error: 'La nota debe tener al menos 3 caracteres' });
  }

  try {
    await ensureClientNotesTable();

    const clientResult = await pool.query(
      'SELECT id FROM auth.users WHERE id = $1 AND role = $2',
      [clientId, 'client']
    );

    if (clientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const result = await pool.query(
      `
        INSERT INTO operations.client_notes (client_id, note, created_by)
        VALUES ($1, $2, $3)
        RETURNING id, note, created_at, updated_at, created_by;
      `,
      [clientId, note, req.user?.id || null]
    );

    res.status(201).json({
      message: 'Nota guardada correctamente',
      note: result.rows[0],
    });
  } catch (error) {
    console.error('ERROR CREANDO NOTA DE CLIENTE:', error);
    res.status(500).json({ error: 'Error del servidor al guardar la nota' });
  }
};

export const updateClientNote = async (req: AuthRequest, res: Response) => {
  const clientId = Number(req.params.id);
  const noteId = Number(req.params.noteId);
  const note = String(req.body?.note || '').trim();

  if (!Number.isInteger(clientId) || !Number.isInteger(noteId)) {
    return res.status(400).json({ error: 'Datos invalidos' });
  }

  if (note.length < 3) {
    return res.status(400).json({ error: 'La nota debe tener al menos 3 caracteres' });
  }

  try {
    await ensureClientNotesTable();

    const result = await pool.query(
      `
        UPDATE operations.client_notes
        SET note = $1,
            updated_at = NOW()
        WHERE id = $2
        AND client_id = $3
        RETURNING id, note, created_at, updated_at, created_by;
      `,
      [note, noteId, clientId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Nota no encontrada' });
    }

    res.json({
      message: 'Nota actualizada correctamente',
      note: result.rows[0],
    });
  } catch (error) {
    console.error('ERROR ACTUALIZANDO NOTA DE CLIENTE:', error);
    res.status(500).json({ error: 'Error del servidor al actualizar la nota' });
  }
};

export const deleteClientNote = async (req: AuthRequest, res: Response) => {
  const clientId = Number(req.params.id);
  const noteId = Number(req.params.noteId);

  if (!Number.isInteger(clientId) || !Number.isInteger(noteId)) {
    return res.status(400).json({ error: 'Datos invalidos' });
  }

  try {
    await ensureClientNotesTable();

    const result = await pool.query(
      `
        DELETE FROM operations.client_notes
        WHERE id = $1
        AND client_id = $2
        RETURNING id;
      `,
      [noteId, clientId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Nota no encontrada' });
    }

    res.json({ message: 'Nota eliminada correctamente' });
  } catch (error) {
    console.error('ERROR ELIMINANDO NOTA DE CLIENTE:', error);
    res.status(500).json({ error: 'Error del servidor al eliminar la nota' });
  }
};
