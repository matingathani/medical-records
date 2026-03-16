-- Seed data for medical records system
-- Insert admin and doctor users (passwords are hashed 'password123')

INSERT INTO users (username, email, password_hash, role) VALUES
  ('admin', 'admin@hospital.com', '$2b$10$rGHrOFk.k3cBJkCzsPF0.OdqdFgCN.MFR.bDOPUv8sJaF6DwpP7Ky', 'admin'),
  ('dr_smith', 'smith@hospital.com', '$2b$10$rGHrOFk.k3cBJkCzsPF0.OdqdFgCN.MFR.bDOPUv8sJaF6DwpP7Ky', 'doctor'),
  ('dr_jones', 'jones@hospital.com', '$2b$10$rGHrOFk.k3cBJkCzsPF0.OdqdFgCN.MFR.bDOPUv8sJaF6DwpP7Ky', 'doctor')
ON CONFLICT DO NOTHING;

-- Generate 1000 patient records
DO $$
DECLARE
  i INTEGER;
  first_names TEXT[] := ARRAY['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Barbara',
                               'David', 'Susan', 'Richard', 'Jessica', 'Joseph', 'Sarah', 'Thomas', 'Karen', 'Charles', 'Lisa',
                               'Christopher', 'Nancy', 'Daniel', 'Betty', 'Matthew', 'Margaret', 'Anthony', 'Sandra', 'Mark', 'Ashley'];
  last_names TEXT[] := ARRAY['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
                              'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
                              'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson'];
  doctor_id INTEGER;
BEGIN
  FOR i IN 1..1000 LOOP
    -- Alternate between 2 doctors
    IF i % 2 = 0 THEN
      SELECT id INTO doctor_id FROM users WHERE username = 'dr_smith';
    ELSE
      SELECT id INTO doctor_id FROM users WHERE username = 'dr_jones';
    END IF;

    INSERT INTO patients (first_name, last_name, date_of_birth, email, phone, assigned_doctor_id)
    VALUES (
      first_names[1 + (i % array_length(first_names, 1))],
      last_names[1 + (i % array_length(last_names, 1))],
      (NOW() - (INTERVAL '1 year' * (20 + (i % 60))))::DATE,
      'patient' || i || '@example.com',
      '555-' || LPAD(i::TEXT, 4, '0'),
      doctor_id
    );
  END LOOP;
END $$;
