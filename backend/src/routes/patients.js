const express = require('express');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

router.use(authenticateToken);

// GET all patients - admin sees all, doctor sees assigned patients
router.get('/', async (req, res) => {
  try {
    let query;
    let params = [];

    if (req.user.role === 'admin') {
      query = `
        SELECT p.*, u.username as doctor_username
        FROM patients p
        LEFT JOIN users u ON p.assigned_doctor_id = u.id
        ORDER BY p.last_name, p.first_name
      `;
    } else if (req.user.role === 'doctor') {
      query = `
        SELECT p.*, u.username as doctor_username
        FROM patients p
        LEFT JOIN users u ON p.assigned_doctor_id = u.id
        WHERE p.assigned_doctor_id = $1
        ORDER BY p.last_name, p.first_name
      `;
      params = [req.user.userId];
    } else {
      query = `
        SELECT p.*, u.username as doctor_username
        FROM patients p
        LEFT JOIN users u ON p.assigned_doctor_id = u.id
        WHERE p.user_id = $1
      `;
      params = [req.user.userId];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get patients error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET patient by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT p.*, u.username as doctor_username
       FROM patients p
       LEFT JOIN users u ON p.assigned_doctor_id = u.id
       WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const patient = result.rows[0];

    if (req.user.role === 'patient' && patient.user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (req.user.role === 'doctor' && patient.assigned_doctor_id !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(patient);
  } catch (err) {
    console.error('Get patient error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST create patient - admin and doctor only
router.post('/', requireRole('admin', 'doctor'), async (req, res) => {
  try {
    const { first_name, last_name, date_of_birth, email, phone, assigned_doctor_id } = req.body;

    if (!first_name || !last_name) {
      return res.status(400).json({ error: 'First name and last name are required' });
    }

    const doctorId = req.user.role === 'doctor' ? req.user.userId : (assigned_doctor_id || null);

    const result = await pool.query(
      'INSERT INTO patients (first_name, last_name, date_of_birth, email, phone, assigned_doctor_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [first_name, last_name, date_of_birth || null, email || null, phone || null, doctorId]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create patient error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH update patient
router.patch('/:id', requireRole('admin', 'doctor'), async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, date_of_birth, email, phone, assigned_doctor_id } = req.body;

    const existing = await pool.query('SELECT * FROM patients WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const current = existing.rows[0];

    if (req.user.role === 'doctor' && current.assigned_doctor_id !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      `UPDATE patients SET
        first_name = $1, last_name = $2, date_of_birth = $3,
        email = $4, phone = $5, assigned_doctor_id = $6, updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [
        first_name ?? current.first_name,
        last_name ?? current.last_name,
        date_of_birth ?? current.date_of_birth,
        email ?? current.email,
        phone ?? current.phone,
        assigned_doctor_id ?? current.assigned_doctor_id,
        id
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update patient error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE patient - admin only
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query('SELECT id FROM patients WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    await pool.query('DELETE FROM patients WHERE id = $1', [id]);
    res.json({ message: 'Patient deleted successfully' });
  } catch (err) {
    console.error('Delete patient error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
