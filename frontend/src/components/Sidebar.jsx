import { Link, useLocation } from 'react-router-dom';
import { getCurrentUser } from '../utils/auth';
import { API_BASE, fetchAuth } from '../api';

const NAV_ITEMS = {
  admin: [
    {
      section: 'Main',
      items: [
        { path: '/', label: 'Dashboard', icon: 'bi-grid-fill' },
        { path: '/employees', label: 'Employees', icon: 'bi-people-fill' },
        { path: '/payroll', label: 'Payroll', icon: 'bi-cash-coin' },
        { path: '/attendance', label: 'Attendance', icon: 'bi-calendar-check-fill' },
        { path: '/reports', label: 'Reports', icon: 'bi-bar-chart-fill' },
        { path: '/alerts', label: 'Alerts', icon: 'bi-bell-fill' },
      ]
    },
    {
      section: 'Administration',
      items: [
        { path: '/users', label: 'System Users', icon: 'bi-person-gear' },
        { path: '/audit-logs', label: 'Audit Logs', icon: 'bi-shield-check' },
      ]
    }
  ],
  hr: [
    {
      section: 'Main',
      items: [
        { path: '/', label: 'Dashboard', icon: 'bi-grid-fill' },
        { path: '/employees', label: 'Employees', icon: 'bi-people-fill' },
        { path: '/attendance', label: 'Attendance', icon: 'bi-calendar-check-fill' },
        { path: '/reports', label: 'Reports', icon: 'bi-bar-chart-fill' },
        { path: '/alerts', label: 'Alerts', icon: 'bi-bell-fill' },
      ]
    }
  ],
  payroll: [
    {
      section: 'Main',
      items: [
        { path: '/', label: 'Dashboard', icon: 'bi-grid-fill' },
        { path: '/employees', label: 'Employees', icon: 'bi-people-fill' },
        { path: '/payroll', label: 'Payroll', icon: 'bi-cash-coin' },
        { path: '/attendance', label: 'Attendance', icon: 'bi-calendar-check-fill' },
        { path: '/reports', label: 'Reports', icon: 'bi-bar-chart-fill' },
        { path: '/alerts', label: 'Alerts', icon: 'bi-bell-fill' },
      ]
    }
  ],
  employee: [
    {
      section: 'My Account',
      items: [
        { path: '/profile', label: 'My Profile', icon: 'bi-person-circle' },
        { path: '/my-payroll', label: 'My Payroll', icon: 'bi-cash-coin' },
        { path: '/my-attendance', label: 'My Attendance', icon: 'bi-calendar-check-fill' },
      ]
    }
  ],
};

const ROLE_LABELS = {
  admin: 'Administrator',
  hr: 'HR Manager',
  payroll: 'Payroll Manager',
  employee: 'Employee',
};

export default function Sidebar() {
  const location = useLocation();
  const user = getCurrentUser();
  const role = user.normalizedRole || 'employee';
  const navGroups = NAV_ITEMS[role] || NAV_ITEMS.employee;
  const displayName = user.username || 'User';

  const handleLogout = () => {
    fetchAuth(`${API_BASE}/auth/logout`, { method: 'POST' }).finally(() => {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      window.location.href = '/';
    });
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="sidebar-area">
      {/* Logo */}
      <div className="sidebar-logo">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 36, height: 36, background: 'var(--sidebar-active-bg)',
            borderRadius: '10px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexShrink: 0
          }}>
            <i className="bi bi-intersect" style={{ color: '#fff', fontSize: '1rem' }}></i>
          </div>
          <div>
            <div className="sidebar-logo-text">System Integration</div>
            <div className="sidebar-logo-sub">Project Dashboard</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: 8 }}>
        {navGroups.map((group) => (
          <div key={group.section}>
            <div className="sidebar-section-label">{group.section}</div>
            {group.items.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`sidebar-nav-link ${isActive(item.path) ? 'active' : ''}`}
              >
                <i className={`bi ${item.icon}`}></i>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        ))}
      </div>

      {/* User Footer */}
      <div className="sidebar-footer">
        <Link to="/profile" className="sidebar-user-card" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 4 }}>
          <div className="sidebar-avatar">{displayName.charAt(0).toUpperCase()}</div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{ color: '#fff', fontSize: '0.8125rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {displayName}
            </div>
            <div style={{ color: 'var(--sidebar-text)', fontSize: '0.7rem', opacity: 0.7 }}>
              {ROLE_LABELS[role] || 'User'}
            </div>
          </div>
        </Link>
        <button
          onClick={handleLogout}
          className="sidebar-nav-link"
          style={{ color: '#f87171', width: '100%', textAlign: 'left' }}
        >
          <i className="bi bi-box-arrow-right"></i>
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
