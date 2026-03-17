const request = require('supertest');
const app = require('../src/server');
const pool = require('../src/config/db');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

let adminToken, doctorToken, patientToken;
let doctorId;

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

  const docRes = await request(app).post('/api/auth/register').send({ username: 'doc', email: 'doc@t.com', password: 'pass', role: 'doctor' });
  doctorToken = docRes.body.token;
  doctorId = docRes.body.user.id;

  const patRes = await request(app).post('/api/auth/register').send({ username: 'pat', email: 'pat@t.com', password: 'pass', role: 'patient' });
  patientToken = patRes.body.token;
});

afterAll(async () => {
  await pool.end();
});

describe('GET /api/patients', () => {
  test('admin sees all patients', async () => {
    await request(app).post('/api/patients').set('Authorization', `Bearer ${adminToken}`).send({ first_name: 'A', last_name: 'B' });
    const res = await request(app).get('/api/patients').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('doctor sees only assigned patients', async () => {
    await request(app).post('/api/patients').set('Authorization', `Bearer ${doctorToken}`).send({ first_name: 'Doc', last_name: 'Patient' });
    const res = await request(app).get('/api/patients').set('Authorization', `Bearer ${doctorToken}`);
    expect(res.status).toBe(200);
    res.body.forEach(p => expect(p.assigned_doctor_id).toBe(doctorId));
  });

  test('requires authentication', async () => {
    const res = await request(app).get('/api/patients');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/patients', () => {
  test('admin can create patient', async () => {
    const res = await request(app).post('/api/patients').set('Authorization', `Bearer ${adminToken}`).send({ first_name: 'Jane', last_name: 'Doe' });
    expect(res.status).toBe(201);
    expect(res.body.first_name).toBe('Jane');
  });

  test('doctor can create patient (auto-assigned)', async () => {
    const res = await request(app).post('/api/patients').set('Authorization', `Bearer ${doctorToken}`).send({ first_name: 'John', last_name: 'Smith' });
    expect(res.status).toBe(201);
    expect(res.body.assigned_doctor_id).toBe(doctorId);
  });

  test('patient cannot create patient', async () => {
    const res = await request(app).post('/api/patients').set('Authorization', `Bearer ${patientToken}`).send({ first_name: 'X', last_name: 'Y' });
    expect(res.status).toBe(403);
  });

  test('fails without first_name', async () => {
    const res = await request(app).post('/api/patients').set('Authorization', `Bearer ${adminToken}`).send({ last_name: 'Only' });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/patients/:id', () => {
  test('admin can delete patient', async () => {
    const create = await request(app).post('/api/patients').set('Authorization', `Bearer ${adminToken}`).send({ first_name: 'Del', last_name: 'Me' });
    const res = await request(app).delete(`/api/patients/${create.body.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  test('doctor cannot delete patient', async () => {
    const create = await request(app).post('/api/patients').set('Authorization', `Bearer ${adminToken}`).send({ first_name: 'Keep', last_name: 'Me' });
    const res = await request(app).delete(`/api/patients/${create.body.id}`).set('Authorization', `Bearer ${doctorToken}`);
    expect(res.status).toBe(403);
  });

  test('returns 404 for non-existent patient', async () => {
    const res = await request(app).delete('/api/patients/99999').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});
