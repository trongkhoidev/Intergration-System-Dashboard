import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE } from '../api';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [shake, setShake] = useState(false);

    useEffect(() => {
        if (error) {
            setTimeout(() => setError(""), 5000);
        }
    }, [error]);

    useEffect(() => {
        if (error) {
            setError('');
            setShake(false);
        }
    }, [email, password, error]);

    const handleLogin = (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setShake(false);

        fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        })
            .then(res => res.json().then(data => ({ status: res.status, data })))
            .then(({ status, data }) => {
                setLoading(false);
                if (data.status === 'success') {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    window.location.href = '/';
                } else {
                    setError(data.msg || 'Invalid email or password');
                    setShake(true);
                }
            })
            .catch(err => {
                setLoading(false);
                console.error(err);
                setError('Could not connect to authentication server');
                setShake(true);
            });
    };

    return (
        <div className="d-flex align-items-center justify-content-center min-vh-100 p-4" style={{ background: 'var(--app-gradient)', backgroundAttachment: 'fixed' }}>
            {/* Decorative Elements */}
            <div style={{ position: 'absolute', top: '10%', left: '15%', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(236, 72, 153, 0.15)', filter: 'blur(80px)', zIndex: 0 }}></div>
            <div style={{ position: 'absolute', bottom: '15%', right: '10%', width: '400px', height: '400px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', filter: 'blur(100px)', zIndex: 0 }}></div>

            <div className="card border-0 shadow-lg overflow-hidden animate-slide-up" style={{
                maxWidth: '1000px',
                width: '100%',
                display: 'flex',
                flexDirection: 'row',
                minHeight: '620px',
                borderRadius: '32px',
                background: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                zIndex: 1
            }}>

                {/* TRÁI: Branding */}
                <div className="col-md-5 d-none d-md-flex flex-column justify-content-between p-5 text-white"
                    style={{
                        background: 'linear-gradient(135deg, #0f172a 0%, #ec4899 100%)',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'url("https://www.transparenttextures.com/patterns/glass-pass.png")', opacity: 0.1 }}></div>

                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <div className="d-inline-flex align-items-center gap-2 mb-4 p-2 px-3 rounded-pill" style={{ background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(10px)' }}>
                            <i className="bi bi-layers-fill fs-5"></i>
                            <span className="fw-800 tracking-tight">INTEGRATION PRO</span>
                        </div>
                    </div>

                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <h1 className="display-4 fw-800 mb-4 tracking-tight" style={{ lineHeight: 1.1 }}>
                            Comprehensive<br />Admin.<br />Performance.
                        </h1>
                        <p className="fs-5 text-white-50 mb-0 fw-500">
                            Elevate corporate management with a next-generation smart integration platform.
                        </p>
                    </div>

                    <div style={{ position: 'relative', zIndex: 1 }} className="small text-white-50 fw-600 ls-1">
                        &copy; 2026 CORPORATE PROTOCOL
                    </div>
                </div>

                {/* PHẢI: Form đăng nhập */}
                <div className="col-md-7 p-5 d-flex flex-column justify-content-center bg-white bg-opacity-25">
                    <div className="mx-auto w-100" style={{ maxWidth: '400px' }}>
                        <div className="text-center mb-5">
                            <div className="bg-vivid-pink d-inline-flex align-items-center justify-content-center rounded-circle mb-3 shadow-sm" style={{ width: '64px', height: '64px' }}>
                                <i className="bi bi-shield-lock-fill fs-3 text-white"></i>
                            </div>
                            <h2 className="fw-800 text-dark mb-1 tracking-tight">Welcome Back</h2>
                            <p className="text-muted fw-600">Please login to continue</p>
                        </div>

                        <form onSubmit={handleLogin}>
                            <div className="mb-4">
                                <label className="form-label fw-800 text-muted extra-small text-uppercase ls-1">Company Email</label>
                                <div className="position-relative">
                                    <i className={`bi bi-envelope position-absolute top-50 translate-middle-y ms-3 fs-5 ${error ? 'text-danger' : 'text-muted'}`}></i>
                                    <input
                                        type="email"
                                        className={`form-control ps-5 py-3 border-0 shadow-sm ${shake ? 'is-invalid' : ''}`}
                                        placeholder="user@company.vn"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        autoComplete="email"
                                        style={{ borderRadius: '16px', background: 'rgba(255, 255, 255, 0.8)', fontSize: '0.95rem' }}
                                    />
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="form-label fw-800 text-muted extra-small text-uppercase ls-1">Password</label>
                                <div className="position-relative mb-2">
                                    <i className={`bi bi-lock position-absolute top-50 translate-middle-y ms-3 fs-5 ${error ? 'text-danger' : 'text-muted'}`}></i>
                                    <input
                                        type="password"
                                        className={`form-control ps-5 py-3 border-0 shadow-sm ${shake ? 'is-invalid' : ''}`}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        style={{ borderRadius: '16px', background: 'rgba(255, 255, 255, 0.8)', fontSize: '0.95rem' }}
                                    />
                                </div>
                                <div className="text-end">
                                    <Link to="/forgot-password" className="small text-decoration-none fw-700" style={{ color: '#ec4899' }}>Forgot password?</Link>
                                </div>
                            </div>

                            {error && (
                                <div className="alert-box alert-danger mb-4 animate-slide-in border-0 shadow-sm" style={{ borderRadius: '14px' }}>
                                    <i className="bi bi-exclamation-triangle-fill"></i>
                                    <span className="fw-700">{error}</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                className={`btn w-100 py-3 fw-800 d-flex justify-content-center align-items-center gap-2 mb-4 shadow-lg ${loading ? 'bg-secondary' : 'bg-vivid-pink'}`}
                                disabled={loading}
                                style={{ borderRadius: '16px', fontSize: '1rem', border: 'none', color: '#fff' }}
                            >
                                {loading ? (
                                    <><span className="spinner-border spinner-border-sm"></span> Authenticating...</>
                                ) : (
                                    <>SIGN IN NOW <i className="bi bi-arrow-right-short fs-4"></i></>
                                )}
                            </button>
                        </form>

                        {/* Tài khoản test */}
                        <div className="mt-4 p-4 rounded-4" style={{ background: 'rgba(255, 255, 255, 0.5)', border: '1px dashed rgba(236, 72, 153, 0.3)' }}>
                            <p className="extra-small text-muted mb-3 fw-800 text-center text-uppercase ls-1">Quick Access (Pass: 123456)</p>
                            <div className="d-flex justify-content-center gap-2 flex-wrap">
                                <button type="button" className="badge badge-pink border-0 cursor-pointer transition-all hover-scale" onClick={() => setEmail('admin@integration.com')}>
                                    <i className="bi bi-shield-check me-1"></i> ADMIN
                                </button>
                                <button type="button" className="badge bg-vivid-blue border-0 cursor-pointer transition-all hover-scale" onClick={() => setEmail('hr@integration.com')}>
                                    <i className="bi bi-people me-1"></i> HR
                                </button>
                                <button type="button" className="badge bg-vivid-amber border-0 cursor-pointer transition-all hover-scale" onClick={() => setEmail('payroll@integration.com')}>
                                    <i className="bi bi-cash-stack me-1"></i> PAYROLL
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
