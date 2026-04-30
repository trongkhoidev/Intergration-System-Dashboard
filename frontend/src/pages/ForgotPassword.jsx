import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE } from '../api';

export default function ForgotPassword() {
  // Step 1: Email, Step 2: OTP, Step 3: New Password
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const otpRefs = useRef([]);
  const nav = useNavigate();

  // Countdown timer cho nút "Gửi lại mã"
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Auto-focus ô OTP đầu tiên khi chuyển sang step 2
  useEffect(() => {
    if (step === 2 && otpRefs.current[0]) {
      otpRefs.current[0].focus();
    }
  }, [step]);

  // ========================
  // Step 1: Gửi email yêu cầu OTP
  // ========================
  const handleSendOTP = (e) => {
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
        setStep(2);
        setCountdown(60);
        setMessage({ type: 'success', text: 'Mã OTP 6 số đã được gửi đến email của bạn.' });
      } else {
        setMessage({ type: 'danger', text: data.msg || 'Không thể gửi mã OTP.' });
      }
    })
    .catch(() => {
      setLoading(false);
      setMessage({ type: 'danger', text: 'Lỗi kết nối. Vui lòng thử lại.' });
    });
  };

  // ========================
  // Step 2: Xác nhận OTP (Cải tiến mượt mà hơn)
  // ========================
  const handleOtpChange = (index, value) => {
    // Lấy ký tự cuối cùng vừa gõ (hỗ trợ ghi đè)
    const char = value.slice(-1);
    if (char && !/^\d$/.test(char)) return;

    const newOtp = [...otp];
    newOtp[index] = char;
    setOtp(newOtp);

    // Tự động chuyển sang ô tiếp theo nếu có nhập giá trị
    if (char && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        // Nếu ô hiện tại trống, quay lại ô trước và xóa
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        otpRefs.current[index - 1]?.focus();
      } else {
        // Xóa ô hiện tại
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleFocus = (e) => {
    // Tự động bôi đen khi focus để gõ đè cho sướng
    e.target.select();
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length === 6) {
      const newOtp = pastedData.split('');
      setOtp(newOtp);
      otpRefs.current[5]?.focus();
    }
  };

  const handleVerifyOTP = (e) => {
    e.preventDefault();
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setMessage({ type: 'danger', text: 'Vui lòng nhập đủ 6 số.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    fetch(`${API_BASE}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp: otpString })
    })
    .then(res => res.json())
    .then(data => {
      setLoading(false);
      if (data.status === 'success') {
        setResetToken(data.reset_token);
        setStep(3);
        setMessage({ type: 'success', text: 'Xác nhận OTP thành công! Hãy đặt mật khẩu mới.' });
      } else {
        setMessage({ type: 'danger', text: data.msg || 'Mã OTP không đúng.' });
        // Reset OTP fields
        setOtp(['', '', '', '', '', '']);
        otpRefs.current[0]?.focus();
      }
    })
    .catch(() => {
      setLoading(false);
      setMessage({ type: 'danger', text: 'Lỗi kết nối. Vui lòng thử lại.' });
    });
  };

  const handleResendOTP = () => {
    if (countdown > 0) return;
    setLoading(true);
    setMessage(null);
    setOtp(['', '', '', '', '', '']);

    fetch(`${API_BASE}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    })
    .then(res => res.json())
    .then(data => {
      setLoading(false);
      if (data.status === 'success') {
        setCountdown(60);
        setMessage({ type: 'success', text: 'Mã OTP mới đã được gửi!' });
        otpRefs.current[0]?.focus();
      } else {
        setMessage({ type: 'danger', text: data.msg || 'Không thể gửi lại mã.' });
      }
    })
    .catch(() => {
      setLoading(false);
      setMessage({ type: 'danger', text: 'Lỗi kết nối.' });
    });
  };

  // ========================
  // Step 3: Đổi mật khẩu
  // ========================
  const handleResetPassword = (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setMessage({ type: 'danger', text: 'Mật khẩu xác nhận không khớp.' });
      return;
    }
    if (password.length < 6) {
      setMessage({ type: 'danger', text: 'Mật khẩu phải có ít nhất 6 ký tự.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    fetch(`${API_BASE}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reset_token: resetToken, new_password: password })
    })
    .then(res => res.json())
    .then(data => {
      setLoading(false);
      if (data.status === 'success') {
        setMessage({ type: 'success', text: 'Đổi mật khẩu thành công! Đang chuyển về trang đăng nhập...' });
        setTimeout(() => nav('/'), 2500);
      } else {
        setMessage({ type: 'danger', text: data.msg || 'Không thể đổi mật khẩu.' });
      }
    })
    .catch(() => {
      setLoading(false);
      setMessage({ type: 'danger', text: 'Lỗi kết nối.' });
    });
  };

  // ========================
  // Step indicator icons & labels
  // ========================
  const steps = [
    { icon: 'bi-envelope', label: 'Email' },
    { icon: 'bi-shield-lock', label: 'OTP' },
    { icon: 'bi-key', label: 'Mật khẩu mới' },
  ];

  return (
    <div className="login-bg d-flex align-items-center justify-content-center min-vh-100 p-3">
      <div className="login-card bg-white p-5 rounded-4 shadow-lg animate-slide-up position-relative overflow-hidden" style={{ width: '100%', maxWidth: '480px' }}>
        
        {/* Step Progress Indicator */}
        <div className="d-flex justify-content-center align-items-center gap-0 mb-5">
          {steps.map((s, i) => (
            <div key={i} className="d-flex align-items-center">
              <div className="d-flex flex-column align-items-center" style={{ minWidth: '70px' }}>
                <div 
                  className={`rounded-circle d-flex align-items-center justify-content-center shadow-sm mb-1`}
                  style={{ 
                    width: '40px', height: '40px', 
                    background: step > i + 1 ? '#10b981' : step === i + 1 ? 'var(--primary-color)' : '#e5e7eb',
                    color: step >= i + 1 ? 'white' : '#9ca3af',
                    transition: 'all 0.3s ease',
                    fontSize: '14px'
                  }}
                >
                  {step > i + 1 ? <i className="bi bi-check-lg"></i> : <i className={`bi ${s.icon}`}></i>}
                </div>
                <span className="small fw-bold" style={{ color: step === i + 1 ? 'var(--primary-color)' : '#9ca3af', fontSize: '11px' }}>{s.label}</span>
              </div>
              {i < 2 && (
                <div style={{ width: '40px', height: '2px', background: step > i + 1 ? '#10b981' : '#e5e7eb', marginBottom: '18px', transition: 'all 0.3s ease' }}></div>
              )}
            </div>
          ))}
        </div>

        {/* Alert Message */}
        {message && (
          <div className={`alert alert-${message.type} small fw-bold mb-4 animate-fade-in d-flex align-items-center gap-2`}>
            <i className={`bi bi-${message.type === 'success' ? 'check-circle-fill' : 'exclamation-circle-fill'}`}></i>
            {message.text}
          </div>
        )}

        {/* ======== STEP 1: Nhập Email ======== */}
        {step === 1 && (
          <>
            <div className="text-center mb-4">
              <div className="rounded-3 d-inline-flex align-items-center justify-content-center shadow-sm mb-3" style={{ width: '56px', height: '56px', background: 'var(--primary-color)' }}>
                <i className="bi bi-shield-lock text-white fs-3"></i>
              </div>
              <h3 className="fw-bold text-dark tracking-tight mb-2">Khôi phục mật khẩu</h3>
              <p className="text-muted small px-3">Nhập email công ty của bạn để nhận mã OTP xác nhận.</p>
            </div>

            <form onSubmit={handleSendOTP}>
              <div className="mb-4">
                <label className="form-label fw-bold text-muted small text-uppercase" style={{ letterSpacing: '0.05em' }}>Email</label>
                <div className="position-relative">
                  <i className="bi bi-envelope position-absolute top-50 translate-middle-y ms-3 text-muted"></i>
                  <input
                    type="email"
                    className="form-control form-control-custom py-3 ps-5 bg-light"
                    placeholder="e.g. an.nguyen@company.vn"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary-custom w-100 py-3 mb-4 fw-bold shadow-sm d-flex justify-content-center align-items-center" disabled={loading}>
                {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-send-fill me-2"></i>}
                Gửi mã OTP
              </button>
            </form>
          </>
        )}

        {/* ======== STEP 2: Nhập OTP 6 số ======== */}
        {step === 2 && (
          <>
            <div className="text-center mb-4">
              <div className="rounded-3 d-inline-flex align-items-center justify-content-center shadow-sm mb-3" style={{ width: '56px', height: '56px', background: 'var(--primary-color)' }}>
                <i className="bi bi-input-cursor-text text-white fs-3"></i>
              </div>
              <h3 className="fw-bold text-dark tracking-tight mb-2">Nhập mã xác nhận</h3>
              <p className="text-muted small px-2">
                Mã OTP 6 số đã được gửi đến <span className="fw-bold" style={{ color: 'var(--primary-color)' }}>{email}</span>
              </p>
            </div>

            <form onSubmit={handleVerifyOTP}>
              <div className="d-flex justify-content-center gap-2 mb-4" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => otpRefs.current[i] = el}
                    type="text"
                    inputMode="numeric"
                    className="form-control text-center fw-bold fs-4 rounded-3"
                    style={{
                      width: '52px', height: '60px',
                      border: digit ? '2px solid var(--primary-color)' : '2px solid #e5e7eb',
                      background: digit ? 'rgba(79, 70, 229, 0.05)' : '#f9fafb',
                      transition: 'all 0.2s ease',
                      color: 'var(--primary-color)',
                      caretColor: 'var(--primary-color)'
                    }}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    onFocus={handleFocus}
                  />
                ))}
              </div>

              <button type="submit" className="btn btn-primary-custom w-100 py-3 mb-3 fw-bold shadow-sm d-flex justify-content-center align-items-center" disabled={loading || otp.join('').length !== 6}>
                {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-check2-circle me-2"></i>}
                Xác nhận OTP
              </button>

              <div className="text-center">
                <button
                  type="button"
                  className="btn btn-link small text-decoration-none fw-bold p-0"
                  style={{ color: countdown > 0 ? '#9ca3af' : 'var(--primary-color)' }}
                  disabled={countdown > 0 || loading}
                  onClick={handleResendOTP}
                >
                  <i className="bi bi-arrow-repeat me-1"></i>
                  {countdown > 0 ? `Gửi lại mã sau ${countdown}s` : 'Gửi lại mã OTP'}
                </button>
              </div>
            </form>
          </>
        )}

        {/* ======== STEP 3: Đổi mật khẩu ======== */}
        {step === 3 && (
          <>
            <div className="text-center mb-4">
              <div className="rounded-3 d-inline-flex align-items-center justify-content-center shadow-sm mb-3" style={{ width: '56px', height: '56px', background: '#10b981' }}>
                <i className="bi bi-key-fill text-white fs-3"></i>
              </div>
              <h3 className="fw-bold text-dark tracking-tight mb-2">Tạo mật khẩu mới</h3>
              <p className="text-muted small px-3">Mật khẩu mới phải có ít nhất 6 ký tự.</p>
            </div>

            <form onSubmit={handleResetPassword}>
              <div className="mb-4">
                <label className="form-label fw-bold text-muted small text-uppercase" style={{ letterSpacing: '0.05em' }}>Mật khẩu mới</label>
                <div className="position-relative">
                  <i className="bi bi-lock position-absolute top-50 translate-middle-y ms-3 text-muted"></i>
                  <input
                    type="password"
                    className="form-control form-control-custom py-3 ps-5 bg-light"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label fw-bold text-muted small text-uppercase" style={{ letterSpacing: '0.05em' }}>Xác nhận mật khẩu</label>
                <div className="position-relative">
                  <i className="bi bi-lock-fill position-absolute top-50 translate-middle-y ms-3 text-muted"></i>
                  <input
                    type="password"
                    className="form-control form-control-custom py-3 ps-5 bg-light"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                {password && confirmPassword && password !== confirmPassword && (
                  <div className="small text-danger mt-2 fw-bold">
                    <i className="bi bi-exclamation-triangle me-1"></i> Mật khẩu không khớp
                  </div>
                )}
              </div>

              <button type="submit" className="btn btn-primary-custom w-100 py-3 mb-4 fw-bold shadow-sm d-flex justify-content-center align-items-center" disabled={loading || password !== confirmPassword}>
                {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-check2-circle me-2"></i>}
                Đổi mật khẩu
              </button>
            </form>
          </>
        )}

        {/* Back to login link */}
        <div className="text-center mt-3">
          <Link to="/" className="text-decoration-none small fw-bold hover-lift d-inline-block" style={{ color: 'var(--primary-color)' }}>
            <i className="bi bi-arrow-left me-1"></i> Quay lại trang đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}
