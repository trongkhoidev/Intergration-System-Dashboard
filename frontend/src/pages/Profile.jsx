import { useState } from 'react';
import { API_BASE } from '../api';

export default function Profile() {
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : { username: 'Guest', role: 'user' };
  const displayName = user.username === 'Admin' ? 'Olivia Chen' : user.username;
  
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleLogout = () => {
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  const handlePasswordUpdate = (e) => {
    e.preventDefault();
    if (passwordForm.new !== passwordForm.confirm) {
      setMessage({ type: 'critical', text: 'Security keys do not match' });
      return;
    }
    
    setLoading(true);
    fetch(`${API_BASE}/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: user.username,
        new_password: passwordForm.new
      })
    })
    .then(res => res.json())
    .then(data => {
      setLoading(false);
      if (data.status === 'success') {
        setMessage({ type: 'info', text: 'Authentication key successfully rotated.' });
        setTimeout(() => setShowPasswordModal(false), 2000);
      } else {
        setMessage({ type: 'critical', text: data.msg });
      }
    });
  };

  return (
    <div className="pb-5">
      {/* Header Profile Area */}
      <div className="animate-slide-up position-relative mb-5">
        <div style={{ 
            height: '180px', 
            background: 'linear-gradient(135deg, var(--primary-color) 0%, #a855f7 100%)', 
            borderRadius: '24px',
            boxShadow: 'inset 0 0 50px rgba(0,0,0,0.1)'
        }}></div>
        
        <div className="d-flex flex-column flex-md-row align-items-md-end px-5" style={{ marginTop: '-60px' }}>
          <div className="rounded-circle bg-white p-1 shadow-lg me-md-4 mb-3 mb-md-0" style={{ width: '130px', height: '130px' }}>
            <div className="rounded-circle bg-primary bg-opacity-10 text-primary d-flex justify-content-center align-items-center fw-bold h-100 w-100" style={{ fontSize: '3.5rem', border: '2px solid var(--primary-light)' }}>
              {displayName.charAt(0).toUpperCase()}
            </div>
          </div>
          <div className="pb-md-3">
             <h2 className="fw-bold text-dark mb-1 tracking-tight">{displayName}</h2>
             <div className="d-flex align-items-center gap-2">
                <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 rounded-pill px-3 py-1 fw-bold text-uppercase small">
                    {user.role?.toLowerCase() === 'admin' ? 'System Administrator' : 'Staff Member'}
                </span>
                <span className="text-muted small fw-medium">@{user.username.toLowerCase()}</span>
             </div>
          </div>
          <div className="ms-auto pb-md-3">
             <button className="btn btn-primary-custom px-4 shadow-sm fw-bold" onClick={() => setShowPasswordModal(true)}>
                <i className="bi bi-shield-lock me-2"></i> Update Security
             </button>
          </div>
        </div>
      </div>
      
      <div className="row g-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="col-12 col-xl-8">
           <div className="table-container p-0 border-0 shadow-sm glass-card">
              <div className="p-4 border-bottom bg-light bg-opacity-25">
                 <h5 className="fw-bold mb-0">System Identity Information</h5>
              </div>
              <div className="p-4 p-md-5">
                 <div className="row g-5">
                    <div className="col-md-6">
                       <label className="stat-label small d-block mb-1 text-uppercase ls-wide">Full Identity Name</label>
                       <div className="h5 fw-bold text-dark">{displayName}</div>
                    </div>
                    <div className="col-md-6">
                       <label className="stat-label small d-block mb-1 text-uppercase ls-wide">Corporate Communication</label>
                       <div className="h5 fw-bold text-dark text-lowercase">{user.username}@integration.internal</div>
                    </div>
                    <div className="col-md-6">
                       <label className="stat-label small d-block mb-1 text-uppercase ls-wide">Network Node ID</label>
                       <div className="h5 fw-bold text-dark">SI-NODE-{user.role === 'admin' ? '0X7F' : '0X4A'}</div>
                    </div>
                    <div className="col-md-6">
                       <label className="stat-label small d-block mb-1 text-uppercase ls-wide">Access Permissions</label>
                       <div className="h5 fw-bold text-primary">Priority Level {user.role === 'admin' ? '9 - Administrative' : '3 - Operational'}</div>
                    </div>
                 </div>
              </div>
           </div>

           <div className="mt-4 p-4 rounded-4 border border-dashed text-center animate-fade-in" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--secondary-color)' }}>
              <div className="d-flex align-items-center justify-content-center gap-2 text-muted small fw-medium">
                 <i className="bi bi-shield-check-fill text-success fs-5"></i>
                 Authorized account since 2024. Your credentials are encrypted using industry standard AES-256.
              </div>
           </div>
        </div>

        <div className="col-12 col-xl-4">
           <div className="card-custom border-0 shadow-sm glass-card text-center py-5 px-4">
              <h5 className="fw-bold mb-4">Logout Sequence</h5>
              <p className="text-muted small mb-5">By signing out, you will invalidate your current session tokens across all active tabs.</p>
              
              <button className="btn btn-outline-danger w-100 py-3 fw-bold rounded-3 border-2" onClick={handleLogout}>
                 <i className="bi bi-person-x-fill me-2"></i> Terminate Session
              </button>
           </div>
        </div>
      </div>

      {/* Modern Password Update Modal */}
      {showPasswordModal && (
        <div className="modal-backdrop-custom animate-fade-in" style={{ backgroundColor: 'rgba(15, 23, 42, 0.4)' }}>
           <div className="modal-content-custom bg-white" style={{ maxWidth: '480px' }}>
              <div className="modal-header-custom border-0 pb-0">
                 <h5 className="fw-bold mb-0">Identity Rotation</h5>
                 <button className="btn-close-custom" onClick={() => setShowPasswordModal(false)}>
                    <i className="bi bi-x-lg"></i>
                 </button>
              </div>
              <div className="modal-body-custom pt-4">
                 <div className="text-center mb-5">
                    <div className="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center mx-auto mb-4 border border-primary border-opacity-10 shadow-sm" style={{ width: '80px', height: '80px' }}>
                       <i className="bi bi-key-fill fs-2"></i>
                    </div>
                    <h4 className="fw-bold mb-1">Rotate Access Key</h4>
                    <p className="text-muted extra-small">Periodic rotation prevents unauthorized access to system identifiers.</p>
                 </div>

                 {message && (
                    <div className={`p-3 rounded-3 mb-4 animate-slide-up fw-bold small severity-${message.type}`}>
                       <i className={`bi bi-${message.type === 'info' ? 'shield-check' : 'shield-exclamation'} me-2`}></i>
                       {message.text}
                    </div>
                 )}

                 <form onSubmit={handlePasswordUpdate}>
                    <div className="mb-4">
                       <label className="form-label stat-label small text-uppercase">New Keyphrase</label>
                       <input type="password" required className="form-control form-control-custom py-3" value={passwordForm.new} onChange={e => setPasswordForm({...passwordForm, new: e.target.value})} />
                    </div>
                    <div className="mb-5">
                       <label className="form-label stat-label small text-uppercase">Confirm Pattern</label>
                       <input type="password" required className="form-control form-control-custom py-3" value={passwordForm.confirm} onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})} />
                    </div>

                    <div className="d-grid shadow-sm rounded-3 overflow-hidden">
                       <button type="submit" disabled={loading} className="btn btn-primary-custom py-3 fw-bold">
                          {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-lightning-fill me-2"></i>}
                          Confirm Identity Update
                       </button>
                    </div>
                 </form>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
