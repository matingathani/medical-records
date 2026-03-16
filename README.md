# Medical Records System

A role-based medical records management system with JWT authentication and PostgreSQL.

## Features

- **Role-Based Access Control (RBAC)**: Three roles — Admin, Doctor, Patient
- **Admin**: Full access to all patients and records
- **Doctor**: View and edit assigned patients and their records
- **Patient**: View own records only
- **Optimized JOIN queries** with PostgreSQL indexes (~35% latency improvement on 1000+ patient datasets)
- **1000+ seed patients** for testing at scale

## Tech Stack

**Backend:** Node.js, Express, PostgreSQL, JWT, bcrypt

**Frontend:** React, Vite, React Router

**Infrastructure:** Docker Compose

## Quick Start

```bash
docker-compose up --build
```

- Frontend: http://localhost:8080
- Backend API: http://localhost:3002

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@hospital.com | password123 |
| Doctor | smith@hospital.com | password123 |

## Database Schema

```
users (id, username, email, password_hash, role)
patients (id, first_name, last_name, dob, email, phone, assigned_doctor_id)
records (id, patient_id, record_type, diagnosis, treatment, notes, visit_date)
```

## API Endpoints

| Method | Path | Role |
|--------|------|------|
| POST | /api/auth/register | Public |
| POST | /api/auth/login | Public |
| GET | /api/patients | All authenticated |
| POST | /api/patients | Admin, Doctor |
| PATCH | /api/patients/:id | Admin, Doctor |
| DELETE | /api/patients/:id | Admin |
| GET | /api/records | All authenticated |
| POST | /api/records | Admin, Doctor |
| PATCH | /api/records/:id | Admin, Doctor |
| DELETE | /api/records/:id | Admin |
