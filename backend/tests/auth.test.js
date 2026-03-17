const request = require('supertest');
const app = require('../src/server');
const pool = require('../src/config/db');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

beforeAll(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'patient' CHECK (role IN ('admin', 'doctor', 'patient')),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS patients (
      id SERIAL PRIMARY KEY,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      date_of_birth DATE,
      email VARCHAR(255),
      phone VARCHAR(20),
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      assigned_doctor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS records (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      record_type VARCHAR(100) NOT NULL,
      diagnosis TEXT,
      treatment TEXT,
      notes TEXT,
      visit_date TIMESTAMP DEFAULT NOW(),
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
});

beforeEach(async () => {
  await pool.query('DELETE FROM records');
  await pool.query('DELETE FROM patients');
  await pool.query('DELETE FROM users');
});

afterAll(async () => {
  await pool.end();
});

describe('POST /api/auth/register', () => {
  test('registers a new patient user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'patient1', email: 'p1@test.com', password: 'pass123' });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('patient');
    expect(res.body.token).toBeDefined();
  });

  test('registers with explicit doctor role', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'doc1', email: 'doc1@test.com', password: 'pass123', role: 'doctor' });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('doctor');
  });

  test('fails with missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'x@test.com' });
    expect(res.status).toBe(400);
  });

  test('fails with duplicate email', async () => {
    await request(app).post('/api/auth/register').send({ username: 'u1', email: 'dup@test.com', password: 'pass' });
    const res = await request(app).post('/api/auth/register').send({ username: 'u2', email: 'dup@test.com', password: 'pass' });
    expect(res.status).toBe(409);
  });

  test('JWT token has role claim', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'roletest', email: 'role@test.com', password: 'pass123', role: 'admin' });
    const jwt = require('jsonwebtoken');
    const decoded = jwt.decode(res.body.token);
    expect(decoded.role).toBe('admin');
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send({ username: 'loginuser', email: 'login@test.com', password: 'correct' });
  });

  test('logs in with correct credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'login@test.com', password: 'correct' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBeDefined();
  });

  test('fails with wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'login@test.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  test('fails with unknown email', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nobody@test.com', password: 'pass' });
    expect(res.status).toBe(401);
  });

  test('fails with missing password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'login@test.com' });
    expect(res.status).toBe(400);
  });

  test('response does not include password_hash', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'login@test.com', password: 'correct' });
    expect(res.body.user.password_hash).toBeUndefined();
  });
});
