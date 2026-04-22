import { useState, useEffect } from 'react';
import { API_BASE } from '../api';

export default function AddEmployeeModal({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    FullName: '',
    Email: '',
    PhoneNumber: '',
    DateOfBirth: '',
    Gender: 'Male',
    DepartmentID: '',
    PositionID: '',
    HireDate: new Date().toISOString().split('T')[0],
    Status: 'Active'
  });

  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Fetch dynamic data for dropdowns
      Promise.all([
        fetch(`${API_BASE}/departments`).then(res => res.json()),
        fetch(`${API_BASE}/positions`).then(res => res.json())
      ]).then(([depts, posts]) => {
        setDepartments(depts);
        setPositions(posts);
      }).catch(err => console.error("Error loading dropdown data:", err));
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    
    fetch(`${API_BASE}/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })
    .then(res => res.json())
    .then(data => {
      setLoading(false);
      if (data.status === 'success') {
        onSave();
        onClose();
        setFormData({
          FullName: '', Email: '', PhoneNumber: '', 
          DateOfBirth: '', Gender: 'Male',
          DepartmentID: '', PositionID: '', 
          HireDate: new Date().toISOString().split('T')[0], 
          Status: 'Active'
        });
      } else {
        alert(data.msg || "Error adding employee");
      }
    })
    .catch(err => {
      setLoading(false);
      alert("Network error");
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal d-block animate-fade-in" style={{ backgroundColor: "rgba(0,0,0,0.4)", zIndex: 1060 }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '20px' }}>
          <div className="modal-header border-0 p-4 pb-0">
            <h4 className="fw-bold mb-0">Add New Employee</h4>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body p-4">
              <div className="row g-3">
                <div className="col-md-12">
                  <label className="form-label small fw-bold text-muted text-uppercase">Full Name</label>
                  <input 
                    type="text" className="form-control form-control-custom" required
                    value={formData.FullName} onChange={e => setFormData({...formData, FullName: e.target.value})}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold text-muted text-uppercase">Email Address</label>
                  <input 
                    type="email" className="form-control form-control-custom" required
                    value={formData.Email} onChange={e => setFormData({...formData, Email: e.target.value})}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold text-muted text-uppercase">Phone Number</label>
                  <input 
                    type="text" className="form-control form-control-custom" 
                    value={formData.PhoneNumber} onChange={e => setFormData({...formData, PhoneNumber: e.target.value})}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold text-muted text-uppercase">Date of Birth</label>
                  <input 
                    type="date" className="form-control form-control-custom" required
                    value={formData.DateOfBirth} onChange={e => setFormData({...formData, DateOfBirth: e.target.value})}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold text-muted text-uppercase">Gender</label>
                  <select 
                    className="form-select form-control-custom" required
                    value={formData.Gender} onChange={e => setFormData({...formData, Gender: e.target.value})}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold text-muted text-uppercase">Department</label>
                  <select 
                    className="form-select form-control-custom" required
                    value={formData.DepartmentID} onChange={e => setFormData({...formData, DepartmentID: e.target.value})}
                  >
                    <option value="">Select Department</option>
                    {departments.map(d => <option key={d.DepartmentID} value={d.DepartmentID}>{d.DepartmentName}</option>)}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold text-muted text-uppercase">Position</label>
                  <select 
                    className="form-select form-control-custom" required
                    value={formData.PositionID} onChange={e => setFormData({...formData, PositionID: e.target.value})}
                  >
                    <option value="">Select Position</option>
                    {positions.map(p => <option key={p.PositionID} value={p.PositionID}>{p.PositionName}</option>)}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold text-muted text-uppercase">Hire Date</label>
                  <input 
                    type="date" className="form-control form-control-custom" required
                    value={formData.HireDate} onChange={e => setFormData({...formData, HireDate: e.target.value})}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold text-muted text-uppercase">Initial Status</label>
                  <div className="d-flex gap-3 mt-2">
                    <div className="form-check">
                      <input 
                        className="form-check-input" type="radio" name="status" id="statusActive" value="Active"
                        checked={formData.Status === 'Active'} onChange={e => setFormData({...formData, Status: e.target.value})}
                      />
                      <label className="form-check-label" htmlFor="statusActive">Active</label>
                    </div>
                    <div className="form-check">
                      <input 
                        className="form-check-input" type="radio" name="status" id="statusOnLeave" value="On Leave"
                        checked={formData.Status === 'On Leave'} onChange={e => setFormData({...formData, Status: e.target.value})}
                      />
                      <label className="form-check-label" htmlFor="statusOnLeave">On Leave</label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer border-0 p-4 pt-0 d-flex justify-content-end gap-2">
              <button type="button" className="btn btn-light px-4 py-2" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary-custom px-4 py-2 shadow-sm" disabled={loading}>
                {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-person-plus-fill me-2"></i>}
                Create Employee
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
