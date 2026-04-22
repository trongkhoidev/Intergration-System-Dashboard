import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { API_BASE } from "../api";

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
    fetch(`${API_BASE}/departments`).then(res => res.json()).then(data => setDepartments(data)).catch(() => {});
    fetch(`${API_BASE}/positions`).then(res => res.json()).then(data => setPositions(data)).catch(() => {});
  }, []);

  const loadEmployee = useCallback(() => {
    fetch(`${API_BASE}/employees/${id}`)
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
    fetch(`${API_BASE}/employees/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
      .then((res) => res.json())
      .then((rs) => {
        setLoading(false);
        if (rs.status === "success") setSuccessModal(true);
        else showToast("error", rs.msg);
      })
      .catch(() => {
        setLoading(false);
        showToast("error", "Network failure. Unable to push updates.");
      });
  };

  if (dataLoading) return <div className="p-5 text-center"><div className="spinner-border text-primary"></div></div>;

  return (
    <div className="pb-5 mx-auto animate-slide-up" style={{ maxWidth: '900px' }}>
      {/* Toast */}
      {toast && (
        <div className="position-fixed top-0 end-0 p-3" style={{ zIndex: 2000 }}>
          <div className={`alert d-flex align-items-center shadow-lg border-0 animate-slide-up p-3 fw-bold severity-critical`} role="alert">
            <i className="bi bi-exclamation-octagon-fill me-2 fs-5"></i> {toast.message}
          </div>
        </div>
      )}

      {/* Success Modal */}
      {successModal && (
        <div className="modal-backdrop-custom animate-fade-in">
           <div className="modal-content-custom bg-white text-center p-5" style={{ maxWidth: '450px' }}>
              <div className="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center mx-auto mb-4 border shadow-sm" style={{ width: '80px', height: '80px' }}>
                 <i className="bi bi-cloud-check-fill fs-1"></i>
              </div>
              <h3 className="fw-bold mb-2">Sync Successful</h3>
              <p className="text-muted small mb-5">Hồ sơ của <strong>{form.FullName}</strong> đã được cập nhật thành công vả đồng bộ trên toàn mạng lưới.</p>
              <button className="btn btn-primary-custom w-100 py-3 fw-bold" onClick={() => nav("/employees")}>Return to Talent Directory</button>
           </div>
        </div>
      )}

      <div className="d-flex align-items-center mb-5 gap-3">
        <Link to="/employees" className="btn btn-icon bg-white border shadow-sm">
          <i className="bi bi-arrow-left"></i>
        </Link>
        <div>
          <h2 className="fw-bold text-dark mb-0 tracking-tight">Technical Profile Update</h2>
          <p className="text-muted extra-small mb-0">Record UUID: <span className="text-primary fw-bold">#{id}</span></p>
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
                 <i className="bi bi-person-circle text-primary"></i> <span className="fw-bold text-dark small text-uppercase ls-wide">Core Personal Data</span>
              </div>
              
              <div className="col-md-6">
                <label className="form-label stat-label small text-uppercase">Full Identity Name</label>
                <input id="FullName" className="form-control form-control-custom" value={form.FullName} onChange={handleChange} required />
              </div>
              <div className="col-md-6">
                <label className="form-label stat-label small text-uppercase">Direct Contact Email</label>
                <input id="Email" type="email" className="form-control form-control-custom" value={form.Email} onChange={handleChange} required />
              </div>

              <div className="col-md-4">
                <label className="form-label stat-label small text-uppercase">Cellular Number</label>
                <input id="PhoneNumber" className="form-control form-control-custom" value={form.PhoneNumber} onChange={handleChange} required />
              </div>
              <div className="col-md-4">
                <label className="form-label stat-label small text-uppercase">Date of Vital Record</label>
                <input type="date" id="DateOfBirth" className="form-control form-control-custom" value={form.DateOfBirth} onChange={handleChange} required />
              </div>
              <div className="col-md-4">
                <label className="form-label stat-label small text-uppercase">Gender Identification</label>
                <select id="Gender" className="form-select form-control-custom" value={form.Gender} onChange={handleChange} required>
                  <option value="Nam">Masculine</option>
                  <option value="Nữ">Feminine</option>
                  <option value="Khác">Other/Diverse</option>
                </select>
              </div>

              <div className="col-12 border-bottom pb-3 mt-5 d-flex align-items-center gap-2">
                 <i className="bi bi-award-fill text-primary"></i> <span className="fw-bold text-dark small text-uppercase ls-wide">Employment & Hierarchy</span>
              </div>

              <div className="col-md-6">
                <label className="form-label stat-label small text-uppercase">Operational Department</label>
                <select id="DepartmentID" className="form-select form-control-custom" value={form.DepartmentID} onChange={handleChange}>
                  <option value="">-- No Sector Assigned --</option>
                  {departments.map((d) => <option key={d.DepartmentID} value={d.DepartmentID}>{d.DepartmentName}</option>)}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label stat-label small text-uppercase">Functional Role</label>
                <select id="PositionID" className="form-select form-control-custom" value={form.PositionID} onChange={handleChange}>
                  <option value="">-- No Seniority Assigned --</option>
                  {positions.map((p) => <option key={p.PositionID} value={p.PositionID}>{p.PositionName}</option>)}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label stat-label small text-uppercase">Hire Initiation Date</label>
                <input type="date" id="HireDate" className="form-control form-control-custom" value={form.HireDate} onChange={handleChange} required />
              </div>
              <div className="col-md-6">
                <label className="form-label stat-label small text-uppercase">System Status</label>
                <select id="Status" className="form-select form-control-custom" value={form.Status} onChange={handleChange}>
                  <option value="Active">Operational / Active</option>
                  <option value="Inactive">Legacy / Inactive</option>
                  <option value="On Leave">Temporary Absence</option>
                </select>
              </div>

              <div className="col-12 mt-5 p-4 rounded-4 bg-light bg-opacity-50 d-flex justify-content-end gap-3 border">
                <Link to="/employees" className="btn btn-white border px-4 fw-bold">Dismiss Changes</Link>
                <button type="submit" className="btn btn-primary-custom px-5 shadow fw-bold" disabled={loading}>
                  {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-save2-fill me-2"></i>}
                  Push Update to Record
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
