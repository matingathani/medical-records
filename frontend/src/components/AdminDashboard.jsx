import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';

export default function AdminDashboard() {
  const { token, logout } = useAuth();
  const [patients, setPatients] = useState([]);
  const [records, setRecords] = useState([]);
  const [tab, setTab] = useState('patients');
  const [error, setError] = useState('');

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    Promise.all([
      axios.get(`${API_URL}/api/patients`, { headers }),
      axios.get(`${API_URL}/api/records`, { headers })
    ])
      .then(([pRes, rRes]) => {
        setPatients(pRes.data);
        setRecords(rRes.data);
      })
      .catch(() => setError('Failed to load data'));
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Admin Dashboard</h1>
        <button onClick={logout}>Logout</button>
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={{ marginBottom: 16 }}>
        <button
          onClick={() => setTab('patients')}
          style={{ marginRight: 8, fontWeight: tab === 'patients' ? 'bold' : 'normal' }}
        >
          Patients ({patients.length})
        </button>
        <button
          onClick={() => setTab('records')}
          style={{ fontWeight: tab === 'records' ? 'bold' : 'normal' }}
        >
          Records ({records.length})
        </button>
      </div>

      {tab === 'patients' && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ padding: 8, border: '1px solid #ddd', textAlign: 'left' }}>ID</th>
              <th style={{ padding: 8, border: '1px solid #ddd', textAlign: 'left' }}>Name</th>
              <th style={{ padding: 8, border: '1px solid #ddd', textAlign: 'left' }}>DOB</th>
              <th style={{ padding: 8, border: '1px solid #ddd', textAlign: 'left' }}>Doctor</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((p) => (
              <tr key={p.id}>
                <td style={{ padding: 8, border: '1px solid #ddd' }}>{p.id}</td>
                <td style={{ padding: 8, border: '1px solid #ddd' }}>{p.first_name} {p.last_name}</td>
                <td style={{ padding: 8, border: '1px solid #ddd' }}>{p.date_of_birth ? new Date(p.date_of_birth).toLocaleDateString() : '-'}</td>
                <td style={{ padding: 8, border: '1px solid #ddd' }}>{p.doctor_username || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === 'records' && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ padding: 8, border: '1px solid #ddd', textAlign: 'left' }}>ID</th>
              <th style={{ padding: 8, border: '1px solid #ddd', textAlign: 'left' }}>Patient</th>
              <th style={{ padding: 8, border: '1px solid #ddd', textAlign: 'left' }}>Type</th>
              <th style={{ padding: 8, border: '1px solid #ddd', textAlign: 'left' }}>Diagnosis</th>
              <th style={{ padding: 8, border: '1px solid #ddd', textAlign: 'left' }}>Visit Date</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id}>
                <td style={{ padding: 8, border: '1px solid #ddd' }}>{r.id}</td>
                <td style={{ padding: 8, border: '1px solid #ddd' }}>{r.first_name} {r.last_name}</td>
                <td style={{ padding: 8, border: '1px solid #ddd' }}>{r.record_type}</td>
                <td style={{ padding: 8, border: '1px solid #ddd' }}>{r.diagnosis || '-'}</td>
                <td style={{ padding: 8, border: '1px solid #ddd' }}>{new Date(r.visit_date).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
