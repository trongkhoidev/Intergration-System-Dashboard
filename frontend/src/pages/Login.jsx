import { useState, useEffect } from 'react';
import { API_BASE } from '../api';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [shake, setShake] = useState(false);

    // Xóa lỗi và hiệu ứng rung khi người dùng bắt đầu gõ lại
    useEffect(() => {
        if (error) {
            setError('');
            setShake(false);
        }
    }, [username, password]);

    const handleLogin = (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setShake(false);
        
        fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        })
        .then(res => res.json())
        .then(data => {
            setLoading(false);
            if (data.status === 'success') {
                localStorage.setItem('user', JSON.stringify(data.user));
                window.location.href = '/';
            } else {
                setError(data.msg || 'Invalid username or password');
                setShake(true);
            }
        })
        .catch(err => {
            setLoading(false);
            console.error(err);
            setError('Unable to reach authentication server');
            setShake(true);
        });
    };

    return (
        <div className="d-flex w-100 vh-100" style={{ backgroundColor: 'var(--bg-color)', overflow: 'hidden' }}>
            {/* LEFT SIDE: Artwork / Branding */}
            <div className="d-none d-lg-flex flex-column justify-content-between p-5" 
                 style={{ 
                     flex: '1', 
                     background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%)',
                     color: 'white',
                     position: 'relative'
                 }}>
                {/* Abstract Glass shapes as background pattern */}
                <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '400px', height: '400px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', filter: 'blur(30px)' }}></div>
                <div style={{ position: 'absolute', bottom: '10%', left: '-5%', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', filter: 'blur(20px)' }}></div>

                <div style={{ position: 'relative', zIndex: 1 }}>
                    <div className="d-inline-flex align-items-center gap-2 mb-5">
                        <div className="rounded bg-white bg-opacity-25 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', backdropFilter: 'blur(10px)' }}>
                           <i className="bi bi-hexagon-fill fs-5 text-white"></i>
                        </div>
                        <span className="fw-bold fs-5 tracking-tight">Data Integration Pro</span>
                    </div>
                </div>

                <div style={{ position: 'relative', zIndex: 1, maxWidth: '450px' }}>
                    <h1 className="display-4 fw-bold mb-4 tracking-tight" style={{ lineHeight: 1.1 }}>
                        Streamline your workflow.
                    </h1>
                    <p className="fs-5 text-white-50 mb-0">
                        The ultimate dashboard for managing Payroll, Attendance, and Human Resources flawlessly in real-time.
                    </p>
                </div>
                
                <div style={{ position: 'relative', zIndex: 1 }} className="small text-white-50">
                    &copy; 2026 Integration Protocol
                </div>
            </div>

            {/* RIGHT SIDE: Login Form */}
            <div className="d-flex flex-column justify-content-center align-items-center" style={{ flex: '1', background: 'var(--card-bg)' }}>
                <div style={{ width: '100%', maxWidth: '420px', padding: '0 2rem' }} className="animate-slide-up">
                    <div className="text-center mb-5">
                        <h2 className="fw-bold text-dark mb-2 tracking-tight">Welcome back</h2>
                        <p className="text-muted">Enter your credentials to access your account.</p>
                    </div>

                    <form onSubmit={handleLogin}>
                        <div className="mb-4">
                            <label className="form-label fw-bold text-muted small text-uppercase" style={{ letterSpacing: '0.05em' }}>Username</label>
                            <div className="position-relative">
                                <i className={`bi bi-person position-absolute top-50 translate-middle-y ms-3 ${error ? 'text-danger' : 'text-muted'}`}></i>
                                <input
                                    type="text"
                                    className={`form-control form-control-custom ps-5 py-3 ${shake ? 'input-error text-danger' : ''}`}
                                    placeholder="e.g. admin"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="mb-4">
                            <div className="d-flex justify-content-between align-items-center">
                                <label className="form-label fw-bold text-muted small text-uppercase mb-0" style={{ letterSpacing: '0.05em' }}>Password</label>
                                <a href="#" className="small text-decoration-none fw-medium" style={{ color: 'var(--primary-color)' }}>Forgot password?</a>
                            </div>
                            <div className="position-relative mt-2">
                                <i className={`bi bi-lock position-absolute top-50 translate-middle-y ms-3 ${error ? 'text-danger' : 'text-muted'}`}></i>
                                <input
                                    type="password"
                                    className={`form-control form-control-custom ps-5 py-3 ${shake ? 'input-error text-danger' : ''}`}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="d-flex align-items-center gap-2 mb-4 animate-fade-in p-3 rounded" style={{ backgroundColor: 'var(--error-bg)', color: 'var(--error-text)', fontSize: '0.875rem', fontWeight: 500 }}>
                                <i className="bi bi-exclamation-circle-fill"></i>
                                {error}
                            </div>
                        )}

                        <button 
                            type="submit" 
                            className="btn btn-primary-custom w-100 py-3 fw-bold d-flex justify-content-center align-items-center gap-2 mt-2" 
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                    Authenticating...
                                </>
                            ) : (
                                <>
                                    Sign In <i className="bi bi-arrow-right"></i>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-5 text-center p-3 rounded" style={{ backgroundColor: 'var(--secondary-color)', border: '1px dashed var(--border-color)' }}>
                        <p className="small text-muted mb-2 fw-bold text-uppercase" style={{ letterSpacing: '0.05em' }}>Test Credentials:</p>
                        <div className="d-flex justify-content-center gap-4">
                            <span className="badge bg-white text-dark border py-2 px-3 shadow-sm rounded-pill">
                                <i className="bi bi-shield-lock text-primary me-2"></i>admin / 123456
                            </span>
                            <span className="badge bg-white text-dark border py-2 px-3 shadow-sm rounded-pill">
                                <i className="bi bi-person text-secondary me-2"></i>user / 123456
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
