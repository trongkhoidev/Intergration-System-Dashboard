import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import AddEmployeeModal from "../components/AddEmployeeModal";
import ExportModal from "../components/ExportModal";
import Skeleton, { TableSkeleton } from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
import { API_BASE } from "../api";

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // States for features
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterPosition, setFilterPosition] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // State for modals/notifications
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const loadEmployees = useCallback(() => {
    setLoading(true);
    fetch(`${API_BASE}/employees`)
      .then((res) => res.json())
      .then((data) => {
        setEmployees(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Lỗi:", err);
        setLoading(false);
        showToast("error", "Failed to connect to authentication server");
      });
  }, []);

  const loadFilters = useCallback(() => {
    Promise.all([
      fetch(`${API_BASE}/departments`).then(res => res.json()),
      fetch(`${API_BASE}/positions`).then(res => res.json())
    ]).then(([depts, posts]) => {
      setDepartments(depts);
      setPositions(posts);
    }).catch(err => console.error("Error loading dropdown data:", err));
  }, []);

  useEffect(() => {
    loadEmployees();
    loadFilters();
  }, [loadEmployees, loadFilters]);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;

    fetch(`${API_BASE}/employees/${deleteTarget.id}`, {
      method: "DELETE",
    })
      .then((res) => res.json())
      .then((rs) => {
        setDeleteTarget(null);
        if (rs.status === "success") {
          showToast("success", "Employee deleted successfully");
          loadEmployees();
        } else {
          showToast("error", rs.msg || "Unable to delete employee records");
        }
      })
      .catch((err) => {
        setDeleteTarget(null);
        showToast("error", "Server communication error on delete");
      });
  };

  const filteredEmployees = employees.filter((emp) => {
    const term = searchQuery.toLowerCase();
    const matchSearch = (
      emp.FullName?.toLowerCase().includes(term) ||
      emp.EmployeeID?.toString().includes(term)
    );
    const matchDept = !filterDept || emp.Department === filterDept;
    const matchPos = !filterPosition || emp.Position === filterPosition;
    const matchStatus = !filterStatus || emp.Status === filterStatus;

    return matchSearch && matchDept && matchPos && matchStatus;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredEmployees.slice(indexOfFirstItem, indexOfLastItem);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterDept, filterPosition, filterStatus]);

  return (
    <div className="pb-5">
      <AddEmployeeModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSave={() => { showToast('success', 'New talent added seamlessly!'); loadEmployees(); }}
      />

      <ExportModal 
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Organizational Directory Report"
        columns={[{ header: 'ID', key: 'EmployeeID' }, { header: 'Full Name', key: 'FullName' }, { header: 'Department', key: 'Department' }, { header: 'Status', key: 'Status' }]}
        data={filteredEmployees}
        filename="Directory_Master"
      />

      {/* Toast Notification */}
      {toast && (
        <div className="position-fixed top-0 end-0 p-3" style={{ zIndex: 2000 }}>
          <div className={`alert d-flex align-items-center shadow-lg border-0 animate-slide-up p-3 fw-bold severity-${toast.type === 'success' ? 'info' : 'critical'}`} role="alert" style={{ borderRadius: '12px' }}>
            <i className={`bi bi-${toast.type === 'success' ? 'check-circle-fill' : 'exclamation-triangle-fill'} me-2 fs-5`}></i>
            {toast.message}
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="modal-backdrop-custom animate-fade-in">
          <div className="modal-content-custom bg-white">
            <div className="modal-body-custom text-center">
              <div className="bg-danger bg-opacity-10 text-danger rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style={{ width: '70px', height: '70px' }}>
                <i className="bi bi-trash3-fill fs-2"></i>
              </div>
              <h4 className="fw-bold mb-2">Delete Employee?</h4>
              <p className="text-muted small mb-4">You are about to remove <strong>{deleteTarget.name}</strong> from all systems. This is an irreversible action.</p>
              <div className="d-grid gap-2">
                <button className="btn btn-danger py-2 fw-bold" onClick={confirmDelete}>Confirm Permanent Deletion</button>
                <button className="btn btn-light py-2 border-0 text-muted" onClick={() => setDeleteTarget(null)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-5 animate-slide-up">
        <div>
          <h2 className="fw-bold text-dark mb-1 tracking-tight">Talent Directory</h2>
          <p className="text-muted small mb-0">Total of {employees.length} enterprise members identified.</p>
        </div>
        <div className="d-flex gap-2">
            <button onClick={() => setIsExportModalOpen(true)} className="btn btn-white border px-3 shadow-sm d-flex align-items-center gap-2 fw-bold">
                <i className="bi bi-arrow-up-right-circle text-primary"></i> Export
            </button>
            <button onClick={() => setIsAddModalOpen(true)} className="btn btn-primary-custom px-3 shadow-sm fw-bold">
                <i className="bi bi-plus-lg me-1"></i> Add Member
            </button>
        </div>
      </div>

      <div className="table-container p-0 border-0 shadow-sm animate-slide-up glass-card" style={{ animationDelay: '0.1s' }}>
        {/* Filter Bar */}
        <div className="filter-bar">
          <div className="search-input-wrapper">
            <i className="bi bi-search position-absolute top-50 translate-middle-y ms-3 text-muted"></i>
            <input
              type="text"
              placeholder="Filter by name, ID or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select className="form-select form-control-custom w-auto border-0 bg-light" style={{ minWidth: '180px' }} value={filterDept} onChange={e => setFilterDept(e.target.value)}>
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.DepartmentID} value={d.DepartmentName}>{d.DepartmentName}</option>)}
          </select>
          <select className="form-select form-control-custom w-auto border-0 bg-light" style={{ minWidth: '180px' }} value={filterPosition} onChange={e => setFilterPosition(e.target.value)}>
            <option value="">All Positions</option>
            {positions.map(p => <option key={p.PositionID} value={p.PositionName}>{p.PositionName}</option>)}
          </select>
          <select className="form-select form-control-custom w-auto border-0 bg-light" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="On Leave">On Leave</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <div className="table-responsive">
          <table className="table-custom">
            <thead>
              <tr>
                <th>Identity</th>
                <th>Unit & Role</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            {loading ? (
              <TableSkeleton rows={7} columns={4} />
            ) : (
              <tbody>
                {currentItems.map((emp) => (
                  <tr key={emp.EmployeeID}>
                    <td>
                      <div className="d-flex align-items-center gap-3">
                        <div className="rounded-circle bg-primary bg-opacity-10 d-flex align-items-center justify-content-center fw-bold" style={{ width: '42px', height: '42px', color: 'var(--primary-color)' }}>
                          {emp.FullName.charAt(0)}
                        </div>
                        <div>
                          <div className="fw-bold text-dark text-truncate-custom">{emp.FullName}</div>
                          <div className="text-muted extra-small">ID: {emp.EmployeeID}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <div className="text-dark small fw-bold mb-1">{emp.Department || 'Unspecified'}</div>
                        <div className="text-muted extra-small">{emp.Position || 'Staff Member'}</div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge-custom ${emp.Status === 'Active' ? 'badge-active' : emp.Status === 'On Leave' ? 'badge-leave' : 'badge-inactive'}`}>
                        {emp.Status || 'Active'}
                      </span>
                    </td>
                    <td className="text-end">
                      <div className="d-flex justify-content-end gap-1">
                        <Link to={`/employees/${emp.EmployeeID}`} className="btn-icon" title="Edit Profile">
                          <i className="bi bi-pencil-square"></i>
                        </Link>
                        <button className="btn-icon text-danger" onClick={() => setDeleteTarget({ id: emp.EmployeeID, name: emp.FullName })} title="Delete records">
                          <i className="bi bi-trash3-fill"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>

        {!loading && filteredEmployees.length === 0 && (
          <EmptyState 
            title="No members found" 
            message="We couldn't find any talent matching your current filters. Try resetting the search terms." 
            icon="🔎"
          />
        )}

        {/* Improved Pagination */}
        {!loading && totalPages > 1 && (
          <div className="p-4 border-top d-flex justify-content-between align-items-center bg-light bg-opacity-30">
            <div className="text-muted extra-small fw-bold">
              Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredEmployees.length)} of {filteredEmployees.length} entries
            </div>
            <nav>
              <ul className="pagination pagination-sm mb-0 gap-1">
                {[...Array(totalPages)].map((_, i) => (
                  <li key={i} className={`page-item ${currentPage === i + 1 ? 'active' : ''}`}>
                    <button className="page-link rounded-2 border-0 shadow-sm" style={{ width: '32px', height: '32px' }} onClick={() => setCurrentPage(i + 1)}>
                      {i + 1}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}
