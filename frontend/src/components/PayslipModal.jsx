import React from 'react';

export default function PayslipModal({ isOpen, onClose, data }) {
  if (!isOpen || !data) return null;

  return (
    <div className="modal d-block animate-fade-in" style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1060 }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '20px', overflow: 'hidden' }}>
          
          <div className="modal-header bg-primary bg-gradient text-white border-0 p-4 align-items-center">
            <div>
              <h4 className="fw-bold mb-1">Payroll Summary</h4>
              <p className="mb-0 text-white-50 small fw-bold text-uppercase tracking-tight">{data.MonthYear}</p>
            </div>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>
          
          <div className="modal-body p-4 bg-light">
            <div className="text-center mb-4 mt-2">
              <div className="rounded-circle bg-white shadow-sm border d-flex align-items-center justify-content-center fw-bold mx-auto mb-3" style={{ width: '70px', height: '70px', color: 'var(--primary-color)', fontSize: '28px' }}>
                {data.FullName.charAt(0)}
              </div>
              <h5 className="fw-bold text-dark mb-1">{data.FullName}</h5>
              <span className="badge bg-success bg-opacity-10 text-success fw-bold px-3 py-2 rounded-pill mt-1 border border-success border-opacity-25">
                <i className="bi bi-check-circle-fill me-1"></i> Verified & Distributed
              </span>
            </div>
            
            <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-3">
              <div className="card-body p-0">
                <ul className="list-group list-group-flush">
                  <li className="list-group-item d-flex justify-content-between align-items-center p-3 border-bottom-0">
                    <span className="text-muted fw-bold small text-uppercase">Base Salary</span>
                    <span className="fw-bold text-dark">${data.BaseSalary?.toLocaleString()}</span>
                  </li>
                  <li className="list-group-item d-flex justify-content-between align-items-center p-3 bg-success bg-opacity-10 border-bottom-0">
                    <span className="text-success fw-bold small text-uppercase flex-grow-1"><i className="bi bi-arrow-up-right me-1"></i> Bonuses</span>
                    <span className="fw-bold text-success">+${data.Bonus?.toLocaleString()}</span>
                  </li>
                  <li className="list-group-item d-flex justify-content-between align-items-center p-3 bg-danger bg-opacity-10">
                    <span className="text-danger fw-bold small text-uppercase"><i className="bi bi-arrow-down-right me-1"></i> Deductions/Taxes</span>
                    <span className="fw-bold text-danger">-${data.Deductions?.toLocaleString()}</span>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-white rounded-4 border shadow-sm d-flex justify-content-between align-items-center">
              <div>
                <span className="text-muted small fw-bold d-block text-uppercase">Net Distribution</span>
                <span className="text-dark extra-small">To standard bank account</span>
              </div>
              <span className="fw-bold text-primary" style={{ fontSize: '1.75rem' }}>${data.TotalSalary?.toLocaleString()}</span>
            </div>
          </div>
          
          <div className="modal-footer border-0 p-4 bg-light d-flex justify-content-end border-top">
            <button className="btn btn-white shadow-sm border w-100 fw-bold py-2 d-flex justify-content-center align-items-center gap-2 text-dark hover-primary" onClick={() => window.print()}>
              <i className="bi bi-printer"></i> Print Digital Slip
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
}
