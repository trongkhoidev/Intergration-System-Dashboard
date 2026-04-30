import { useEffect, useState } from 'react';
import { API_BASE, fetchAuth } from '../api';
import { getCurrentUser } from '../utils/auth';

const ROLE_LABELS = {
  Admin: 'Quản trị hệ thống',
  admin: 'Quản trị hệ thống',
  HR: 'Quản lý nhân sự',
  hr: 'Quản lý nhân sự',
  Payroll: 'Quản lý tài chính',
  payroll: 'Quản lý tài chính',
  Employee: 'Nhân viên',
  employee: 'Nhân viên',
};

export default function Profile() {
  const user = getCurrentUser();
  const [profileData, setProfileData] = useState(null);
  const [showPwModal, setShowPwModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [pwForm, setPwForm] = useState({ current_pw: '', new_pw: '', confirm_pw: '' });
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
      setMsg({ type: 'danger', text: 'Mật khẩu xác nhận không khớp!' });
      return;
    }
    if (pwForm.new_pw.length < 6) {
      setMsg({ type: 'danger', text: 'Mật khẩu mới phải có ít nhất 6 ký tự!' });
      return;
    }
    setLoading(true);
    fetchAuth(`${API_BASE}/password`, {
      method: 'PUT',
      body: JSON.stringify({
        username: user.username,
        current_password: pwForm.current_pw,
        new_password: pwForm.new_pw
      }),
    }).then(r => r.json()).then(d => {
      setLoading(false);
      if (d.status === 'success') {
        showToast('Đổi mật khẩu thành công!');
        setShowPwModal(false);
        setPwForm({ current_pw: '', new_pw: '', confirm_pw: '' });
        setMsg(null);
      } else {
        setMsg({ type: 'danger', text: d.msg || 'Đổi mật khẩu thất bại' });
      }
    }).catch(() => {
      setLoading(false);
      setMsg({ type: 'danger', text: 'Lỗi kết nối server' });
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
        showToast('Cập nhật hồ sơ thành công!');
        setShowEditModal(false);
        fetchProfile();
      } else {
        showToast(d.msg || 'Cập nhật thất bại', 'danger');
      }
    }).catch(() => {
        setLoading(false);
        showToast('Lỗi kết nối máy chủ', 'danger');
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
              <div className="fw-bold">{toast.type === 'success' ? 'Thành công' : 'Lỗi'}</div>
              <div className="small opacity-75">{toast.text}</div>
            </div>
          </div>
        </div>
      )}

      <div className="page-header mb-5">
        <div>
          <h1 className="page-title">Hồ sơ cá nhân</h1>
          <p className="page-subtitle">Quản lý thông tin cá nhân và thiết lập bảo mật</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline" onClick={() => setShowEditModal(true)}>
            <i className="bi bi-pencil-square me-2"></i> Sửa hồ sơ
          </button>
          <button className="btn btn-primary" onClick={() => setShowPwModal(true)}>
            <i className="bi bi-shield-lock-fill me-2"></i> Bảo mật
          </button>
        </div>
      </div>

      <div className="row g-4">
        {/* Cột trái: Thông tin cơ bản */}
        <div className="col-lg-4">
            <div className="card border-0 shadow-sm h-100 text-center p-4">
                <div className="d-flex justify-content-center mb-4">
                    <div className="avatar bg-primary text-white" style={{ width: '100px', height: '100px', fontSize: '2.5rem' }}>
                        {displayName.charAt(0).toUpperCase()}
                    </div>
                </div>
                <h3 className="fw-bold text-dark mb-1">{displayName}</h3>
                <p className="text-muted mb-3 fs-6">@{user.username}</p>
                <div className="mb-4">
                    <span className="badge badge-info px-3 py-2">{ROLE_LABELS[user.role] || user.role}</span>
                </div>
                
                <hr className="my-4 border-light-subtle"/>

                <div className="d-flex flex-column gap-3 text-start">
                    <div className="d-flex align-items-center gap-3">
                        <div className="avatar bg-primary-light text-primary" style={{ width: '42px', height: '42px' }}>
                            <i className="bi bi-envelope fs-5"></i>
                        </div>
                        <div>
                            <div className="small text-muted fw-semibold text-uppercase">Email liên hệ</div>
                            <div className="fw-bold text-dark">{profileData?.Email || user.email}</div>
                        </div>
                    </div>
                    <div className="d-flex align-items-center gap-3">
                        <div className="avatar bg-success-light text-success" style={{ width: '42px', height: '42px' }}>
                            <i className="bi bi-telephone fs-5"></i>
                        </div>
                        <div>
                            <div className="small text-muted fw-semibold text-uppercase">Số điện thoại</div>
                            <div className="fw-bold text-dark">{profileData?.PhoneNumber || 'Chưa cập nhật'}</div>
                        </div>
                    </div>
                </div>

                <div className="mt-auto pt-5">
                    <button className="btn btn-outline-danger w-100 py-2 fw-bold" onClick={handleLogout}>
                        <i className="bi bi-box-arrow-right me-2"></i> Đăng xuất hệ thống
                    </button>
                </div>
            </div>
        </div>

        {/* Cột phải: Thông tin công việc chi tiết */}
        <div className="col-lg-8">
            <div className="card border-0 shadow-sm h-100">
                <div className="p-4 border-bottom d-flex justify-content-between align-items-center">
                    <h5 className="fw-bold m-0 text-dark"><i className="bi bi-person-lines-fill text-primary me-2"></i>Thông tin công việc</h5>
                    <span className={`badge ${profileData?.Status === 'Active' ? 'badge-active' : 'badge-inactive'}`}>
                        {profileData?.Status === 'Active' ? 'Đang làm việc' : (profileData?.Status || 'Active')}
                    </span>
                </div>
                
                <div className="p-4">
                    <div className="row g-4">
                        <div className="col-md-6">
                            <div className="p-3 bg-light rounded-4 border border-light-subtle h-100">
                                <div className="small text-muted fw-bold text-uppercase mb-1">Phòng ban</div>
                                <div className="fs-5 fw-bold text-dark">{profileData?.Department || 'Chưa phân bổ'}</div>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="p-3 bg-light rounded-4 border border-light-subtle h-100">
                                <div className="small text-muted fw-bold text-uppercase mb-1">Vị trí chức vụ</div>
                                <div className="fs-5 fw-bold text-dark">{profileData?.Position || 'Chưa phân bổ'}</div>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="p-3 bg-light rounded-4 border border-light-subtle h-100">
                                <div className="small text-muted fw-bold text-uppercase mb-1">Ngày gia nhập</div>
                                <div className="fs-5 fw-bold text-dark">
                                    {profileData?.HireDate ? new Date(profileData.HireDate).toLocaleDateString('vi-VN') : '—'}
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="p-3 bg-light rounded-4 border border-light-subtle h-100">
                                <div className="small text-muted fw-bold text-uppercase mb-1">Giới tính</div>
                                <div className="fs-5 fw-bold text-dark">{profileData?.Gender || '—'}</div>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="p-3 bg-light rounded-4 border border-light-subtle h-100">
                                <div className="small text-muted fw-bold text-uppercase mb-1">Ngày sinh</div>
                                <div className="fs-5 fw-bold text-dark">
                                    {profileData?.DateOfBirth ? new Date(profileData.DateOfBirth).toLocaleDateString('vi-VN') : '—'}
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
              <h4 className="modal-title fw-bold">Chỉnh sửa thông tin</h4>
              <button className="btn-icon" onClick={() => setShowEditModal(false)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <form onSubmit={handleUpdateProfile}>
              <div className="modal-body p-4">
                <div className="form-group mb-4">
                  <label className="form-label fw-bold">Họ và tên</label>
                  <input
                    type="text" required className="form-control py-2"
                    value={editForm.FullName}
                    onChange={e => setEditForm({ ...editForm, FullName: e.target.value })}
                  />
                </div>
                <div className="form-group mb-2">
                  <label className="form-label fw-bold">Số điện thoại</label>
                  <input
                    type="text" className="form-control py-2"
                    value={editForm.PhoneNumber}
                    onChange={e => setEditForm({ ...editForm, PhoneNumber: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer bg-light rounded-bottom-4">
                <button type="button" className="btn btn-outline fw-bold" onClick={() => setShowEditModal(false)}>Huỷ bỏ</button>
                <button type="submit" className="btn btn-primary fw-bold" disabled={loading}>
                  {loading && <span className="spinner-border spinner-border-sm me-2"></span>}
                  Lưu thay đổi
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
              <h4 className="modal-title fw-bold">Đổi mật khẩu</h4>
              <button className="btn-icon" onClick={() => { setShowPwModal(false); setMsg(null); setPwForm({ current_pw: '', new_pw: '', confirm_pw: '' }); }}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <form onSubmit={handleChangePassword}>
              <div className="modal-body p-4">
                {msg && (
                  <div className={`alert alert-${msg.type} mb-4 d-flex align-items-center gap-2 border-0`}>
                    <i className={`bi bi-${msg.type === 'success' ? 'check-circle-fill' : 'exclamation-triangle-fill'} fs-5`}></i>
                    <span className="fw-medium">{msg.text}</span>
                  </div>
                )}
                <div className="form-group mb-3">
                  <label className="form-label fw-bold">Mật khẩu hiện tại</label>
                  <input
                    type="password" required className="form-control py-2"
                    value={pwForm.current_pw}
                    onChange={e => setPwForm({ ...pwForm, current_pw: e.target.value })}
                  />
                </div>
                <div className="form-group mb-3">
                  <label className="form-label fw-bold">Mật khẩu mới (ít nhất 6 ký tự)</label>
                  <input
                    type="password" required className="form-control py-2"
                    value={pwForm.new_pw}
                    onChange={e => setPwForm({ ...pwForm, new_pw: e.target.value })}
                  />
                </div>
                <div className="form-group mb-2">
                  <label className="form-label fw-bold">Xác nhận mật khẩu mới</label>
                  <input
                    type="password" required className="form-control py-2"
                    value={pwForm.confirm_pw}
                    onChange={e => setPwForm({ ...pwForm, confirm_pw: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer bg-light rounded-bottom-4">
                <button type="button" className="btn btn-outline fw-bold" onClick={() => { setShowPwModal(false); setMsg(null); setPwForm({ current_pw: '', new_pw: '', confirm_pw: '' }); }}>Huỷ bỏ</button>
                <button type="submit" className="btn btn-primary fw-bold" disabled={loading}>
                  {loading && <span className="spinner-border spinner-border-sm me-2"></span>}
                  Cập nhật mật khẩu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
