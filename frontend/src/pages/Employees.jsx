import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE, fetchAuth } from '../api';
import { getCurrentUser } from '../utils/auth';
import AddEmployeeModal from '../components/AddEmployeeModal';

function StatusBadge({ status }) {
  const map = {
    'Active': 'badge-active',
    'Inactive': 'badge-inactive',
    'On Leave': 'badge-leave',
    'Probation': 'badge-probation',
  };
  return <span className={`badge ${map[status] || 'badge-inactive'}`}>{status || 'Unknown'}</span>;
}

export default function Employees() {
  const user = getCurrentUser();
  const role = user.role?.toLowerCase();
  // Admin & HR can create/edit/delete. Payroll is read-only.
  const canEdit = ['admin', 'hr'].includes(role);
  const canDelete = ['admin', 'hr'].includes(role);

  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const PER_PAGE = 10;

  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetchAuth(`${API_BASE}/employees`).then(r => r.json()),
      fetchAuth(`${API_BASE}/departments`).then(r => r.json()),
      fetchAuth(`${API_BASE}/positions`).then(r => r.json()),
    ]).then(([emps, depts, posts]) => {
      setEmployees(Array.isArray(emps) ? emps : []);
      setDepartments(Array.isArray(depts) ? depts : []);
      setPositions(Array.isArray(posts) ? posts : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setCurrentPage(1); }, [search, filterDept, filterStatus]);

  const filtered = employees.filter(e => {
    const term = search.toLowerCase();
    const matchSearch = !search ||
      e.FullName?.toLowerCase().includes(term) ||
      e.EmployeeID?.toString().includes(term) ||
      e.Department?.toLowerCase().includes(term);
    const matchDept = !filterDept || e.Department === filterDept;
    const matchStatus = !filterStatus || e.Status === filterStatus;
    return matchSearch && matchDept && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  const confirmDelete = () => {
    if (!deleteTarget) return;
    fetchAuth(`${API_BASE}/employees/${deleteTarget.id}`, { method: 'DELETE' })
      .then(r => r.json())
      .then(rs => {
        setDeleteTarget(null);
        if (rs.status === 'success') {
          showToast('success', 'Employee deactivated successfully');
          load();
        } else {
          showToast('error', rs.msg || 'Cannot delete employee');
        }
      })
      .catch(() => { setDeleteTarget(null); showToast('error', 'Server error'); });
  };

  return (
    <div className="animate-fade-in">
      {/* Toast Notification */}
      {toast && (
        <div className="toast-container" style={{ top: 80, right: 30 }}>
          <div className={`toast-premium alert-${toast.type === 'success' ? 'success' : 'danger'}`}>
            <i className={`bi bi-${toast.type === 'success' ? 'check-circle-fill' : 'exclamation-triangle-fill'}`}></i>
            <div>
              <div className="fw-bold">{toast.type === 'success' ? 'Success' : 'Attention'}</div>
              <div className="small opacity-75">{toast.msg}</div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="modal-overlay">
          <div className="modal-box animate-in" style={{ maxWidth: 420 }}>
            <div className="modal-body p-5 text-center">
              <div className="avatar bg-danger-light text-danger mb-4" style={{ width: 80, height: 80, fontSize: '2rem', margin: '0 auto' }}>
                <i className="bi bi-person-x-fill"></i>
              </div>
              <h4 className="fw-bold mb-2">Deactivate Employee</h4>
              <p className="text-muted mb-4">
                Are you sure you want to deactivate <strong>{deleteTarget.name}</strong>? This action will set their status to Inactive.
              </p>
              <div className="d-flex gap-2 justify-content-center">
                <button className="btn btn-outline px-4" onClick={() => setDeleteTarget(null)}>Cancel</button>
                <button className="btn btn-danger px-4" onClick={confirmDelete}>Confirm</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      <AddEmployeeModal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={() => { showToast('success', 'Employee added successfully!'); load(); }}
      />

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Directory</h1>
          <p className="page-subtitle">Manage and monitor all staff members</p>
        </div>
        <div className="d-flex gap-2">
           <button className="btn btn-outline" onClick={load}>
            <i className="bi bi-arrow-clockwise"></i>
          </button>
          {canEdit && (
            <button className="btn btn-premium px-4" onClick={() => setAddOpen(true)}>
              <i className="bi bi-person-plus-fill me-2"></i> Add New Employee
            </button>
          )}
        </div>
      </div>

      {/* Stats Summary Area */}
      <div className="row g-4 mb-4">
        <div className="col-md-3">
          <div className="stat-card">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <div className="stat-card-label">Total Staff</div>
                <div className="stat-card-value">{employees.length}</div>
              </div>
              <div className="stat-card-icon bg-primary-light text-primary">
                <i className="bi bi-people-fill"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="stat-card">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <div className="stat-card-label">Active</div>
                <div className="stat-card-value text-success">{employees.filter(e => e.Status === 'Active').length}</div>
              </div>
              <div className="stat-card-icon bg-success-light text-success">
                <i className="bi bi-person-check-fill"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="stat-card">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <div className="stat-card-label">On Leave</div>
                <div className="stat-card-value text-warning">{employees.filter(e => e.Status === 'On Leave').length}</div>
              </div>
              <div className="stat-card-icon bg-warning-light text-warning">
                <i className="bi bi-person-dash-fill"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="stat-card">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <div className="stat-card-label">Departments</div>
                <div className="stat-card-value text-info">{departments.length}</div>
              </div>
              <div className="stat-card-icon bg-info-light text-info">
                <i className="bi bi-building"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="card p-0 border-0 shadow-sm overflow-hidden">
        {/* Filter Toolbar */}
        <div className="p-4 border-bottom bg-white d-flex flex-wrap gap-3 align-items-center justify-content-between">
          <div className="search-wrapper" style={{ minWidth: 300 }}>
            <i className="bi bi-search search-icon"></i>
            <input
              type="text"
              className="form-control ps-5"
              placeholder="Search name, ID or department..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="d-flex gap-2">
            <select className="form-select w-auto" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
              <option value="">All Departments</option>
              {departments.map(d => <option key={d.DepartmentID} value={d.DepartmentName}>{d.DepartmentName}</option>)}
            </select>
            <select className="form-select w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="On Leave">On Leave</option>
              <option value="Probation">Probation</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th className="ps-4">Employee</th>
                <th>Contact</th>
                <th>Department & Position</th>
                <th>Status</th>
                <th className="pe-4 text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i}>
                    <td className="ps-4"><div className="skeleton" style={{ height: 40, width: 200 }}></div></td>
                    <td><div className="skeleton" style={{ height: 16, width: 150 }}></div></td>
                    <td><div className="skeleton" style={{ height: 16, width: 180 }}></div></td>
                    <td><div className="skeleton" style={{ height: 24, width: 80, borderRadius: 20 }}></div></td>
                    <td className="pe-4 text-end"><div className="skeleton" style={{ height: 32, width: 100, float: 'right' }}></div></td>
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-5">
                    <div className="text-muted mb-2"><i className="bi bi-inbox fs-1"></i></div>
                    <div className="fw-bold">No results found</div>
                    <div className="small opacity-75">Try adjusting your search or filters</div>
                  </td>
                </tr>
              ) : (
                paginated.map(emp => (
                  <tr key={emp.EmployeeID}>
                    <td className="ps-4">
                      <div className="d-flex align-items-center gap-3">
                        <div className="avatar bg-primary-light text-primary fw-bold">
                          {emp.FullName?.charAt(0)}
                        </div>
                        <div>
                          <div className="fw-bold text-dark">#{emp.EmployeeID} - {emp.FullName}</div>
                          <div className="small text-muted">{emp.Gender} • Joined {emp.HireDate ? new Date(emp.HireDate).toLocaleDateString() : 'N/A'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="small">
                         <div className="text-dark"><i className="bi bi-envelope me-1"></i> {emp.Email}</div>
                         <div className="text-muted"><i className="bi bi-phone me-1"></i> {emp.PhoneNumber || 'N/A'}</div>
                      </div>
                    </td>
                    <td>
                      <div className="fw-600 text-dark">{emp.Department || '—'}</div>
                      <div className="small text-muted">{emp.Position || '—'}</div>
                    </td>
                    <td><StatusBadge status={emp.Status} /></td>
                    <td className="pe-4 text-end">
                      <div className="d-flex gap-2 justify-content-end">
                        <Link to={`/employees/${emp.EmployeeID}`} className="btn-icon" data-tooltip="View Details">
                          <i className="bi bi-eye"></i>
                        </Link>
                        {canEdit && (
                          <>
                            <Link to={`/employees/${emp.EmployeeID}`} className="btn-icon" data-tooltip="Edit Information">
                              <i className="bi bi-pencil"></i>
                            </Link>
                            {canDelete && (
                              <button
                                className="btn-icon text-danger"
                                onClick={() => setDeleteTarget({ id: emp.EmployeeID, name: emp.FullName })}
                              >
                                <i className="bi bi-trash3"></i>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="p-4 border-top d-flex align-items-center justify-content-between bg-light-subtle">
            <div className="small text-muted">
              Showing <strong>{((currentPage - 1) * PER_PAGE) + 1}</strong> to <strong>{Math.min(currentPage * PER_PAGE, filtered.length)}</strong> of <strong>{filtered.length}</strong> employees
            </div>
            <div className="d-flex gap-1">
              <button className="page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                <i className="bi bi-chevron-left"></i>
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button 
                  key={i} 
                  className={`page-btn ${currentPage === i + 1 ? 'active' : ''}`} 
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              <button className="page-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                <i className="bi bi-chevron-right"></i>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
