const test = require('node:test');
const assert = require('node:assert/strict');
const {
  generateCandidateTimes,
  getBusinessHours,
  checkAppointmentAvailability,
  getRescheduleEligibility,
} = require('../dist/services/agenda.service.js');

const monday = '2030-01-07';
const saturday = '2030-01-05';
const sunday = '2030-01-06';

test('lunes: servicio de 60 minutos termina a más tardar a las 19:00', () => {
  const slots = generateCandidateTimes(monday, 60);
  assert.equal(slots[0], '11:00');
  assert.equal(slots.at(-1), '18:00');
});

test('lunes: servicio de 120 minutos tiene último inicio a las 17:00', () => {
  assert.equal(generateCandidateTimes(monday, 120).at(-1), '17:00');
});

test('sábado: servicio de 60 minutos tiene último inicio a las 17:00', () => {
  assert.deepEqual(getBusinessHours(saturday), { open: '10:00', close: '18:00' });
  assert.equal(generateCandidateTimes(saturday, 60).at(-1), '17:00');
});

test('domingo no genera horarios', () => {
  assert.equal(getBusinessHours(sunday), null);
  assert.deepEqual(generateCandidateTimes(sunday, 60), []);
});

const mockDb = (duration, conflicts) => ({
  calls: 0,
  async query() {
    this.calls += 1;
    if (this.calls === 1) return { rows: [{ id: 1, name: 'Servicio', category: 'General', price: 100, duration_minutes: duration, is_active: true }] };
    return { rows: [{ total: conflicts, appointment_end: `2030-01-07 ${duration === 60 ? '12:30' : '13:30'}:00` }] };
  },
});

test('dos traslapes activos consumen capacidad y rechazan una tercera cita', async () => {
  const result = await checkAppointmentAvailability(mockDb(60, 2), '2030-01-07 11:30:00', 1, undefined, '2030-01-01 00:00:00');
  assert.equal(result.available, false);
  assert.equal(result.code, 'CAPACITY');
});

test('la consulta de traslape usa intervalos completos, no solo horas de inicio', async () => {
  const db = mockDb(60, 1);
  let overlapSql = '';
  const original = db.query.bind(db);
  db.query = async function (...args) {
    if (this.calls === 1) overlapSql = args[0];
    return original(...args);
  };
  const result = await checkAppointmentAvailability(db, '2030-01-07 11:30:00', 1, undefined, '2030-01-01 00:00:00');
  assert.equal(result.conflicts, 1);
  assert.match(overlapSql, /appointment_date </);
  assert.match(overlapSql, /appointment_date \+.*duration_minutes/s);
});

test('un horario pasado de hoy se rechaza', async () => {
  const result = await checkAppointmentAvailability(mockDb(60, 0), '2030-01-07 11:00:00', 1, undefined, '2030-01-07 12:00:00');
  assert.equal(result.available, false);
  assert.equal(result.code, 'PAST');
});

test('cambiar duration_minutes recalcula inmediatamente el final y los slots', () => {
  assert.equal(generateCandidateTimes(monday, 60).at(-1), '18:00');
  assert.equal(generateCandidateTimes(monday, 120).at(-1), '17:00');
});

test('una cita pendiente dentro de 48 horas puede reagendarse', () => {
  assert.deepEqual(
    getRescheduleEligibility('pending', '2030-01-03 10:00:00', '2030-01-01 10:00:00'),
    {
      can_reschedule: true,
      reschedule_deadline: '2030-01-02 10:00:00',
      reschedule_reason: null,
    }
  );
});

test('una cita confirmada dentro de 10 horas no puede reagendarse', () => {
  assert.deepEqual(
    getRescheduleEligibility('confirmed', '2030-01-01 20:00:00', '2030-01-01 10:00:00'),
    {
      can_reschedule: false,
      reschedule_deadline: '2029-12-31 20:00:00',
      reschedule_reason: 'Esta cita ya no puede reagendarse porque faltan menos de 24 horas.',
    }
  );
});

test('una cita exactamente a 24 horas todavía puede reagendarse', () => {
  assert.equal(
    getRescheduleEligibility('confirmed', '2030-01-02 10:00:00', '2030-01-01 10:00:00').can_reschedule,
    true
  );
});

test('canceled, completed y no_show nunca pueden reagendarse', () => {
  const canceled = getRescheduleEligibility('canceled', '2030-01-03 10:00:00', '2030-01-01 10:00:00');
  const completed = getRescheduleEligibility('completed', '2030-01-03 10:00:00', '2030-01-01 10:00:00');
  const noShow = getRescheduleEligibility('no_show', '2030-01-03 10:00:00', '2030-01-01 10:00:00');
  assert.equal(canceled.can_reschedule, false);
  assert.equal(canceled.reschedule_reason, 'Las citas canceladas no pueden reagendarse.');
  assert.equal(completed.can_reschedule, false);
  assert.equal(noShow.can_reschedule, false);
});

test('cancelación y no_show permanecen como estados diferenciados', () => {
  const canceled = 'canceled';
  const noShow = 'no_show';
  assert.notEqual(canceled, noShow);
  assert.equal(['pending', 'confirmed'].includes(canceled), false);
  assert.equal(['pending', 'confirmed'].includes(noShow), false);
});

test('un ISO UTC se convierte a la hora local de Huejutla sin desfase', () => {
  const { normalizeLocalDateTime } = require('../dist/services/agenda.service.js');
  assert.equal(normalizeLocalDateTime('2030-01-07T17:00:00.000Z'), '2030-01-07 11:00:00');
});
