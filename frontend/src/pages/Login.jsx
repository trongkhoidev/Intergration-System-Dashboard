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
                setError(data.msg || 'Email hoặc mật khẩu không đúng');
                setShake(true);
            }
        })
        .catch(err => {
            setLoading(false);
            console.error(err);
            setError('Không thể kết nối đến máy chủ xác thực');
            setShake(true);
        });
    };

    return (
        <div className="d-flex align-items-center justify-content-center min-vh-100" style={{ backgroundColor: 'var(--bg-color)' }}>
            <div className="card shadow-lg border-0 rounded-4 overflow-hidden animate-slide-up" style={{ maxWidth: '1000px', width: '90%', display: 'flex', flexDirection: 'row', minHeight: '600px' }}>
                
                {/* TRÁI: Branding */}
                <div className="col-md-5 d-none d-md-flex flex-column justify-content-between p-5 text-white" 
                     style={{ 
                         background: 'var(--primary-gradient)',
                         position: 'relative'
                     }}>
                    <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '400px', height: '400px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', filter: 'blur(40px)' }}></div>
                    <div style={{ position: 'absolute', bottom: '10%', left: '-5%', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', filter: 'blur(30px)' }}></div>

                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <div className="d-inline-flex align-items-center gap-2 mb-4">
                            <div className="rounded bg-white bg-opacity-25 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', backdropFilter: 'blur(10px)' }}>
                               <i className="bi bi-layers-fill fs-4 text-white"></i>
                            </div>
                            <span className="fw-bold fs-4 tracking-tight">Integration Pro</span>
                        </div>
                    </div>

                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <h1 className="display-5 fw-bold mb-4 tracking-tight" style={{ lineHeight: 1.2 }}>
                            Quản trị toàn diện.<br/>Hiệu suất tối đa.
                        </h1>
                        <p className="fs-5 text-white-50 mb-0">
                            Hệ thống tích hợp Nhân sự, Chấm công và Lương thưởng thông minh, thời gian thực.
                        </p>
                    </div>
                    
                    <div style={{ position: 'relative', zIndex: 1 }} className="small text-white-50">
                        &copy; 2026 Integration Protocol
                    </div>
                </div>

                {/* PHẢI: Form đăng nhập */}
                <div className="col-md-7 p-5 bg-white d-flex flex-column justify-content-center">
                    <div className="mx-auto w-100" style={{ maxWidth: '400px' }}>
                        <div className="text-center mb-5">
                            <h2 className="fw-bold text-dark mb-2 tracking-tight">Chào mừng trở lại</h2>
                            <p className="text-muted fs-6">Đăng nhập để tiếp tục truy cập hệ thống</p>
                        </div>

                        <form onSubmit={handleLogin}>
                            <div className="mb-4">
                                <label className="form-label fw-bold text-muted small text-uppercase">Email công ty</label>
                                <div className="position-relative">
                                    <i className={`bi bi-envelope position-absolute top-50 translate-middle-y ms-3 ${error ? 'text-danger' : 'text-muted'}`}></i>
                                    <input
                                        type="email"
                                        className={`form-control ps-5 py-3 ${shake ? 'is-invalid' : ''}`}
                                        placeholder="user@company.vn"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        autoComplete="email"
                                        style={{ fontSize: '1rem', borderRadius: '10px' }}
                                    />
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="form-label fw-bold text-muted small text-uppercase">Mật khẩu</label>
                                <div className="position-relative mb-2">
                                    <i className={`bi bi-lock position-absolute top-50 translate-middle-y ms-3 ${error ? 'text-danger' : 'text-muted'}`}></i>
                                    <input
                                        type="password"
                                        className={`form-control ps-5 py-3 ${shake ? 'is-invalid' : ''}`}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        style={{ fontSize: '1rem', borderRadius: '10px' }}
                                    />
                                </div>
                                <div className="text-end">
                                    <Link to="/forgot-password" className="small text-decoration-none fw-medium" style={{ color: 'var(--primary)' }}>Quên mật khẩu?</Link>
                                </div>
                            </div>

                            {error && (
                                <div className="alert alert-danger d-flex align-items-center py-2 px-3 mb-4 rounded-3 animate-fade-in border-0 bg-danger-subtle text-danger" style={{ fontSize: '0.9rem' }}>
                                    <i className="bi bi-exclamation-circle-fill me-2 fs-5"></i>
                                    <span className="fw-medium">{error}</span>
                                </div>
                            )}

                            <button 
                                type="submit" 
                                className="btn btn-primary w-100 py-3 fw-bold d-flex justify-content-center align-items-center gap-2 mb-4" 
                                disabled={loading}
                                style={{ borderRadius: '10px', fontSize: '1.05rem' }}
                            >
                                {loading ? (
                                    <><span className="spinner-border spinner-border-sm"></span> Đang xác thực...</>
                                ) : (
                                    <>Đăng nhập <i className="bi bi-arrow-right-short fs-4"></i></>
                                )}
                            </button>
                        </form>

                        {/* Tài khoản test */}
                        <div className="mt-4 p-4 rounded-4 bg-light border border-light-subtle">
                            <p className="small text-muted mb-3 fw-bold text-center">TÀI KHOẢN THỬ NGHIỆM (MK: 123456)</p>
                            <div className="d-flex justify-content-center gap-2 flex-wrap">
                                <button type="button" className="btn btn-sm btn-outline bg-white rounded-pill px-3 py-2 fw-medium border-0 shadow-sm" onClick={() => setEmail('admin@integration.com')}>
                                    <i className="bi bi-shield-lock-fill text-primary me-2"></i>Admin
                                </button>
                                <button type="button" className="btn btn-sm btn-outline bg-white rounded-pill px-3 py-2 fw-medium border-0 shadow-sm" onClick={() => setEmail('hr@integration.com')}>
                                    <i className="bi bi-people-fill text-success me-2"></i>HR
                                </button>
                                <button type="button" className="btn btn-sm btn-outline bg-white rounded-pill px-3 py-2 fw-medium border-0 shadow-sm" onClick={() => setEmail('payroll@integration.com')}>
                                    <i className="bi bi-cash-stack text-warning me-2"></i>Payroll
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
