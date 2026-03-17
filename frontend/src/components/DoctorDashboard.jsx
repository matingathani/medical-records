import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';

export default function DoctorDashboard() {
  const { token, user, logout } = useAuth();
  const [patients, setPatients] = useState([]);
  const [records, setRecords] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [error, setError] = useState('');
  const [newRecordType, setNewRecordType] = useState('');
  const [newDiagnosis, setNewDiagnosis] = useState('');
  const [newTreatment, setNewTreatment] = useState('');

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    axios.get(`${API_URL}/api/patients`, { headers })
      .then((res) => setPatients(res.data.data || res.data))
      .catch(() => setError('Failed to load patients'));
  }, []);

  const loadPatientRecords = async (patientId) => {
    try {
      const res = await axios.get(`${API_URL}/api/records`, { headers });
      const data = res.data.data || res.data;
      setRecords(data.filter((r) => r.patient_id === patientId));
      setSelectedPatient(patients.find((p) => p.id === patientId));
    } catch {
      setError('Failed to load records');
    }
  };

  const handleCreateRecord = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/api/records`, {
        patient_id: selectedPatient.id,
        record_type: newRecordType,
        diagnosis: newDiagnosis,
        treatment: newTreatment,
      }, { headers });
      setRecords((prev) => [res.data, ...prev]);
      setNewRecordType('');
      setNewDiagnosis('');
      setNewTreatment('');
    } catch {
      setError('Failed to create record');
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Doctor Dashboard — Dr. {user.username}</h1>
        <button onClick={logout}>Logout</button>
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20 }}>
        <div>
          <h3>My Patients ({patients.length})</h3>
          {patients.map((p) => (
            <div
              key={p.id}
              onClick={() => loadPatientRecords(p.id)}
              style={{
                padding: 12,
                marginBottom: 8,
                border: '1px solid #ddd',
                borderRadius: 4,
                cursor: 'pointer',
                background: selectedPatient?.id === p.id ? '#e3f2fd' : 'white'
              }}
            >
              <strong>{p.first_name} {p.last_name}</strong>
              <br />
              <small>{p.email}</small>
            </div>
          ))}
        </div>

        <div>
          {selectedPatient ? (
            <>
              <h3>Records for {selectedPatient.first_name} {selectedPatient.last_name}</h3>
              {records.length === 0 ? (
                <p>No records found.</p>
              ) : (
                records.map((r) => (
                  <div key={r.id} style={{ padding: 12, marginBottom: 8, border: '1px solid #ddd', borderRadius: 4 }}>
                    <strong>{r.record_type}</strong>
                    <span style={{ marginLeft: 12, color: '#666' }}>{new Date(r.visit_date).toLocaleDateString()}</span>
                    {r.diagnosis && <p style={{ margin: '8px 0' }}><strong>Diagnosis:</strong> {r.diagnosis}</p>}
                    {r.treatment && <p style={{ margin: '8px 0' }}><strong>Treatment:</strong> {r.treatment}</p>}
                    {r.notes && <p style={{ margin: '8px 0', color: '#666' }}>{r.notes}</p>}
                  </div>
                ))
              )}
              <div style={{ marginTop: 20, padding: 16, background: '#f9f9f9', borderRadius: 8 }}>
                <h4 style={{ marginTop: 0 }}>Add New Record</h4>
                <form onSubmit={handleCreateRecord}>
                  <div style={{ marginBottom: 8 }}>
                    <input
                      type="text"
                      value={newRecordType}
                      onChange={(e) => setNewRecordType(e.target.value)}
                      placeholder="Record type (e.g. checkup, lab)"
                      required
                      style={{ width: '100%', padding: 8 }}
                    />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <input
                      type="text"
                      value={newDiagnosis}
                      onChange={(e) => setNewDiagnosis(e.target.value)}
                      placeholder="Diagnosis"
                      style={{ width: '100%', padding: 8 }}
                    />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <input
                      type="text"
                      value={newTreatment}
                      onChange={(e) => setNewTreatment(e.target.value)}
                      placeholder="Treatment"
                      style={{ width: '100%', padding: 8 }}
                    />
                  </div>
                  <button type="submit" style={{ padding: '8px 16px' }}>Add Record</button>
                </form>
              </div>
            </>
          ) : (
            <p>Select a patient to view their records.</p>
          )}
        </div>
      </div>
    </div>
  );
}
