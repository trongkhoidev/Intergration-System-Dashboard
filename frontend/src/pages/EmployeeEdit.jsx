import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { API_BASE, fetchAuth } from "../api";

export default function EmployeeEdit() {
  const nav = useNavigate();
  const { id } = useParams();
  const [form, setForm] = useState({
    FullName: "",
    DateOfBirth: "",
    Gender: "",
    PhoneNumber: "",
    Email: "",
    HireDate: "",
    DepartmentID: "",
    PositionID: "",
    Status: "",
  });
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  const [toast, setToast] = useState(null);
  const [successModal, setSuccessModal] = useState(false);
  const [errors, setErrors] = useState({});

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.id]: e.target.value });
    if (errors[e.target.id]) {
      setErrors({ ...errors, [e.target.id]: null });
    }
  };

  const convertDate = (dt) => {
    if (!dt) return "";
    return new Date(dt).toISOString().substring(0, 10);
  };

  const loadDropdowns = useCallback(() => {
    Promise.all([
      fetchAuth(`${API_BASE}/departments`).then(res => res.json()),
      fetchAuth(`${API_BASE}/positions`).then(res => res.json())
    ]).then(([depts, posts]) => {
      setDepartments(depts);
      setPositions(posts);
    }).catch(() => {});
  }, []);

  const loadEmployee = useCallback(() => {
    fetchAuth(`${API_BASE}/employees/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.msg === "Employee not found") {
           nav("/employees");
           return;
        }
        setForm({
          FullName: data.FullName || "",
          DateOfBirth: convertDate(data.DateOfBirth),
          Gender: data.Gender || "",
          PhoneNumber: data.PhoneNumber || "",
          Email: data.Email || "",
          HireDate: convertDate(data.HireDate),
          DepartmentID: data.DepartmentID ?? "",
          PositionID: data.PositionID ?? "",
          Status: data.Status || "Active",
        });
        setDataLoading(false);
      })
      .catch(() => setDataLoading(false));
  }, [id, nav]);

  useEffect(() => { loadDropdowns(); loadEmployee(); }, [loadDropdowns, loadEmployee]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    fetchAuth(`${API_BASE}/employees/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
      .then((res) => res.json())
      .then((rs) => {
        setLoading(false);
        if (rs.status === "success") {
            showToast("success", "Employee profile updated successfully!");
            setTimeout(() => nav("/employees"), 1500); 
        } else {
            showToast("error", rs.msg);
        }
      })
      .catch(() => {
        setLoading(false);
        showToast("error", "Server connection error. Update failed.");
      });
  };

  if (dataLoading) return <div className="p-5 text-center"><div className="spinner-border text-primary"></div></div>;

  return (
    <div className="pb-5 mx-auto animate-slide-up" style={{ maxWidth: '900px' }}>
      {/* Toast Notification */}
      {toast && (
        <div className="toast-container" style={{ top: 80, right: 30 }}>
          <div className={`toast-premium alert-${toast.type === 'success' ? 'success' : 'danger'}`}>
            <i className={`bi bi-${toast.type === 'success' ? 'check-circle-fill' : 'exclamation-triangle-fill'}`}></i>
            <div>
              <div className="fw-bold">{toast.type === 'success' ? 'Success' : 'Error Occurred'}</div>
              <div className="small text-muted">{toast.message}</div>
            </div>
          </div>
        </div>
      )}

      <div className="d-flex align-items-center mb-5 gap-3">
        <Link to="/employees" className="btn btn-icon bg-white border shadow-sm">
          <i className="bi bi-arrow-left"></i>
        </Link>
        <div>
          <h2 className="fw-bold text-dark mb-0 tracking-tight">Edit Employee Profile</h2>
          <p className="text-muted extra-small mb-0">Employee ID: <span className="text-primary fw-bold">#{id}</span></p>
        </div>
      </div>

      <div className="card-custom p-0 border-0 shadow-sm glass-card overflow-hidden">
        {/* Profile Ribbon */}
        <div style={{ height: '120px', background: 'linear-gradient(90deg, #4f46e5 0%, #6366f1 100%)' }}></div>
        
        <div className="px-5 pb-5" style={{ marginTop: '-40px' }}>
          <div className="d-flex align-items-end mb-5">
             <div className="bg-white p-1 rounded-4 shadow-sm me-4">
                <div className="bg-light rounded-4 d-flex align-items-center justify-content-center fw-bold text-primary" style={{ width: '100px', height: '100px', fontSize: '2.5rem', border: '2px solid var(--border-color)' }}>
                   {form.FullName.charAt(0)}
                </div>
             </div>
             <div className="pb-2">
                <h3 className="fw-bold mb-1 text-dark">{form.FullName}</h3>
                <span className="badge-custom badge-active">ID Integration Verified</span>
             </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="row g-5">
              <div className="col-12 border-bottom pb-3 d-flex align-items-center gap-2">
                 <i className="bi bi-person-circle text-primary"></i> <span className="fw-bold text-dark small text-uppercase ls-wide">Personal Information</span>
              </div>
              
              <div className="col-md-6">
                <label className="form-label stat-label small text-uppercase">Full Name</label>
                <input id="FullName" className="form-control form-control-custom" value={form.FullName} onChange={handleChange} required />
              </div>
              <div className="col-md-6">
                <label className="form-label stat-label small text-uppercase">Email Address</label>
                <input id="Email" type="email" className="form-control form-control-custom" value={form.Email} onChange={handleChange} required />
              </div>

              <div className="col-md-4">
                <label className="form-label stat-label small text-uppercase">Phone Number</label>
                <input id="PhoneNumber" className="form-control form-control-custom" value={form.PhoneNumber} onChange={handleChange} required />
              </div>
              <div className="col-md-4">
                <label className="form-label stat-label small text-uppercase">Date of Birth</label>
                <input type="date" id="DateOfBirth" className="form-control form-control-custom" value={form.DateOfBirth} onChange={handleChange} required />
              </div>
              <div className="col-md-4">
                <label className="form-label stat-label small text-uppercase">Gender</label>
                <select id="Gender" className="form-select form-control-custom" value={form.Gender} onChange={handleChange} required>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="col-12 border-bottom pb-3 mt-5 d-flex align-items-center gap-2">
                 <i className="bi bi-award-fill text-primary"></i> <span className="fw-bold text-dark small text-uppercase ls-wide">Employment Information</span>
              </div>

              <div className="col-md-6">
                <label className="form-label stat-label small text-uppercase">Department</label>
                <select id="DepartmentID" className="form-select form-control-custom" value={form.DepartmentID} onChange={handleChange}>
                  <option value="">-- Unassigned --</option>
                  {departments.map((d) => <option key={d.DepartmentID} value={d.DepartmentID}>{d.DepartmentName}</option>)}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label stat-label small text-uppercase">Position</label>
                <select id="PositionID" className="form-select form-control-custom" value={form.PositionID} onChange={handleChange}>
                  <option value="">-- Unassigned --</option>
                  {positions.map((p) => <option key={p.PositionID} value={p.PositionID}>{p.PositionName}</option>)}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label stat-label small text-uppercase">Hire Date</label>
                <input type="date" id="HireDate" className="form-control form-control-custom" value={form.HireDate} onChange={handleChange} required />
              </div>
              <div className="col-md-6">
                <label className="form-label stat-label small text-uppercase">Employment Status</label>
                <select id="Status" className="form-select form-control-custom" value={form.Status} onChange={handleChange}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Probation">Probation</option>
                  <option value="Intern">Intern</option>
                </select>
              </div>

              <div className="col-12 mt-5 p-4 rounded-4 bg-light bg-opacity-50 d-flex justify-content-end gap-3 border">
                <Link to="/employees" className="btn btn-outline px-4 fw-bold">Cancel</Link>
                <button type="submit" className="btn btn-primary px-5 shadow fw-bold" disabled={loading}>
                  {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-save2-fill me-2"></i>}
                  Update Profile
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
