import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getCurrentUser } from '../utils/auth';
import { API_BASE, fetchAuth } from '../api';

export default function Header() {
  const user = getCurrentUser();
  const displayName = user.username || 'User';
  const [showNotifs, setShowNotifs] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const dropRef = useRef(null);

  useEffect(() => {
    fetchAuth(`${API_BASE}/alerts`)
      .then(r => r.json())
      .then(data => {
        let loadedAlerts = Array.isArray(data) ? data : [];
        const role = user.role?.toLowerCase() || 'employee';
        if (role === 'hr') {
          loadedAlerts = loadedAlerts.filter(a => ['Excessive leave', 'Birthday', 'Work anniversary'].includes(a.type));
        } else if (role === 'payroll') {
          loadedAlerts = loadedAlerts.filter(a => a.type === 'Salary anomaly');
        }
        setAlerts(loadedAlerts.slice(0, 5));
      })
      .catch(() => {});
  }, [user.role]);

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    fetchAuth(`${API_BASE}/auth/logout`, { method: 'POST' }).finally(() => {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      window.location.href = '/';
    });
  };

  const severityColor = { critical: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };

  return (
    <div className="topbar-area">
      {/* Search */}
      <div className="search-wrapper" style={{ flex: 1, maxWidth: 360 }}>
        <i className="bi bi-search search-icon"></i>
        <input type="text" placeholder="Search employees, reports..." style={{ paddingRight: 12 }} />
      </div>

      {/* Right actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
        {/* Notifications */}
        <div style={{ position: 'relative' }} ref={dropRef}>
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="btn-icon"
            style={{ position: 'relative', fontSize: '1.1rem' }}
          >
            <i className="bi bi-bell"></i>
            {alerts.length > 0 && (
              <span style={{
                position: 'absolute', top: 4, right: 4,
                width: 8, height: 8, borderRadius: '50%',
                background: '#ef4444', border: '2px solid #fff'
              }}></span>
            )}
          </button>

          {showNotifs && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 8,
              width: 320, background: '#fff', borderRadius: 12,
              border: '1px solid var(--border-color)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.12)', zIndex: 500,
            }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>Alerts</span>
                <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 9999 }}>{alerts.length}</span>
              </div>
              {alerts.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No active alerts</div>
              ) : (
                alerts.map((a, i) => (
                  <div key={i} style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: severityColor[a.severity] || '#94a3b8',
                      marginTop: 6, flexShrink: 0
                    }}></div>
                    <div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-dark)' }}>{a.type}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.message}</div>
                    </div>
                  </div>
                ))
              )}
              <Link to="/alerts" onClick={() => setShowNotifs(false)} style={{ display: 'block', padding: '12px 16px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)', textDecoration: 'none', borderTop: '1px solid var(--border-color)' }}>
                View all alerts →
              </Link>
            </div>
          )}
        </div>

        {/* User info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 8, borderLeft: '1px solid var(--border-color)' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'var(--primary-light)', color: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: '0.875rem'
          }}>{displayName.charAt(0).toUpperCase()}</div>
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-dark)' }}>{displayName}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user.role}</div>
          </div>
          <button onClick={handleLogout} className="btn-icon btn-danger-icon" title="Logout" style={{ marginLeft: 4 }}>
            <i className="bi bi-box-arrow-right"></i>
          </button>
        </div>
      </div>
    </div>
  );
}
