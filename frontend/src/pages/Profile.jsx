import { useEffect, useState } from 'react';
import { API_BASE, fetchAuth } from '../api';
import { getCurrentUser } from '../utils/auth';
import { getStatusPresentation } from '../utils/status';

const ROLE_LABELS = {
  Admin: 'System Administrator',
  admin: 'System Administrator',
  HR: 'HR Manager',
  hr: 'HR Manager',
  Payroll: 'Payroll Manager',
  payroll: 'Payroll Manager',
  Employee: 'Staff Member',
  employee: 'Staff Member',
};

export default function Profile() {
  const user = getCurrentUser();
  const [profileData, setProfileData] = useState(null);
  const [showPwModal, setShowPwModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [pwForm, setPwForm] = useState({ new_pw: '', confirm_pw: '' });
  const [editForm, setEditForm] = useState({ FullName: '', PhoneNumber: '' });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchProfile = () => {
    fetchAuth(`${API_BASE}/profile`)
      .then(r => r.json())
      .then(d => {
        setProfileData(d);
        setEditForm({
          FullName: d.FullName || '',
          PhoneNumber: d.PhoneNumber || ''
        });
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogout = () => {
    fetchAuth(`${API_BASE}/auth/logout`, { method: 'POST' }).finally(() => {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      window.location.href = '/';
    });
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    if (pwForm.new_pw !== pwForm.confirm_pw) {
      setMsg({ type: 'danger', text: 'Passwords do not match!' });
      return;
    }
    setLoading(true);
    fetchAuth(`${API_BASE}/password`, {
      method: 'PUT',
      body: JSON.stringify({ username: user.username, new_password: pwForm.new_pw }),
    }).then(r => r.json()).then(d => {
      setLoading(false);
      if (d.status === 'success') {
        showToast('Password updated successfully!');
        setShowPwModal(false);
        setPwForm({ new_pw: '', confirm_pw: '' });
        setMsg(null);
      } else {
        setMsg({ type: 'danger', text: d.msg || 'Failed to update password' });
      }
    });
  };

  const handleUpdateProfile = (e) => {
    e.preventDefault();
    setLoading(true);
    fetchAuth(`${API_BASE}/profile`, {
      method: 'PUT',
      body: JSON.stringify(editForm),
    }).then(r => r.json()).then(d => {
      setLoading(false);
      if (d.status === 'success') {
        showToast('Profile updated successfully!');
        setShowEditModal(false);
        fetchProfile();
      } else {
        showToast(d.msg || 'Update failed', 'danger');
      }
    });
  };

  const displayName = profileData?.FullName || user.username;

  return (
    <div className="animate-fade-in">
      {/* Toast Notification */}
      {toast && (
        <div className="toast-container" style={{ top: 80, right: 30 }}>
          <div className={`toast-premium alert-${toast.type}`}>
            <i className={`bi bi-${toast.type === 'success' ? 'check-circle-fill' : 'exclamation-triangle-fill'}`}></i>
            <div>
              <div className="fw-bold">{toast.type === 'success' ? 'Success' : 'Error'}</div>
              <div className="small opacity-75">{toast.text}</div>
            </div>
          </div>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">My Account</h1>
          <p className="page-subtitle">Manage your personal information and security settings</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline" onClick={() => setShowEditModal(true)}>
            <i className="bi bi-pencil-square me-2"></i> Edit Profile
          </button>
          <button className="btn btn-premium" onClick={() => setShowPwModal(true)}>
            <i className="bi bi-shield-lock me-2"></i> Security
          </button>
        </div>
      </div>

      <div className="card border-0 p-0 overflow-hidden shadow-md">
        <div className="profile-cover"></div>
        <div className="px-5 pb-5">
          <div className="d-flex justify-content-between align-items-end" style={{ marginTop: -40 }}>
            <div className="profile-avatar-wrapper">
              <div className="profile-avatar-large">
                {displayName.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="d-flex gap-2 mb-2">
               <button className="btn btn-danger btn-sm" onClick={handleLogout}>
                <i className="bi bi-box-arrow-right"></i> Sign Out
              </button>
            </div>
          </div>

          <div style={{ marginTop: 60 }}>
            <div className="row">
              <div className="col-lg-4">
                <h3 className="fw-800 text-dark mb-1">{displayName}</h3>
                <p className="text-muted mb-3">@{user.username} • <span className="badge badge-info">{ROLE_LABELS[user.role] || user.role}</span></p>
                
                <div className="bg-light p-3 rounded-4 mb-4">
                  <div className="small text-muted text-uppercase fw-bold mb-2 ls-1">Quick Access</div>
                  <div className="d-grid gap-2">
                    <div className="d-flex align-items-center gap-3 p-2 bg-white rounded-3 border">
                      <div className="avatar bg-primary-light text-primary"><i className="bi bi-envelope"></i></div>
                      <div className="overflow-hidden">
                        <div className="small text-muted">Email</div>
                        <div className="fw-600 text-truncate">{profileData?.Email || user.email}</div>
                      </div>
                    </div>
                    <div className="d-flex align-items-center gap-3 p-2 bg-white rounded-3 border">
                      <div className="avatar bg-success-light text-success"><i className="bi bi-telephone"></i></div>
                      <div>
                        <div className="small text-muted">Phone</div>
                        <div className="fw-600">{profileData?.PhoneNumber || '—'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-lg-8">
                <div className="card bg-white border h-100">
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h5 className="fw-bold m-0 text-primary">Job Information</h5>
                    <span className={`badge ${getStatusPresentation(profileData?.Status).className}`}>
                      {getStatusPresentation(profileData?.Status).label}
                    </span>
                  </div>
                  
                  <div className="profile-info-grid mt-0">
                    <div className="profile-info-item">
                      <div className="profile-info-label">Department</div>
                      <div className="profile-info-value">{profileData?.Department || 'Not Assigned'}</div>
                    </div>
                    <div className="profile-info-item">
                      <div className="profile-info-label">Position</div>
                      <div className="profile-info-value">{profileData?.Position || 'Not Assigned'}</div>
                    </div>
                    <div className="profile-info-item">
                      <div className="profile-info-label">Hire Date</div>
                      <div className="profile-info-value">
                        {profileData?.HireDate ? new Date(profileData.HireDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                      </div>
                    </div>
                    <div className="profile-info-item">
                      <div className="profile-info-label">Gender</div>
                      <div className="profile-info-value">{profileData?.Gender || '—'}</div>
                    </div>
                    <div className="profile-info-item">
                      <div className="profile-info-label">Date of Birth</div>
                      <div className="profile-info-value">
                         {profileData?.DateOfBirth ? new Date(profileData.DateOfBirth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-box animate-in" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Personal Details</h3>
              <button className="btn-icon" onClick={() => setShowEditModal(false)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <form onSubmit={handleUpdateProfile}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text" required className="form-control"
                    value={editForm.FullName}
                    onChange={e => setEditForm({ ...editForm, FullName: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="text" className="form-control"
                    value={editForm.PhoneNumber}
                    onChange={e => setEditForm({ ...editForm, PhoneNumber: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading && <span className="spinner-border spinner-border-sm me-2"></span>}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPwModal && (
        <div className="modal-overlay">
          <div className="modal-box animate-in" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3 className="modal-title">Security Settings</h3>
              <button className="btn-icon" onClick={() => { setShowPwModal(false); setMsg(null); }}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <form onSubmit={handleChangePassword}>
              <div className="modal-body">
                {msg && (
                  <div className={`alert-box alert-${msg.type} mb-3`}>
                    <i className={`bi bi-${msg.type === 'success' ? 'check-circle' : 'exclamation-triangle'}`}></i>
                    {msg.text}
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input
                    type="password" required className="form-control"
                    value={pwForm.new_pw}
                    onChange={e => setPwForm({ ...pwForm, new_pw: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm Password</label>
                  <input
                    type="password" required className="form-control"
                    value={pwForm.confirm_pw}
                    onChange={e => setPwForm({ ...pwForm, confirm_pw: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowPwModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading && <span className="spinner-border spinner-border-sm me-2"></span>}
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
