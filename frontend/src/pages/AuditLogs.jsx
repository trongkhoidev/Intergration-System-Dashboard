import { useState, useEffect } from 'react';
import { API_BASE, fetchAuth } from '../api';
import { TableSkeleton } from '../components/Skeleton';
import ExportModal from '../components/ExportModal';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  useEffect(() => {
    fetchAuth(`${API_BASE}/audit-logs`)
      .then(res => res.json())
      .then(data => {
        setLogs(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="pb-5">
      <div className="d-flex justify-content-between align-items-center mb-5 animate-slide-up">
        <div>
          <h2 className="fw-bold text-dark mb-1 tracking-tight">System Audit Logs</h2>
          <p className="text-muted small mb-0">Immutable record of system operations and security events.</p>
        </div>
        <button className="btn btn-outline-primary bg-white px-3 shadow-sm fw-bold d-flex align-items-center gap-2" onClick={() => setIsExportModalOpen(true)}>
            <i className="bi bi-shield-check"></i> Export Log Extract
        </button>
      </div>

      <div className="table-container p-0 border-0 shadow-sm animate-slide-up bg-white rounded-4 overflow-hidden">
        <div className="table-responsive">
          <table className="data-table align-middle">
            <thead>
              <tr>
                <th className="ps-4">Event ID</th>
                <th>Timestamp</th>
                <th>Identity</th>
                <th>Action Segment</th>
                <th className="pe-4">Event Details</th>
              </tr>
            </thead>
            {loading ? <TableSkeleton rows={10} columns={5} /> : (
              <tbody>
                {logs.map((log) => (
                  <tr key={log.LogID}>
                    <td className="text-muted extra-small fw-bold ps-4">EVT-{String(log.LogID).padStart(5, '0')}</td>
                    <td className="small">{new Date(log.Timestamp).toLocaleString()}</td>
                    <td className="fw-bold text-dark">{log.Username}</td>
                    <td>
                      <span className="badge bg-light text-dark border px-3 py-2 rounded-pill fw-bold" style={{ fontSize: '0.75rem' }}>
                        {log.Action}
                      </span>
                    </td>
                    <td className="small text-muted pe-4">{log.Details}</td>
                  </tr>
                ))}
                {logs.length === 0 && <tr><td colSpan="5" className="text-center py-5 text-muted"><i className="bi bi-shield-x fs-1 d-block mb-2"></i>No security events recorded</td></tr>}
              </tbody>
            )}
          </table>
        </div>
      </div>

      <ExportModal 
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Audit Logs Extract"
        columns={[
            { header: 'Timestamp', key: 'Timestamp' },
            { header: 'Identity', key: 'Username' },
            { header: 'Action', key: 'Action' },
            { header: 'Details', key: 'Details' }
        ]}
        data={logs}
        filename="Security_Audit_Logs"
      />
    </div>
  );
}
