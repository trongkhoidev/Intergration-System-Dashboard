import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { API_BASE } from '../api';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const nav = useNavigate();
  
  const searchParams = new URLSearchParams(useLocation().search);
  const token = searchParams.get('token');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setMessage({ type: 'danger', text: 'Passwords do not match.' });
      return;
    }
    if (!token) {
      setMessage({ type: 'danger', text: 'Invalid or missing reset token.' });
      return;
    }
    
    setLoading(true);
    setMessage(null);
    
    fetch(`${API_BASE}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, new_password: password })
    })
    .then(res => res.json())
    .then(data => {
      setLoading(false);
      if (data.status === 'success') {
        setMessage({ type: 'success', text: 'Password has been reset successfully.' });
        setTimeout(() => nav('/'), 2000);
      } else {
        setMessage({ type: 'danger', text: data.msg || 'Failed to reset password.' });
      }
    })
    .catch(err => {
      setLoading(false);
      console.error(err);
      setMessage({ type: 'danger', text: 'Network error. Please try again later.' });
    });
  };

  return (
    <div className="login-bg d-flex align-items-center justify-content-center min-vh-100 p-3">
        <div className="login-card bg-white p-5 rounded-4 shadow-lg animate-slide-up position-relative overflow-hidden" style={{ width: '100%', maxWidth: '450px' }}>
            <div className="text-center mb-5">
                <div className="bg-primary rounded-3 d-inline-flex align-items-center justify-content-center shadow-sm mb-3" style={{ width: '56px', height: '56px' }}>
                    <i className="bi bi-key-fill text-white fs-3"></i>
                </div>
                <h3 className="fw-bold text-dark tracking-tight mb-2">Create New Keyphrase</h3>
                <p className="text-muted small px-3">Your new security keyphrase must be different from previous used keyphrases.</p>
            </div>

            {message && (
                <div className={`alert alert-${message.type} small fw-bold mb-4 animate-fade-in`}>
                    <i className={`bi bi-${message.type === 'success' ? 'check-circle' : 'exclamation-circle'} me-2`}></i>
                    {message.text}
                </div>
            )}

            {!token ? (
              <div className="text-center mt-3">
                  <div className="alert alert-danger small fw-bold mb-4">Invalid or missing reset token.</div>
                  <Link to="/" className="btn btn-outline-primary fw-bold hover-lift w-100">
                      Back to Secure Login
                  </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                      <label className="form-label fw-bold text-muted small text-uppercase" style={{ letterSpacing: '0.05em' }}>New Keyphrase</label>
                      <div className="position-relative">
                          <i className="bi bi-lock position-absolute top-50 translate-middle-y ms-3 text-muted"></i>
                          <input
                              type="password"
                              className="form-control form-control-custom py-3 ps-5 bg-light"
                              placeholder="••••••••"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              required
                          />
                      </div>
                  </div>
                  
                  <div className="mb-4">
                      <label className="form-label fw-bold text-muted small text-uppercase" style={{ letterSpacing: '0.05em' }}>Confirm Pattern</label>
                      <div className="position-relative">
                          <i className="bi bi-lock-fill position-absolute top-50 translate-middle-y ms-3 text-muted"></i>
                          <input
                              type="password"
                              className="form-control form-control-custom py-3 ps-5 bg-light"
                              placeholder="••••••••"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              required
                          />
                      </div>
                  </div>

                  <button 
                      type="submit" 
                      className="btn btn-primary-custom w-100 py-3 mb-4 fw-bold shadow-sm d-flex justify-content-center align-items-center"
                      disabled={loading}
                  >
                      {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-check2-circle me-2"></i>}
                      Confirm & Reset
                  </button>
              </form>
            )}
        </div>
    </div>
  );
}
