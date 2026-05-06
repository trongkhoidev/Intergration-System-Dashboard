import { useState, useEffect } from 'react';
import { API_BASE, fetchAuth } from '../api';
import { TableSkeleton } from '../components/Skeleton';

export default function SystemUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({ username: '', email: '', role: 'Employee', password: '' });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    setLoading(true);
    fetchAuth(`${API_BASE}/users`)
      .then(res => res.json())
      .then(data => {
        setUsers(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load system users');
        setLoading(false);
      });
  };

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditUser(user);
      setFormData({ username: user.Username, email: user.Email || '', role: user.Role, password: '' });
    } else {
      setEditUser(null);
      setFormData({ username: '', email: '', role: 'Employee', password: '' });
    }
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const url = editUser ? `${API_BASE}/users/${editUser.UserID}` : `${API_BASE}/users`;
    const method = editUser ? 'PUT' : 'POST';
    
    fetchAuth(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })
    .then(res => res.json())
    .then(data => {
      if (data.status === 'success') {
        setShowModal(false);
        loadUsers();
      } else {
        alert(data.msg || 'Error saving user');
      }
    });
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      fetchAuth(`${API_BASE}/users/${id}`, { method: 'DELETE' })
        .then(() => loadUsers());
    }
  };

  return (
    <div className="pb-5">
      <div className="d-flex justify-content-between align-items-center mb-5 animate-slide-up">
        <div>
          <h2 className="fw-bold text-dark mb-1 tracking-tight">System Users</h2>
          <p className="text-muted small mb-0">Manage access control, roles, and identities.</p>
        </div>
        <button className="btn btn-primary px-4 shadow-sm fw-bold" onClick={() => handleOpenModal()}>
            <i className="bi bi-person-plus-fill me-2"></i> Add Identity
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="table-container p-0 border-0 shadow-sm animate-slide-up bg-white rounded-4 overflow-hidden">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th className="ps-4">User ID</th>
                <th>Username</th>
                <th>Corporate Email</th>
                <th>Role Access</th>
                <th className="pe-4 text-end">Actions</th>
              </tr>
            </thead>
            {loading ? <TableSkeleton rows={5} columns={5} /> : (
              <tbody>
                {users.map((u) => (
                  <tr key={u.UserID}>
                    <td className="fw-bold text-muted ps-4">#{u.UserID}</td>
                    <td className="fw-bold text-dark">{u.Username}</td>
                    <td>{u.Email || <span className="text-muted fst-italic">Not Set</span>}</td>
                    <td>
                      <span className={`badge ${u.Role === 'Admin' ? 'bg-primary' : u.Role === 'HR' ? 'bg-success' : u.Role === 'Payroll' ? 'bg-warning text-dark' : 'bg-secondary'} rounded-pill px-3 py-2 fw-bold`} style={{ minWidth: '90px' }}>
                        {u.Role}
                      </span>
                    </td>
                    <td className="pe-4 text-end">
                      <div className="d-flex gap-2 justify-content-end">
                        <button className="btn-icon" data-tooltip="Edit" onClick={() => handleOpenModal(u)}>
                          <i className="bi bi-pencil text-warning"></i>
                        </button>
                        <button className="btn-icon text-danger" data-tooltip="Delete" onClick={() => handleDelete(u.UserID)}>
                          <i className="bi bi-trash3 text-danger"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && <tr><td colSpan="5" className="text-center py-5 text-muted"><i className="bi bi-inbox fs-1 d-block mb-2"></i>No users found</td></tr>}
              </tbody>
            )}
          </table>
        </div>
      </div>

      {/* User Modal */}
      {showModal && (
        <div className="modal-overlay animate-fade-in">
           <div className="modal-box p-0 bg-white overflow-hidden" style={{ maxWidth: '500px' }}>
              <div className="modal-header bg-light-subtle">
                 <h5 className="fw-bold mb-0 text-dark">
                   <i className={`bi ${editUser ? 'bi-person-gear' : 'bi-person-plus'} me-2 text-primary`}></i>
                   {editUser ? 'Edit System Identity' : 'Provision New Identity'}
                 </h5>
                 <button className="btn-icon" onClick={() => setShowModal(false)}><i className="bi bi-x-lg"></i></button>
              </div>
              <form onSubmit={handleSubmit}>
                 <div className="modal-body p-4">
                     <div className="mb-4">
                        <label className="form-label small fw-bold text-muted text-uppercase">Username</label>
                        <input type="text" className="form-control" required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} placeholder="Enter username..." />
                     </div>
                     <div className="mb-4">
                        <label className="form-label small fw-bold text-muted text-uppercase">Corporate Email</label>
                        <input type="email" className="form-control" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="e.g. admin@company.com" />
                     </div>
                     <div className="mb-4">
                        <label className="form-label small fw-bold text-muted text-uppercase">System Role</label>
                        <select className="form-select" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                          <option value="Admin">Administrator</option>
                          <option value="HR">HR Manager</option>
                          <option value="Payroll">Payroll Manager</option>
                          <option value="Employee">Employee</option>
                        </select>
                     </div>
                     {!editUser && (
                       <div className="mb-2">
                          <label className="form-label small fw-bold text-muted text-uppercase">Temporary Password</label>
                          <input type="password" required className="form-control" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="••••••••" />
                       </div>
                     )}
                 </div>
                 <div className="modal-footer bg-light-subtle">
                    <button type="button" className="btn btn-outline px-4" onClick={() => setShowModal(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary px-4 fw-bold">
                        <i className="bi bi-check-circle-fill me-2"></i> Save Identity
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
