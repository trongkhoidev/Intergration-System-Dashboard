import { useState } from 'react';

export default function AlertDetailPanel({ alert, onClose, onAction }) {
  const [note, setNote] = useState('');

  if (!alert) return null;

  const handleAction = (type) => {
    // Logic for different actions
    if (type === 'Dismiss') onAction(alert.id || alert.message);
    else {
      alert(`Action "${type}" triggered for this alert.`);
    }
  };

  return (
    <div className="card border-0 shadow-sm h-100 animate-fade-in bg-white">
      <div className="p-4 border-bottom d-flex align-items-center justify-content-between">
        <h5 className="fw-bold m-0 text-primary">Employee Alert Details</h5>
        <button className="btn-icon" onClick={onClose}><i className="bi bi-x-lg"></i></button>
      </div>

      <div className="p-4">
        <div className={`alert-box alert-${alert.severity === 'critical' ? 'danger' : alert.severity === 'warning' ? 'warning' : 'info'} mb-4`}>
          <div className="d-flex align-items-center gap-3 mb-3">
            <div className="avatar bg-white shadow-sm">
              <i className={`bi ${alert.type === 'Salary' ? 'bi-cash-stack' : 'bi-exclamation-octagon-fill'}`}></i>
            </div>
            <div>
              <div className="fw-bold text-uppercase small ls-1">{alert.type} Alert</div>
              <div className="small opacity-75">{alert.date}</div>
            </div>
          </div>
          <p className="fw-bold m-0 lh-base">{alert.message}</p>
        </div>

        {/* Example comparison data for Salary anomalies */}
        {alert.type === 'Salary' && (
          <div className="bg-light p-3 rounded-4 mb-4 border">
            <div className="small fw-bold text-muted text-uppercase mb-3">Salary Comparison</div>
            <div className="d-flex justify-content-between mb-2">
              <span className="text-muted">Previous Salary</span>
              <span className="fw-bold text-dark">$4,200</span>
            </div>
            <div className="d-flex justify-content-between mb-3 pb-3 border-bottom">
              <span className="text-muted">Current Salary</span>
              <span className="fw-bold text-danger">$5,800 (+38%)</span>
            </div>
            <div className="small text-muted italic">Reason: Unusual manual adjustment detected in payroll cycle Oct 2023.</div>
          </div>
        )}

        <div className="mb-4">
          <label className="form-label small fw-bold text-muted">Resolution Notes</label>
          <textarea 
            className="form-control" 
            rows="3" 
            placeholder="Add a note or investigation result..."
            value={note}
            onChange={e => setNote(e.target.value)}
          ></textarea>
        </div>

        <div className="d-grid gap-2">
          <div className="row g-2">
            <div className="col-6">
              <button className="btn btn-outline w-100 py-2 fw-bold" onClick={() => handleAction('Investigate')}>
                <i className="bi bi-search me-2"></i> Investigate
              </button>
            </div>
            <div className="col-6">
              <button className="btn btn-outline w-100 py-2 fw-bold" onClick={() => handleAction('Forward')}>
                <i className="bi bi-reply-all me-2"></i> Forward
              </button>
            </div>
          </div>
          <button className="btn btn-primary w-100 py-2 fw-bold" onClick={() => handleAction('Add Note')}>
            <i className="bi bi-sticky me-2"></i> Add Note
          </button>
          <button className="btn btn-danger w-100 py-2 fw-bold" onClick={() => handleAction('Dismiss')}>
            <i className="bi bi-check-lg me-2"></i> Dismiss Alert
          </button>
        </div>
      </div>
    </div>
  );
}
