import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';

export default function Header() {
  const [notifications] = useState([
    { id: 1, title: 'Payroll Cycle Finalized', time: '2h ago', icon: 'bi-check-circle-fill', color: 'text-success' },
    { id: 2, title: 'New Employee Onboarded', time: '5h ago', icon: 'bi-person-plus-fill', color: 'text-primary' },
    { id: 3, title: 'Security Patch Deployment', time: '1d ago', icon: 'bi-shield-lock-fill', color: 'text-warning' }
  ]);
  
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : { username: 'Guest', role: 'user' };
  const displayName = user.username === 'Admin' ? 'Olivia Chen' : user.username;
  
  const navigate = useNavigate();
  const location = useLocation();

  // Simple breadcrumb logic
  const pathParts = location.pathname.split('/').filter(x => x);
  const pageTitle = pathParts.length > 0 ? pathParts[0].charAt(0).toUpperCase() + pathParts[0].slice(1) : 'Overview';

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <nav className="header-glass px-4 py-3 d-flex align-items-center justify-content-between sticky-top">
      {/* Search & Breadcrumbs */}
      <div className="d-flex align-items-center gap-4">
        <div className="d-none d-lg-block">
           <div className="d-flex align-items-center gap-2 text-muted extra-small fw-bold text-uppercase ls-wide">
              <span>DataPro</span>
              <i className="bi bi-chevron-right" style={{ fontSize: '0.6rem' }}></i>
              <span className="text-dark">{pageTitle}</span>
           </div>
        </div>
        
        <div className="search-input-wrapper d-none d-md-block" style={{ width: '300px' }}>
           <i className="bi bi-search position-absolute top-50 translate-middle-y ms-3 text-muted"></i>
           <input type="text" placeholder="Jump to command or search..." className="bg-light border-0" />
           <div className="position-absolute top-50 end-0 translate-middle-y me-3 d-flex gap-1">
              <span className="badge bg-white text-muted border py-1 px-2 extra-small">⌘</span>
              <span className="badge bg-white text-muted border py-1 px-2 extra-small">K</span>
           </div>
        </div>
      </div>

      <div className="d-flex align-items-center gap-4">
        {/* Support Link */}
        <a href="#" className="btn-icon d-none d-sm-flex" title="Support Documentation">
           <i className="bi bi-question-circle"></i>
        </a>

        {/* Notifications */}
        <div className="dropdown">
          <div 
            className="btn-icon position-relative" 
            role="button" 
            data-bs-toggle="dropdown" 
            aria-expanded="false"
          >
            <i className="bi bi-bell"></i>
            <span className="position-absolute top-0 end-0 translate-middle p-1 bg-danger border border-white rounded-circle" style={{ marginTop: '5px', marginRight: '2px' }}></span>
          </div>
          <ul className="dropdown-menu dropdown-menu-end shadow-lg border-0 mt-3 p-0 overflow-hidden glass-card" style={{ width: '320px', borderRadius: '16px' }}>
            <li className="p-3 border-bottom d-flex justify-content-between align-items-center bg-light bg-opacity-50">
              <span className="fw-bold text-dark">Recent Activity</span>
              <span className="badge bg-primary rounded-pill extra-small px-2">3 New</span>
            </li>
            <div className="max-h-80 overflow-y-auto">
              {notifications.map(notif => (
                <li key={notif.id} className="dropdown-item p-3 border-bottom d-flex align-items-start gap-3 transition-all">
                  <div className={`mt-1 flex-shrink-0 rounded-3 p-2 bg-light ${notif.color} bg-opacity-10 d-flex align-items-center justify-content-center`}>
                    <i className={`bi ${notif.icon}`}></i>
                  </div>
                  <div>
                    <div className="fw-bold text-dark small mb-0">{notif.title}</div>
                    <div className="text-muted extra-small">{notif.time}</div>
                  </div>
                </li>
              ))}
            </div>
            <li className="p-2 text-center">
              <button className="btn btn-link btn-sm text-decoration-none text-primary fw-bold">View Pipeline Log</button>
            </li>
          </ul>
        </div>

        {/* User Profile */}
        <div className="dropdown">
          <div className="d-flex align-items-center gap-2 hover-lift p-1 rounded-pill pe-2" role="button" data-bs-toggle="dropdown" aria-expanded="false">
            <div className="rounded-circle bg-primary bg-opacity-10 text-primary d-flex justify-content-center align-items-center fw-bold shadow-sm" style={{ width: '38px', height: '38px', border: '1px solid var(--primary-light)' }}>
              {displayName.charAt(0)}
            </div>
            <i className="bi bi-chevron-down extra-small text-muted opacity-50"></i>
          </div>
          <ul className="dropdown-menu dropdown-menu-end shadow-lg border-0 mt-3 p-2 glass-card" style={{ borderRadius: '16px', minWidth: '220px' }}>
            <li className="px-3 py-3 border-bottom mb-2">
               <div className="fw-bold text-dark">{displayName}</div>
               <div className="text-muted extra-small">{user.role?.toLowerCase() === 'admin' ? 'Admin' : 'User'} Authority</div>
            </li>
            <li>
              <Link className="dropdown-item fw-bold py-2 rounded-3 d-flex align-items-center gap-3" to="/profile">
                <i className="bi bi-person-circle text-muted"></i> User Profile
              </Link>
            </li>
            <li>
              <Link className="dropdown-item fw-bold py-2 rounded-3 d-flex align-items-center gap-3" to="/settings">
                <i className="bi bi-gear-fill text-muted"></i> System Prefs
              </Link>
            </li>
            <li><hr className="dropdown-divider opacity-50 my-2" /></li>
            <li>
              <button className="dropdown-item text-danger fw-bold py-2 rounded-3 d-flex align-items-center gap-3" onClick={handleLogout}>
                <i className="bi bi-box-arrow-right"></i> Sign Out
              </button>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}
