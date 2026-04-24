import { useEffect, useState } from 'react';
import { API_BASE, fetchAuth } from '../api';

export default function MyAttendance() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuth(`${API_BASE}/my/attendance`)
      .then(r => r.json())
      .then(d => { setData(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const totals = data.reduce((acc, r) => ({
    work: acc.work + (r.WorkDays || 0),
    leave: acc.leave + (r.LeaveDays || 0),
    absent: acc.absent + (r.AbsentDays || 0),
  }), { work: 0, leave: 0, absent: 0 });

  return (
    <div className="animate-fade-in">
      <div className="page-header mb-4">
        <div>
          <h1 className="page-title">My Attendance Logs</h1>
          <p className="page-subtitle">Personal attendance overview and history</p>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-md-4">
          <div className="stat-card">
            <div className="stat-card-label">Total Work Days</div>
            <div className="stat-card-value text-primary">{totals.work}</div>
            <div className="small text-muted mt-1">Days completed</div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="stat-card">
            <div className="stat-card-label">Leave Days</div>
            <div className="stat-card-value text-warning">{totals.leave}</div>
            <div className="small text-muted mt-1">Authorized absences</div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="stat-card">
            <div className="stat-card-label">Absent Days</div>
            <div className="stat-card-value text-danger">{totals.absent}</div>
            <div className="small text-muted mt-1">Unscheduled absences</div>
          </div>
        </div>
      </div>

      <div className="card p-0 border-0 shadow-sm overflow-hidden bg-white">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th className="ps-4">Month</th>
                <th>Work Days</th>
                <th>Leave Days</th>
                <th>Absent Days</th>
                <th className="pe-4">Work Intensity</th>
              </tr>
            </thead>
            <tbody>
              {loading ? [...Array(3)].map((_, i) => (
                <tr key={i}>
                  <td className="ps-4"><div className="skeleton" style={{ height: 20, width: 120 }}></div></td>
                  <td><div className="skeleton" style={{ height: 16, width: 60 }}></div></td>
                  <td><div className="skeleton" style={{ height: 16, width: 60 }}></div></td>
                  <td><div className="skeleton" style={{ height: 16, width: 60 }}></div></td>
                  <td className="pe-4"><div className="skeleton" style={{ height: 10, width: '100%', borderRadius: 10 }}></div></td>
                </tr>
              )) : data.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-5 text-muted">No attendance logs found</td></tr>
              ) : (
                data.map((r, i) => (
                  <tr key={i}>
                    <td className="ps-4 fw-bold text-dark">{r.Month || r.AttendanceMonth}</td>
                    <td><span className="fw-bold text-primary">{r.WorkDays}</span></td>
                    <td><span className="fw-bold text-warning">{r.LeaveDays}</span></td>
                    <td><span className="fw-bold text-danger">{r.AbsentDays}</span></td>
                    <td className="pe-4" style={{ minWidth: 150 }}>
                      <div className="d-flex align-items-center gap-2">
                        <div className="progress flex-grow-1" style={{ height: 6, borderRadius: 10 }}>
                          <div className="progress-bar bg-primary" style={{ width: `${(r.WorkDays / 22) * 100}%`, borderRadius: 10 }}></div>
                        </div>
                        <span className="small fw-bold">{Math.round((r.WorkDays / 22) * 100)}%</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
