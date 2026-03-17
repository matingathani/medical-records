import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';

export default function PatientDashboard() {
  const { token, user, logout } = useAuth();
  const [records, setRecords] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get(`${API_URL}/api/records`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setRecords(res.data.data || res.data))
      .catch(() => setError('Failed to load records'));
  }, []);

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>My Medical Records</h1>
        <button onClick={logout}>Logout</button>
      </div>
      <p>Welcome, {user.username}</p>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {records.length === 0 ? (
        <p>No medical records found.</p>
      ) : (
        records.map((r) => (
          <div key={r.id} style={{ padding: 16, marginBottom: 12, border: '1px solid #ddd', borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>{r.record_type}</strong>
              <span style={{ color: '#666' }}>{new Date(r.visit_date).toLocaleDateString()}</span>
            </div>
            {r.doctor_username && (
              <p style={{ margin: '8px 0', color: '#666' }}>Doctor: {r.doctor_username}</p>
            )}
            {r.diagnosis && <p style={{ margin: '8px 0' }}><strong>Diagnosis:</strong> {r.diagnosis}</p>}
            {r.treatment && <p style={{ margin: '8px 0' }}><strong>Treatment:</strong> {r.treatment}</p>}
            {r.notes && <p style={{ margin: '8px 0', color: '#888' }}><em>{r.notes}</em></p>}
          </div>
        ))
      )}
    </div>
  );
}
