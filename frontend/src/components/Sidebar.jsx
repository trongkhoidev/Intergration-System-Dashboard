import { Link, useLocation } from "react-router-dom";

export default function Sidebar() {
  const location = useLocation();
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : { username: 'Guest', role: 'user' };
  const isAdmin = user.role?.toLowerCase() === 'admin';
  const displayName = user.username === 'Admin' ? 'Olivia Chen' : user.username;

  const managementLinks = [
    { path: "/", label: "Dashboard", icon: "bi-grid-1x2-fill" },
    { path: "/employees", label: "Talent Directory", icon: "bi-people-fill" },
  ];

  const operationalLinks = [
    { path: "/payroll", label: "Financial Registry", icon: "bi-bank2" },
    { path: "/attendance", label: "Presence Logs", icon: "bi-calendar2-range-fill" },
  ];

  const systemLinks = [
    { path: "/reports", label: "Audit Reports", icon: "bi-file-earmark-medical-fill" },
    { path: "/alerts", label: "System Alerts", icon: "bi-shield-fill-exclamation" },
  ];

  const renderLink = (link) => {
    const isActive = location.pathname === link.path || 
      (link.path !== '/' && location.pathname.startsWith(link.path));

    return (
      <Link
        key={link.path}
        to={link.path}
        className={`list-group-item list-group-item-action sidebar-nav-item border-0 mb-1 rounded-3 ${isActive ? "active-nav-item" : ""}`}
      >
        <div className="d-flex align-items-center gap-3 py-1">
          <i className={`bi ${link.icon} fs-5 ${isActive ? 'text-primary' : 'text-muted'}`}></i>
          <span className={`small fw-bold ${isActive ? 'text-dark' : 'text-secondary'}`}>{link.label}</span>
        </div>
      </Link>
    );
  };

  return (
    <div className="sidebar-custom d-flex flex-column" style={{ width: "280px", minHeight: "100vh", backgroundColor: '#fff', borderRight: '1px solid var(--border-color)' }}>
      {/* Brand Identity */}
      <div className="px-4 py-5 mb-2">
         <div className="d-flex align-items-center gap-2 mb-1">
            <div className="bg-primary rounded-3 d-flex align-items-center justify-content-center shadow-sm" style={{ width: '32px', height: '32px' }}>
                <i className="bi bi-hexagon-half text-white fs-6"></i>
            </div>
            <span className="fw-bold fs-5 tracking-tight text-dark">DataPro <span className="text-primary">SI</span></span>
         </div>
         <p className="extra-small text-muted fw-bold text-uppercase ls-wide mb-0">Enterprise Resource Hub</p>
      </div>

      <div className="flex-grow-1 px-3 overflow-auto">
        {isAdmin && (
          <>
            <div className="nav-group mb-4">
              <div className="px-3 extra-small fw-bold text-muted text-uppercase ls-wide mb-2 opacity-50">Management</div>
              <div className="list-group list-group-flush">
                 {managementLinks.map(renderLink)}
              </div>
            </div>

            <div className="nav-group mb-4">
              <div className="px-3 extra-small fw-bold text-muted text-uppercase ls-wide mb-2 opacity-50">Operations</div>
              <div className="list-group list-group-flush">
                 {operationalLinks.map(renderLink)}
              </div>
            </div>

            <div className="nav-group mb-4">
              <div className="px-3 extra-small fw-bold text-muted text-uppercase ls-wide mb-2 opacity-50">Intelligence</div>
              <div className="list-group list-group-flush">
                 {systemLinks.map(renderLink)}
              </div>
            </div>
          </>
        )}
        
        {!isAdmin && (
          <div className="p-4 text-center mt-5">
             <div className="bg-light rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style={{ width: '60px', height: '60px' }}>
                <i className="bi bi-shield-lock text-muted fs-4"></i>
             </div>
             <p className="extra-small text-muted fw-bold text-uppercase ls-wide">Restricted Access</p>
             <p className="extra-small text-muted mb-0">Admin permissions required for full dashboard.</p>
          </div>
        )}
      </div>

      {/* Mini Profile Footer */}
      <div className="mt-auto p-3 border-top bg-light bg-opacity-50">
        <Link to="/profile" className="text-decoration-none">
          <div className="d-flex align-items-center p-2 rounded-4 hover-lift" style={{ backgroundColor: 'white', border: '1px solid rgba(0,0,0,0.05)' }}>
            <div className="rounded-circle bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center fw-bold me-3 shadow-sm" style={{ width: '40px', height: '40px' }}>
              {displayName.charAt(0)}
            </div>
            <div className="overflow-hidden">
               <div className="small fw-bold text-dark text-truncate">{displayName}</div>
               <div className="extra-small text-muted text-uppercase fw-bold" style={{ fontSize: '0.6rem', letterSpacing: '0.05em' }}>{user.role}</div>
            </div>
            <i className="bi bi-chevron-right ms-auto extra-small text-muted opacity-50"></i>
          </div>
        </Link>
      </div>
    </div>
  );
}
