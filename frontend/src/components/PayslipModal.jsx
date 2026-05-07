import React from 'react';

export default function PayslipModal({ isOpen, onClose, data }) {
  if (!isOpen || !data) return null;

  const formatVND = (value) => {
    const number = Number(value || 0);
    return `${number.toLocaleString('vi-VN')} VND`;
  };

  return (
    <div className="modal d-block animate-fade-in" style={{ backgroundColor: "rgba(15, 23, 42, 0.4)", backdropFilter: 'blur(8px)', zIndex: 1060 }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '24px', overflow: 'hidden', background: 'rgba(255, 255, 255, 0.95)' }}>
          
          <div className="modal-header border-0 p-4 align-items-center" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #2563eb 100%)', color: '#fff' }}>
            <div>
              <h5 className="fw-800 mb-0" style={{ letterSpacing: '-0.02em' }}>Payroll Summary</h5>
              <div className="d-flex align-items-center gap-2 mt-1">
                <span className="badge badge-probation text-white border-white border-opacity-25" style={{ fontSize: '0.65rem' }}>{data.MonthYear}</span>
                <span className="small opacity-75 fw-500">Official Digital Slip</span>
              </div>
            </div>
            <button type="button" className="btn-close btn-close-white opacity-100" onClick={onClose} style={{ boxShadow: 'none' }}></button>
          </div>
          
          <div className="modal-body p-4">
            <div className="text-center mb-4">
              <div className="avatar bg-vivid-blue mx-auto mb-3" style={{ width: '64px', height: '64px', fontSize: '1.5rem' }}>
                {data.FullName?.charAt(0)}
              </div>
              <h5 className="fw-800 text-dark mb-0">{data.FullName}</h5>
              <p className="text-muted small fw-600 mb-2">{data.DepartmentName || 'Department Unassigned'}</p>
              <span className="badge bg-vivid-green px-3 py-2 rounded-pill" style={{ fontSize: '0.7rem' }}>
                <i className="bi bi-patch-check-fill me-1"></i> VERIFIED & DISTRIBUTED
              </span>
            </div>
            
            <div className="card border-0 shadow-sm mb-4" style={{ background: '#f8fafc', borderRadius: '16px' }}>
              <div className="p-3">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span className="text-muted small fw-700 text-uppercase letter-spacing-1">Base Salary</span>
                  <span className="fw-700 text-dark">{formatVND(data.BaseSalary)}</span>
                </div>
                
                <div className="d-flex justify-content-between align-items-center mb-3 p-2 rounded-3" style={{ background: 'rgba(16, 185, 129, 0.08)' }}>
                  <span className="text-success small fw-700 text-uppercase"><i className="bi bi-plus-circle-fill me-2"></i>Total Bonuses</span>
                  <span className="fw-800 text-success">+{formatVND(data.Bonus)}</span>
                </div>
                
                <div className="d-flex justify-content-between align-items-center p-2 rounded-3" style={{ background: 'rgba(239, 68, 68, 0.08)' }}>
                  <span className="text-danger small fw-700 text-uppercase"><i className="bi bi-dash-circle-fill me-2"></i>Deductions/Tax</span>
                  <span className="fw-800 text-danger">-{formatVND(data.Deductions)}</span>
                </div>
              </div>
            </div>
            
            <div className="p-4 rounded-4 text-center" style={{ background: 'linear-gradient(135deg, #f0f7ff 0%, #e0efff 100%)', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
              <span className="text-muted small fw-700 text-uppercase d-block mb-1">Net Distribution</span>
              <h2 className="fw-900 text-primary mb-0" style={{ letterSpacing: '-0.04em' }}>{formatVND(data.TotalSalary)}</h2>
              <p className="text-muted extra-small mt-2 mb-0 fw-500">Transferred to registered bank account</p>
            </div>
          </div>
          
          <div className="modal-footer border-0 p-4 d-flex gap-2">
            <button className="btn btn-outline flex-1 py-2 fw-700" onClick={onClose}>
              Dismiss
            </button>
            <button className="btn btn-primary flex-1 py-2 fw-700 shadow-sm" onClick={() => window.print()}>
              <i className="bi bi-printer me-2"></i> Print Slip
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
}

