-- Consulta de solo lectura para demostrar los datos dinámicos de una cita.
-- Sustituir $1 por el id de la cita en el cliente SQL utilizado.
SELECT
  a.id AS appointment_id,
  a.client_id,
  u.full_name AS client_name,
  u.email,
  a.service_id,
  s.name AS service_name,
  s.category,
  s.price,
  s.duration_minutes,
  a.appointment_date,
  a.appointment_date + (s.duration_minutes * interval '1 minute') AS appointment_end,
  a.status,
  a.appointment_origin,
  a.created_at
FROM operations.appointments AS a
JOIN auth.users AS u ON u.id = a.client_id
JOIN operations.services AS s ON s.id = a.service_id
WHERE a.id = $1;
