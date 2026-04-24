import { useState, useEffect } from 'react';
import AlertDetailPanel from '../components/AlertDetailPanel';
import { API_BASE, fetchAuth } from '../api';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('All');
  const [filterSeverity, setFilterSeverity] = useState('All');

  const loadAlerts = () => {
    setLoading(true);
    fetchAuth(`${API_BASE}/alerts`)
      .then(res => res.json())
      .then(data => {
        setAlerts(Array.isArray(data) ? data : []);
        setLoading(false);
      }).catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleAlertAction = (alertId) => {
    setAlerts(prev => prev.filter(a => (a.id || a.message) !== alertId));
    setSelectedAlert(null);
  };

  const filteredAlerts = alerts.filter(a => {
    const matchType = filterType === 'All' || a.type === filterType;
    const matchSev = filterSeverity === 'All' || a.severity === filterSeverity;
    return matchType && matchSev;
  });

  return (
    <div className="animate-fade-in">
      <div className="page-header mb-4">
        <div>
          <h1 className="page-title">System Alerts</h1>
          <p className="page-subtitle">Monitor and resolve system-generated notifications</p>
        </div>
        <div className="d-flex gap-3 align-items-center">
           <span className="badge bg-danger-light text-danger p-2 px-3 rounded-pill fw-bold">
             {alerts.length} Active System Flags
           </span>
        </div>
      </div>

      <div className="row g-4">
        <div className={selectedAlert ? "col-lg-7" : "col-lg-12"}>
          <div className="card p-0 border-0 shadow-sm overflow-hidden bg-white">
            <div className="p-3 border-bottom d-flex gap-2 flex-wrap bg-light">
              <select className="form-select form-select-sm w-auto" value={filterType} onChange={e => setFilterType(e.target.value)}>
                <option value="All">All Types</option>
                <option value="Salary anomaly">Salary Anomalies</option>
                <option value="Excessive leave">Leave Limits</option>
                <option value="Birthday">Birthdays</option>
                <option value="Work anniversary">Anniversaries</option>
              </select>
              <select className="form-select form-select-sm w-auto" value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}>
                <option value="All">All Severities</option>
                <option value="critical">Critical</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </select>
            </div>

            <div className="table-responsive">
              <table className="data-table mb-0">
                <thead>
                  <tr>
                    <th className="ps-4">Type</th>
                    <th>Message</th>
                    <th>Severity</th>
                    <th className="pe-4 text-end">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? [...Array(6)].map((_, i) => (
                    <tr key={i}>
                      <td className="ps-4"><div className="skeleton" style={{ height: 20, width: 80 }}></div></td>
                      <td><div className="skeleton" style={{ height: 16, width: 200 }}></div></td>
                      <td><div className="skeleton" style={{ height: 24, width: 70, borderRadius: 20 }}></div></td>
                      <td className="pe-4 text-end"><div className="skeleton" style={{ height: 16, width: 100, float: 'right' }}></div></td>
                    </tr>
                  )) : filteredAlerts.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-5 text-muted">No alerts found</td></tr>
                  ) : (
                    filteredAlerts.map((a, i) => (
                      <tr 
                        key={i} 
                        className={`hover-row ${selectedAlert === a ? 'bg-primary-light' : ''}`} 
                        onClick={() => setSelectedAlert(a)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td className="ps-4">
                          <span className={`badge bg-${a.type === 'Salary' ? 'success' : 'primary'}-light text-${a.type === 'Salary' ? 'success' : 'primary'}`}>
                            {a.type}
                          </span>
                        </td>
                        <td>
                          <div className="text-dark fw-600 text-truncate" style={{ maxWidth: 250 }}>{a.message}</div>
                        </td>
                        <td>
                          <span className={`badge badge-${a.severity === 'critical' ? 'active' : a.severity === 'warning' ? 'probation' : 'inactive'}`}>
                            {a.severity}
                          </span>
                        </td>
                        <td className="pe-4 text-end small text-muted">{a.date}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {selectedAlert && (
          <div className="col-lg-5">
            <AlertDetailPanel 
              alert={selectedAlert} 
              onClose={() => setSelectedAlert(null)} 
              onAction={handleAlertAction} 
            />
          </div>
        )}
      </div>
    </div>
  );
}
