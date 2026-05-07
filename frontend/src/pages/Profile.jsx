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
    <div className="animate-fade-in pb-5">
      {/* Toast Notification */}
      {toast && (
        <div className="toast-container" style={{ top: 80, right: 30, zIndex: 1100 }}>
          <div className={`toast-premium alert-${toast.type} shadow-sm`}>
            <i className={`bi bi-${toast.type === 'success' ? 'check-circle-fill' : 'exclamation-triangle-fill'}`}></i>
            <div>
              <div className="fw-bold">{toast.type === 'success' ? 'Success' : 'Error'}</div>
              <div className="small opacity-75">{toast.text}</div>
            </div>
          </div>
        </div>
      )}

      <div className="page-header mb-5">
        <div>
          <h1 className="page-title text-white">My Account</h1>
          <p className="page-subtitle text-white-50">Manage your personal information and security settings</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-primary bg-white px-3 shadow-sm fw-bold" onClick={() => setShowEditModal(true)}>
            <i className="bi bi-pencil-square me-2"></i> Edit Profile
          </button>
          <button className="btn bg-vivid-pink px-4 fw-bold shadow-sm" onClick={() => setShowPwModal(true)}>
            <i className="bi bi-shield-lock me-2"></i> Security
          </button>
        </div>
      </div>

      <div className="card border-0 p-0 overflow-hidden shadow-md" style={{ borderRadius: '20px' }}>
        <div className="profile-cover" style={{ height: '160px', background: 'linear-gradient(135deg, #1e293b 0%, #ec4899 100%)', position: 'relative' }}>
          <div className="profile-avatar-wrapper">
            <div className="profile-avatar-large shadow-lg border border-4 border-white bg-vivid-pink">
              {displayName.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
        <div className="px-5 pb-5">
          <div className="d-flex justify-content-between align-items-end" style={{ marginTop: 10, minHeight: '60px' }}>
            <div style={{ marginLeft: '130px' }}>
              <h3 className="fw-800 text-dark mb-1">{displayName}</h3>
              <p className="text-muted mb-0">@{user.username} • <span className="badge bg-vivid-pink px-3 rounded-pill" style={{ fontSize: '0.75rem' }}>{ROLE_LABELS[user.role] || user.role}</span></p>
            </div>
            <div className="d-flex gap-2 mb-2">
               <button className="btn btn-danger btn-sm px-3 fw-bold shadow-sm" onClick={handleLogout}>
                <i className="bi bi-box-arrow-right me-2"></i> Sign Out
              </button>
            </div>
          </div>

          <div style={{ marginTop: 40 }}>
            <div className="row g-4">
              <div className="col-lg-4">
                <div className="bg-light p-4 rounded-4 mb-4 border">
                  <div className="small text-muted text-uppercase fw-bold mb-3 ls-1">Quick Access</div>
                  <div className="d-grid gap-3">
                    <div className="d-flex align-items-center gap-3 p-3 bg-white rounded-3 border shadow-sm">
                      <div className="avatar bg-primary-light text-primary"><i className="bi bi-envelope"></i></div>
                      <div className="overflow-hidden">
                        <div className="small text-muted">Corporate Email</div>
                        <div className="fw-600 text-truncate">{profileData?.Email || user.email}</div>
                      </div>
                    </div>
                    <div className="d-flex align-items-center gap-3 p-3 bg-white rounded-3 border shadow-sm">
                      <div className="avatar bg-vivid-pink sm" style={{ background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899' }}><i className="bi bi-telephone"></i></div>
                      <div>
                        <div className="small text-muted">Phone Number</div>
                        <div className="fw-600">{profileData?.PhoneNumber || '—'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-lg-8">
                <div className="card bg-white border-0 shadow-sm p-4 h-100" style={{ borderRadius: '16px' }}>
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h5 className="fw-bold m-0 text-primary d-flex align-items-center">
                      <i className="bi bi-briefcase me-2"></i> Job Information
                    </h5>
                    <span className={`badge ${getStatusPresentation(profileData?.Status).className} px-3 py-2 rounded-pill`}>
                      {getStatusPresentation(profileData?.Status).label}
                    </span>
                  </div>
                  
                  <div className="profile-info-grid mt-0">
                    <div className="profile-info-item p-3 rounded-3 bg-light bg-opacity-50 border">
                      <div className="profile-info-label">Department</div>
                      <div className="profile-info-value fw-bold text-dark">{profileData?.Department || 'Not Assigned'}</div>
                    </div>
                    <div className="profile-info-item p-3 rounded-3 bg-light bg-opacity-50 border">
                      <div className="profile-info-label">Current Position</div>
                      <div className="profile-info-value fw-bold text-dark">{profileData?.Position || 'Not Assigned'}</div>
                    </div>
                    <div className="profile-info-item p-3 rounded-3 bg-light bg-opacity-50 border">
                      <div className="profile-info-label">Hire Date</div>
                      <div className="profile-info-value fw-bold text-dark">
                        {profileData?.HireDate ? new Date(profileData.HireDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                      </div>
                    </div>
                    <div className="profile-info-item p-3 rounded-3 bg-vivid-pink bg-opacity-10 border" style={{ borderColor: 'rgba(236, 72, 153, 0.2)' }}>
                      <div className="profile-info-label" style={{ color: '#ec4899' }}>Gender</div>
                      <div className="profile-info-value fw-bold" style={{ color: '#ec4899' }}>{profileData?.Gender || '—'}</div>
                    </div>
                    <div className="profile-info-item p-3 rounded-3 bg-light bg-opacity-50 border">
                      <div className="profile-info-label">Date of Birth</div>
                      <div className="profile-info-value fw-bold text-dark">
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
