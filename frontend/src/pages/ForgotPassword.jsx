import { useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE } from '../api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    
    fetch(`${API_BASE}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    })
    .then(res => res.json())
    .then(data => {
      setLoading(false);
      if (data.status === 'success') {
        setMessage({ type: 'success', text: data.msg || 'A reset link has been sent to your email.' });
      } else {
        setMessage({ type: 'danger', text: data.msg || 'Failed to process request.' });
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
                    <i className="bi bi-shield-lock text-white fs-3"></i>
                </div>
                <h3 className="fw-bold text-dark tracking-tight mb-2">Password Recovery</h3>
                <p className="text-muted small px-3">Enter your corporate email address to receive instructions for resetting your authentication key.</p>
            </div>

            {message && (
                <div className={`alert alert-${message.type} small fw-bold mb-4 animate-fade-in`}>
                    <i className={`bi bi-${message.type === 'success' ? 'check-circle' : 'exclamation-circle'} me-2`}></i>
                    <span dangerouslySetInnerHTML={{ __html: message.text }}></span>
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label className="form-label fw-bold text-muted small text-uppercase" style={{ letterSpacing: '0.05em' }}>Corporate Email</label>
                    <div className="position-relative">
                        <i className="bi bi-envelope position-absolute top-50 translate-middle-y ms-3 text-muted"></i>
                        <input
                            type="email"
                            className="form-control form-control-custom py-3 ps-5 bg-light"
                            placeholder="admin@integration.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <button 
                    type="submit" 
                    className="btn btn-primary-custom w-100 py-3 mb-4 fw-bold shadow-sm d-flex justify-content-center align-items-center"
                    disabled={loading}
                >
                    {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-send-fill me-2"></i>}
                    Send Recovery Link
                </button>

                <div className="text-center mt-3">
                    <Link to="/" className="text-decoration-none small fw-bold text-primary hover-lift d-inline-block">
                        <i className="bi bi-arrow-left me-1"></i> Back to Secure Login
                    </Link>
                </div>
            </form>
        </div>
    </div>
  );
}
