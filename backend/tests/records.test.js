const request = require('supertest');
const app = require('../src/server');
const pool = require('../src/config/db');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

let adminToken, doctorToken, patientToken;
let patientId;

beforeAll(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY, username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'patient' CHECK (role IN ('admin', 'doctor', 'patient')),
      created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS patients (
      id SERIAL PRIMARY KEY, first_name VARCHAR(100) NOT NULL, last_name VARCHAR(100) NOT NULL,
      date_of_birth DATE, email VARCHAR(255), phone VARCHAR(20),
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      assigned_doctor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS records (
      id SERIAL PRIMARY KEY, patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      record_type VARCHAR(100) NOT NULL, diagnosis TEXT, treatment TEXT, notes TEXT,
      visit_date TIMESTAMP DEFAULT NOW(), created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
});

beforeEach(async () => {
  await pool.query('DELETE FROM records');
  await pool.query('DELETE FROM patients');
  await pool.query('DELETE FROM users');

  const adminRes = await request(app).post('/api/auth/register').send({ username: 'admin', email: 'admin@t.com', password: 'pass', role: 'admin' });
  adminToken = adminRes.body.token;
  await request(app).post('/api/auth/register').send({ username: 'doc', email: 'doc@t.com', password: 'pass', role: 'doctor' });
  doctorToken = (await request(app).post('/api/auth/login').send({ email: 'doc@t.com', password: 'pass' })).body.token;
  await request(app).post('/api/auth/register').send({ username: 'pat', email: 'pat@t.com', password: 'pass', role: 'patient' });
  patientToken = (await request(app).post('/api/auth/login').send({ email: 'pat@t.com', password: 'pass' })).body.token;

  const patCreate = await request(app).post('/api/patients').set('Authorization', `Bearer ${adminToken}`).send({ first_name: 'Test', last_name: 'Patient' });
  patientId = patCreate.body.id;
});

afterAll(async () => {
  await pool.end();
});

describe('POST /api/records', () => {
  test('admin can create a record', async () => {
    const res = await request(app).post('/api/records').set('Authorization', `Bearer ${adminToken}`)
      .send({ patient_id: patientId, record_type: 'checkup', diagnosis: 'Healthy' });
    expect(res.status).toBe(201);
    expect(res.body.record_type).toBe('checkup');
  });

  test('fails without patient_id', async () => {
    const res = await request(app).post('/api/records').set('Authorization', `Bearer ${adminToken}`)
      .send({ record_type: 'checkup' });
    expect(res.status).toBe(400);
  });

  test('fails without record_type', async () => {
    const res = await request(app).post('/api/records').set('Authorization', `Bearer ${adminToken}`)
      .send({ patient_id: patientId });
    expect(res.status).toBe(400);
  });

  test('patient cannot create records', async () => {
    const res = await request(app).post('/api/records').set('Authorization', `Bearer ${patientToken}`)
      .send({ patient_id: patientId, record_type: 'self-note' });
    expect(res.status).toBe(403);
  });

  test('returns 404 for non-existent patient', async () => {
    const res = await request(app).post('/api/records').set('Authorization', `Bearer ${adminToken}`)
      .send({ patient_id: 99999, record_type: 'checkup' });
    expect(res.status).toBe(404);
  });
});

describe('GET /api/records', () => {
  beforeEach(async () => {
    await request(app).post('/api/records').set('Authorization', `Bearer ${adminToken}`)
      .send({ patient_id: patientId, record_type: 'visit', diagnosis: 'Flu' });
  });

  test('admin sees all records', async () => {
    const res = await request(app).get('/api/records').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('requires authentication', async () => {
    const res = await request(app).get('/api/records');
    expect(res.status).toBe(401);
  });

  test('record has patient name fields', async () => {
    const res = await request(app).get('/api/records').set('Authorization', `Bearer ${adminToken}`);
    expect(res.body[0].first_name).toBeDefined();
    expect(res.body[0].last_name).toBeDefined();
  });
});

describe('DELETE /api/records/:id', () => {
  test('admin can delete a record', async () => {
    const create = await request(app).post('/api/records').set('Authorization', `Bearer ${adminToken}`)
      .send({ patient_id: patientId, record_type: 'temp' });
    const res = await request(app).delete(`/api/records/${create.body.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  test('returns 404 for non-existent record', async () => {
    const res = await request(app).delete('/api/records/99999').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});
