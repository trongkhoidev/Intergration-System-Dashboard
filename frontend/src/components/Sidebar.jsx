import { Link, useLocation } from 'react-router-dom';
import { getCurrentUser } from '../utils/auth';
import { API_BASE, fetchAuth } from '../api';

const NAV_ITEMS = {
  admin: [
    {
      section: 'Main',
      items: [
        { path: '/', label: 'Dashboard', icon: 'bi-grid-fill', color: '#22d3ee' }, // Cyan
        { path: '/employees', label: 'Employees', icon: 'bi-people-fill', color: '#818cf8' }, // Indigo
        { path: '/payroll', label: 'Payroll', icon: 'bi-cash-coin', color: '#fbbf24' }, // Amber
        { path: '/attendance', label: 'Attendance', icon: 'bi-calendar-check-fill', color: '#34d399' }, // Emerald
        { path: '/reports', label: 'Reports', icon: 'bi-bar-chart-fill', color: '#a78bfa' }, // Violet
        { path: '/alerts', label: 'Alerts', icon: 'bi-bell-fill', color: '#fb7185' }, // Rose
      ]
    },
    {
      section: 'Administration',
      items: [
        { path: '/users', label: 'System Users', icon: 'bi-person-gear', color: '#94a3b8' }, // Slate
        { path: '/audit-logs', label: 'Audit Logs', icon: 'bi-shield-check', color: '#2dd4bf' }, // Teal
      ]
    }
  ],
  hr: [
    {
      section: 'Main',
      items: [
        { path: '/', label: 'Dashboard', icon: 'bi-grid-fill', color: '#22d3ee' },
        { path: '/employees', label: 'Employees', icon: 'bi-people-fill', color: '#818cf8' },
        { path: '/attendance', label: 'Attendance', icon: 'bi-calendar-check-fill', color: '#34d399' },
        { path: '/reports', label: 'Reports', icon: 'bi-bar-chart-fill', color: '#a78bfa' },
        { path: '/alerts', label: 'Alerts', icon: 'bi-bell-fill', color: '#fb7185' },
      ]
    }
  ],
  payroll: [
    {
      section: 'Main',
      items: [
        { path: '/', label: 'Dashboard', icon: 'bi-grid-fill', color: '#22d3ee' },
        { path: '/employees', label: 'Employees', icon: 'bi-people-fill', color: '#818cf8' },
        { path: '/payroll', label: 'Payroll', icon: 'bi-cash-coin', color: '#fbbf24' },
        { path: '/attendance', label: 'Attendance', icon: 'bi-calendar-check-fill', color: '#34d399' },
        { path: '/reports', label: 'Reports', icon: 'bi-bar-chart-fill', color: '#a78bfa' },
        { path: '/alerts', label: 'Alerts', icon: 'bi-bell-fill', color: '#fb7185' },
      ]
    }
  ],
  employee: [
    {
      section: 'My Account',
      items: [
        { path: '/profile', label: 'My Profile', icon: 'bi-person-circle', color: '#38bdf8' }, // Sky
        { path: '/my-payroll', label: 'My Payroll', icon: 'bi-cash-coin', color: '#fbbf24' },
        { path: '/my-attendance', label: 'My Attendance', icon: 'bi-calendar-check-fill', color: '#34d399' },
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
      <div className="sidebar-logo" style={{ padding: '28px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: 42, height: 42,
            background: 'var(--primary-gradient)',
            borderRadius: '12px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexShrink: 0,
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)'
          }}>
            <i className="bi bi-intersect" style={{ color: '#fff', fontSize: '1.25rem' }}></i>
          </div>
          <div>
            <div className="sidebar-logo-text">System Integration</div>
            <div className="sidebar-logo-sub" style={{ color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, fontSize: '0.65rem' }}>Enterprise System</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0' }}>
        {navGroups.map((group) => (
          <div key={group.section} style={{ marginBottom: '20px' }}>
            <div className="sidebar-section-label" style={{ paddingLeft: '24px', opacity: 0.4 }}>{group.section}</div>
            {group.items.map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`sidebar-nav-link ${active ? 'active' : ''}`}
                  style={{
                    position: 'relative',
                    margin: '2px 12px',
                    padding: '10px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    borderRadius: '10px',
                    backgroundColor: active ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                    color: active ? '#fff' : 'rgba(255,255,255,0.5)',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >
                  {/* Active Indicator Bar */}
                  {active && (
                    <div style={{
                      position: 'absolute',
                      left: '-12px',
                      width: '4px',
                      height: '20px',
                      backgroundColor: '#3b82f6',
                      borderRadius: '0 4px 4px 0',
                      boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)'
                    }}></div>
                  )}

                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: active ? 'rgba(255,255,255,0.05)' : 'transparent',
                    color: item.color || '#fff',
                    fontSize: '1.1rem'
                  }}>
                    <i className={`bi ${item.icon}`}></i>
                  </div>
                  <span style={{ fontWeight: active ? 600 : 500, fontSize: '0.9rem' }}>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* User Footer */}
      <div className="sidebar-footer" style={{
        padding: '24px 16px',
        marginTop: 'auto'
      }}>
        <Link to="/profile" className="sidebar-user-card" style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          textDecoration: 'none',
          marginBottom: 8,
          padding: '8px',
          borderRadius: '12px',
          transition: 'all 0.2s'
        }}>
          <div className="sidebar-avatar" style={{
            width: 40, height: 40,
            background: 'var(--primary-gradient)',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
          }}>
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{ color: '#fff', fontSize: '0.875rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {displayName}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: 500 }}>
              {ROLE_LABELS[role] || 'User'}
            </div>
          </div>
        </Link>
        <button
          onClick={handleLogout}
          className="sidebar-nav-link"
          style={{
            color: '#fb7185',
            width: '100%',
            textAlign: 'left',
            padding: '10px 16px',
            backgroundColor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            borderRadius: '10px'
          }}
        >
          <i className="bi bi-box-arrow-right" style={{ fontSize: '1.1rem' }}></i>
          <span style={{ fontWeight: 500 }}>Logout</span>
        </button>
      </div>
    </div>
  );
}
