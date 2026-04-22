import { useState } from 'react';

export default function AlertDetailPanel({ alert, onClose, onAction }) {
  const [actionDone, setActionDone] = useState(null);

  if (!alert) return null;

  const handleAction = (type) => {
    setActionDone(type);
    setTimeout(() => {
        if (type === 'Resolve') onAction(alert.id || alert.message);
        setActionDone(null);
    }, 1500);
  };

  return (
    <>
      <div className="modal-backdrop-custom animate-fade-in" onClick={onClose}></div>
      
      <div className="side-drawer shadow-lg animate-slide-in-right glass-card">
         <div className="side-drawer-header px-4 py-4 border-bottom d-flex align-items-center justify-content-between">
            <h5 className="fw-bold mb-0">Anomaly Inspection</h5>
            <button className="btn-close-custom" onClick={onClose}><i className="bi bi-x-lg"></i></button>
         </div>

         <div className="side-drawer-body p-4">
            {actionDone ? (
               <div className="text-center py-5 animate-scale-in">
                  <div className="bg-success bg-opacity-10 text-success rounded-circle d-flex align-items-center justify-content-center mx-auto mb-4" style={{ width: '80px', height: '80px' }}>
                     <i className="bi bi-check-lg display-5"></i>
                  </div>
                  <h4 className="fw-bold mb-1">Status Finalized</h4>
                  <p className="text-muted extra-small">Protocol {actionDone} has been registered successfully.</p>
               </div>
            ) : (
               <>
                  <div className={`p-4 rounded-4 mb-5 shadow-sm severity-${alert.severity}`} style={{ borderLeftWidth: '5px' }}>
                     <div className="d-flex align-items-center gap-3 mb-4">
                        <div className="bg-white rounded-circle p-2 d-flex align-items-center justify-content-center shadow-sm" style={{ width: '50px', height: '50px' }}>
                           <i className={`bi ${alert.type === 'Birthday' ? 'bi-gift' : 'bi-lightning-fill'} fs-4`}></i>
                        </div>
                        <div>
                           <div className="fw-bold text-dark text-uppercase extra-small ls-wide mb-1">{alert.type} CATEGORY</div>
                           <div className="h5 fw-bold text-dark mb-0">{alert.severity} PRIORITY</div>
                        </div>
                     </div>
                     <p className="fw-medium text-dark-emphasis mb-0 lh-base">{alert.message}</p>
                  </div>

                  <div className="mb-5">
                     <div className="stat-label small text-uppercase fw-bold ls-wide mb-3 opacity-50">Operational Timeline</div>
                     <div className="d-flex align-items-center p-3 rounded-4 bg-light bg-opacity-50 border">
                        <i className="bi bi-clock-history me-3 text-primary fs-5"></i>
                        <div>
                           <div className="fw-bold text-dark small">Detected: {alert.date}</div>
                           <div className="extra-small text-muted">Awaiting resolution command</div>
                        </div>
                     </div>
                  </div>

                  <div className="mt-auto d-grid gap-2">
                     <button className="btn btn-primary-custom py-3 fw-bold" onClick={() => handleAction('Resolve')}>
                        <i className="bi bi-shield-check me-2"></i> Mark as Resolved
                     </button>
                     <button className="btn btn-white border py-3 fw-bold text-muted" onClick={() => handleAction('Flag')}>
                        <i className="bi bi-flag-fill me-2"></i> Flag for Follow-up
                     </button>
                     <button className="btn btn-light py-2 px-3 fw-bold mt-3 text-danger border-0 bg-transparent" onClick={onClose}>
                        Close Inspection
                     </button>
                  </div>
               </>
            )}
         </div>
      </div>
    </>
  );
}
