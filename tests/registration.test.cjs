const assert = require('node:assert/strict');
const { test } = require('node:test');
const express = require('express');
const bcrypt = require('bcryptjs');
const { createRegisterHandler } = require('../dist/handlers/register');

const valid = { full_name: 'Cliente de prueba', email: 'cliente@example.com', phone: '5550000000', password: 'ClavePrueba123!' };

async function server(t, overrides = {}) {
    const statements = [], diagnostics = [], passwords = [];
    const handler = createRegisterHandler({
        query: async (sql, values) => {
            statements.push({ sql, values });
            return { rows: [{ id: 1, full_name: values[0], email: values[1], role: 'client', password_hash: values[2] }] };
        },
        hashPassword: async password => { passwords.push(password); return bcrypt.hash(password, 4); },
        reportFailure: code => diagnostics.push(code),
        ...overrides,
    });
    const app = express();
    app.use(express.json());
    app.post('/api/auth/register', handler);
    const http = app.listen(0, '127.0.0.1');
    await new Promise(resolve => http.once('listening', resolve));
    t.after(() => new Promise(resolve => http.close(resolve)));
    return {
        statements, diagnostics, passwords,
        post: async body => {
            const response = await fetch(`http://127.0.0.1:${http.address().port}/api/auth/register`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
            });
            return { status: response.status, body: await response.json() };
        },
    };
}

test('el registro público ignora roles y persiste únicamente client mediante SQL parametrizado', async t => {
    const app = await server(t);
    for (const role of ['admin', 'superadmin', true, { role: 'admin' }, ['admin']]) {
        const result = await app.post({ ...valid, role, is_active: false, id: 999 });
        assert.equal(result.status, 201);
        assert.equal(result.body.user.role, 'client');
        assert.equal(result.body.user.id, 1);
        const statement = app.statements.at(-1);
        assert.match(statement.sql, /VALUES \(\$1, \$2, \$3, \$4, 'client'\)/);
        assert.equal(statement.values.length, 4);
        assert.ok(await bcrypt.compare(valid.password, statement.values[2]));
        assert.equal(result.body.user.password_hash, undefined);
        assert.equal(result.body.user.password, undefined);
    }
});

test('conserva el contrato normal del registro y no recorta la contraseña', async t => {
    const app = await server(t);
    const input = { ...valid, full_name: ' Cliente de prueba ', email: ' cliente@example.com ', password: ' ClavePrueba123! ' };
    const result = await app.post(input);
    assert.deepEqual(result, { status: 201, body: { message: 'Usuario registrado', user: { id: 1, full_name: valid.full_name, email: valid.email, role: 'client' } } });
    assert.equal(app.passwords[0], input.password);
});

test('rechaza entradas incompletas, tipos inesperados y contraseñas que bcrypt truncaría antes de consultar BD', async t => {
    const app = await server(t);
    for (const body of [{}, [], { ...valid, full_name: null }, { ...valid, email: 'no-es-correo' }, { ...valid, phone: 5550000000 }, { ...valid, password: {} }, { ...valid, password: 'abc' }, { ...valid, password: 'a'.repeat(73) }, { ...valid, password: 'é'.repeat(37) }]) {
        const result = await app.post(body);
        assert.equal(result.status, 400);
    }
    assert.equal(app.statements.length, 0);
    assert.equal(app.passwords.length, 0);
});

test('una falla de BD devuelve solo el mensaje público y registra únicamente el código', async t => {
    const app = await server(t, { query: async () => { throw { code: '08006', message: 'PRIVATE_DATABASE_PASSWORD', stack: 'PRIVATE_STACK', detail: 'PRIVATE_EMAIL' }; } });
    const result = await app.post(valid);
    assert.deepEqual(result, { status: 500, body: { error: 'Error del servidor' } });
    assert.deepEqual(app.diagnostics, ['08006']);
    assert.ok(!JSON.stringify(result).includes('PRIVATE'));
});

test('un correo duplicado conserva la respuesta conocida y no devuelve detalles internos', async t => {
    const app = await server(t, { query: async () => { throw { code: '23505', detail: 'PRIVATE_EMAIL' }; } });
    assert.deepEqual(await app.post(valid), { status: 400, body: { error: 'El correo ya está registrado' } });
    assert.deepEqual(app.diagnostics, []);
});

test('un fallo inesperado de cifrado no consulta la BD ni filtra el error', async t => {
    const app = await server(t, { hashPassword: async () => { throw Error('PRIVATE_PASSWORD'); } });
    assert.deepEqual(await app.post(valid), { status: 500, body: { error: 'Error del servidor' } });
    assert.equal(app.statements.length, 0);
    assert.deepEqual(app.diagnostics, ['REGISTER_FAILED']);
});
