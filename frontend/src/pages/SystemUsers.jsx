import { useState, useEffect } from 'react';
import { API_BASE, fetchAuth } from '../api';
import Skeleton, { TableSkeleton } from '../components/Skeleton';

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
        <button className="btn btn-primary-custom px-3 shadow-sm fw-bold" onClick={() => handleOpenModal()}>
            <i className="bi bi-person-plus-fill me-2"></i> Add Identity
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="table-container p-0 border-0 shadow-sm animate-slide-up glass-card">
        <div className="table-responsive">
          <table className="table-custom">
            <thead>
              <tr>
                <th>UserID</th>
                <th>Username</th>
                <th>Email</th>
                <th>Role Access</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            {loading ? <TableSkeleton rows={5} columns={5} /> : (
              <tbody>
                {users.map((u) => (
                  <tr key={u.UserID}>
                    <td className="fw-bold text-muted">#{u.UserID}</td>
                    <td className="fw-bold text-dark">{u.Username}</td>
                    <td>{u.Email || <span className="text-muted fst-italic">Not Set</span>}</td>
                    <td>
                      <span className={`badge bg-${u.Role === 'Admin' ? 'primary' : u.Role === 'HR' ? 'success' : u.Role === 'Payroll' ? 'warning text-dark' : 'secondary'} rounded-pill px-3`}>
                        {u.Role}
                      </span>
                    </td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-light border me-2" onClick={() => handleOpenModal(u)}>Edit</button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(u.UserID)}>Delete</button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && <tr><td colSpan="5" className="text-center py-4">No users found</td></tr>}
              </tbody>
            )}
          </table>
        </div>
      </div>

      {/* User Modal */}
      {showModal && (
        <div className="modal-backdrop-custom animate-fade-in" style={{ backgroundColor: 'rgba(15, 23, 42, 0.4)' }}>
           <div className="modal-content-custom bg-white p-4" style={{ maxWidth: '500px' }}>
              <div className="d-flex justify-content-between align-items-center mb-4">
                 <h5 className="fw-bold mb-0">{editUser ? 'Edit System Identity' : 'Provision New Identity'}</h5>
                 <button className="btn-close-custom" onClick={() => setShowModal(false)}><i className="bi bi-x-lg"></i></button>
              </div>
              <form onSubmit={handleSubmit}>
                 <div className="mb-3">
                    <label className="form-label small fw-bold text-uppercase">Username</label>
                    <input type="text" className="form-control" required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                 </div>
                 <div className="mb-3">
                    <label className="form-label small fw-bold text-uppercase">Corporate Email</label>
                    <input type="email" className="form-control" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                 </div>
                 <div className="mb-3">
                    <label className="form-label small fw-bold text-uppercase">System Role</label>
                    <select className="form-select" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                      <option value="Admin">Administrator</option>
                      <option value="HR">HR Manager</option>
                      <option value="Payroll">Payroll Manager</option>
                      <option value="Employee">Employee</option>
                    </select>
                 </div>
                 {!editUser && (
                   <div className="mb-4">
                      <label className="form-label small fw-bold text-uppercase">Temporary Password</label>
                      <input type="password" required className="form-control" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                   </div>
                 )}
                 <div className="text-end mt-4">
                    <button type="button" className="btn btn-light me-2 fw-bold" onClick={() => setShowModal(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary-custom fw-bold">Save Identity</button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
