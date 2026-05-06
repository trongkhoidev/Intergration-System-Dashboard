import { useState, useEffect } from 'react';
import { API_BASE, fetchAuth } from '../api';

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
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      // Fetch dynamic data for dropdowns using fetchAuth
      Promise.all([
        fetchAuth(`${API_BASE}/departments`).then(res => res.json()),
        fetchAuth(`${API_BASE}/positions`).then(res => res.json())
      ]).then(([depts, posts]) => {
        // Safety check to prevent .map errors
        setDepartments(Array.isArray(depts) ? depts : []);
        setPositions(Array.isArray(posts) ? posts : []);
        
        if (!Array.isArray(depts) || !Array.isArray(posts)) {
          console.error("Invalid data format received from API", { depts, posts });
          setError("Failed to load department or position data. Please check your connection.");
        }
      }).catch(err => {
        console.error("Error loading dropdown data:", err);
        setError("Network error: Could not connect to server.");
      });
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    fetchAuth(`${API_BASE}/employees`, {
      method: 'POST',
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
        setError(data.msg || "Error adding employee");
      }
    })
    .catch(err => {
      setLoading(false);
      setError("Network error occurred while saving.");
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-box animate-in" style={{ maxWidth: 700 }}>
        <div className="modal-header">
          <h4 className="modal-title">
            <i className="bi bi-person-plus-fill me-2 text-primary"></i>
            Add New Employee
          </h4>
          <button type="button" className="btn-icon" onClick={onClose}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="alert-box alert-danger mb-4">
                <i className="bi bi-exclamation-circle-fill"></i>
                {error}
              </div>
            )}
            
            <div className="row g-3">
              <div className="col-md-12">
                <label className="form-label">Full Name</label>
                <input 
                  type="text" className="form-control" required placeholder="e.g. John Doe"
                  value={formData.FullName} onChange={e => setFormData({...formData, FullName: e.target.value})}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Email Address</label>
                <input 
                  type="email" className="form-control" required placeholder="john@example.com"
                  value={formData.Email} onChange={e => setFormData({...formData, Email: e.target.value})}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Phone Number</label>
                <input 
                  type="text" className="form-control" placeholder="+1 (555) 000-0000"
                  value={formData.PhoneNumber} onChange={e => setFormData({...formData, PhoneNumber: e.target.value})}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Date of Birth</label>
                <input 
                  type="date" className="form-control" required
                  value={formData.DateOfBirth} onChange={e => setFormData({...formData, DateOfBirth: e.target.value})}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Gender</label>
                <select 
                  className="form-select" required
                  value={formData.Gender} onChange={e => setFormData({...formData, Gender: e.target.value})}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Department</label>
                <select 
                  className="form-select" required
                  value={formData.DepartmentID} onChange={e => setFormData({...formData, DepartmentID: e.target.value})}
                >
                  <option value="">Select Department</option>
                  {Array.isArray(departments) && departments.map(d => (
                    <option key={d.DepartmentID} value={d.DepartmentID}>{d.DepartmentName}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Position</label>
                <select 
                  className="form-select" required
                  value={formData.PositionID} onChange={e => setFormData({...formData, PositionID: e.target.value})}
                >
                  <option value="">Select Position</option>
                  {Array.isArray(positions) && positions.map(p => (
                    <option key={p.PositionID} value={p.PositionID}>{p.PositionName}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Hire Date</label>
                <input 
                  type="date" className="form-control" required
                  value={formData.HireDate} onChange={e => setFormData({...formData, HireDate: e.target.value})}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Initial Status</label>
                <select 
                  className="form-select" required
                  value={formData.Status} onChange={e => setFormData({...formData, Status: e.target.value})}
                >
                  <option value="Active">Active</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Probation">Probation</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>
          <div className="modal-footer bg-light-subtle">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary px-4" disabled={loading}>
              {loading ? (
                <span className="spinner-border spinner-border-sm me-2"></span>
              ) : (
                <i className="bi bi-check-circle-fill me-2"></i>
              )}
              Create Employee
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
