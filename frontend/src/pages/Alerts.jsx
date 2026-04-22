import { useState, useEffect } from 'react';
import AlertDetailPanel from '../components/AlertDetailPanel';
import Skeleton, { TableSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { API_BASE } from '../api';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/alerts`)
      .then(res => res.json())
      .then(data => {
        setAlerts(data);
        setLoading(false);
      }).catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleAlertAction = (alertId) => {
    setAlerts(prev => prev.filter(a => (a.id || a.message) !== alertId));
    setSelectedAlert(null);
  };

  return (
    <div className="pb-5">
      <div className="d-flex justify-content-between align-items-center mb-5 animate-slide-up">
        <div>
          <h2 className="fw-bold text-dark mb-1 tracking-tight">System Notifications</h2>
          <p className="text-muted small mb-0">Monitor high-priority anomalies and workforce milestones.</p>
        </div>
        <button className="btn btn-primary-custom px-4 shadow-sm fw-bold"><i className="bi bi-shield-plus me-1"></i> New Protocol</button>
      </div>

      <div className="table-container p-0 border-0 shadow-sm glass-card animate-slide-up shadow-sm">
        <div className="filter-bar border-bottom">
           <div className="d-flex gap-2">
              <select className="form-select form-control-custom w-auto border-0 bg-light fw-bold">
                 <option>Filter All Categories</option>
                 <option>Operational Alerts</option>
                 <option>Cultural Milestones</option>
              </select>
           </div>
           <div className="text-muted extra-small fw-bold">
              PENDING RESOLUTIONS: <span className="text-primary">{alerts.length}</span>
           </div>
        </div>

        <div className="table-responsive">
          <table className="table-custom">
            <thead>
              <tr>
                <th>Category</th>
                <th>Anomaly Identity</th>
                <th>Context</th>
                <th>Priority</th>
                <th className="text-end">Command</th>
              </tr>
            </thead>
            {loading ? <TableSkeleton rows={6} columns={5} /> : (
              <tbody>
                {alerts.map((a, i) => (
                  <tr key={i} className="hover-row" onClick={() => setSelectedAlert(a)} style={{ cursor: 'pointer' }}>
                    <td>
                       <div className={`p-2 rounded-3 bg-light d-flex align-items-center justify-content-center ${a.severity === 'critical' ? 'text-danger' : 'text-primary'}`} style={{ width: '40px', height: '40px' }}>
                          <i className={`bi ${a.type === 'Birthday' ? 'bi-gift-fill' : 'bi-exclamation-triangle-fill'} fs-5`}></i>
                       </div>
                    </td>
                    <td><div className="fw-bold text-dark mb-0">System Node {i+1}</div><div className="extra-small text-muted">{a.type}</div></td>
                    <td><div className="text-muted small text-truncate-custom" style={{ maxWidth: '300px' }}>{a.message}</div></td>
                    <td>
                       <span className={`badge-custom ${a.severity === 'critical' ? 'severity-critical' : a.severity === 'warning' ? 'severity-warning' : 'severity-info'}`}>
                          {a.severity}
                       </span>
                    </td>
                    <td className="text-end">
                       <button className="btn btn-sm btn-white border px-3 fw-bold rounded-pill shadow-sm" onClick={() => setSelectedAlert(a)}>Inspect</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
        
        {!loading && alerts.length === 0 && (
           <EmptyState icon="🛡️" title="All nodes secure" message="No pending anomalies detected in the current operational cycle." />
        )}
      </div>

      <AlertDetailPanel alert={selectedAlert} onClose={() => setSelectedAlert(null)} onAction={handleAlertAction} />
    </div>
  );
}
