import { Link, useLocation } from "react-router-dom";
import { getCurrentUser } from "../utils/auth";

export default function Sidebar() {
  const location = useLocation();
  const user = getCurrentUser();
  const role = user.normalizedRole;
  const displayName = user.username || 'User';

  // RBAC Sidebar menus per role
  const allLinks = {
    management: [
      { path: "/", label: "Dashboard", icon: "bi-grid-1x2-fill", roles: ["admin", "hr", "payroll"] },
      { path: "/employees", label: "Employees", icon: "bi-people-fill", roles: ["admin", "hr"] },
    ],
    operations: [
      { path: "/payroll", label: "Payroll", icon: "bi-bank2", roles: ["admin", "hr", "payroll"] },
      { path: "/attendance", label: "Attendance", icon: "bi-calendar2-range-fill", roles: ["admin", "hr", "payroll"] },
    ],
    intelligence: [
      { path: "/reports", label: "Reports", icon: "bi-file-earmark-medical-fill", roles: ["admin", "hr", "payroll"] },
      { path: "/alerts", label: "Alerts", icon: "bi-shield-fill-exclamation", roles: ["admin", "hr", "payroll"] },
    ],
    administration: [
      { path: "/users", label: "System Identities", icon: "bi-person-lines-fill", roles: ["admin"] },
      { path: "/audit-logs", label: "Audit Logs", icon: "bi-journal-code", roles: ["admin"] },
    ]
  };

  const filterByRole = (links) => links.filter(l => l.roles.includes(role));

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

  const mgmt = filterByRole(allLinks.management);
  const ops = filterByRole(allLinks.operations);
  const intel = filterByRole(allLinks.intelligence);
  const adminLinks = filterByRole(allLinks.administration);
  const hasAnyLinks = mgmt.length > 0 || ops.length > 0 || intel.length > 0 || adminLinks.length > 0;

  const roleBadge = {
    admin: { label: "Admin", color: "text-primary" },
    hr: { label: "HR Manager", color: "text-success" },
    payroll: { label: "Payroll Manager", color: "text-warning" },
    employee: { label: "Employee", color: "text-secondary" },
  };
  const badge = roleBadge[role] || roleBadge.employee;

  return (
    <div className="sidebar-custom d-flex flex-column" style={{ width: "280px", minHeight: "100vh", backgroundColor: '#fff', borderRight: '1px solid var(--border-color)' }}>
      {/* Brand Identity */}
      <div className="px-4 py-5 mb-2">
         <div className="d-flex align-items-center gap-2 mb-1">
            <div className="bg-primary rounded-3 d-flex align-items-center justify-content-center shadow-sm" style={{ width: '32px', height: '32px' }}>
                <i className="bi bi-hexagon-half text-white fs-6"></i>
            </div>
            <span className="fw-bold fs-5 tracking-tight text-dark">System <span className="text-primary">Integration</span></span>
         </div>
         <p className="extra-small text-muted fw-bold text-uppercase ls-wide mb-0">HR & Payroll Dashboard</p>
      </div>

      <div className="flex-grow-1 px-3 overflow-auto">
        {hasAnyLinks ? (
          <>
            {mgmt.length > 0 && (
              <div className="nav-group mb-4">
                <div className="px-3 extra-small fw-bold text-muted text-uppercase ls-wide mb-2 opacity-50">Management</div>
                <div className="list-group list-group-flush">
                   {mgmt.map(renderLink)}
                </div>
              </div>
            )}

            {ops.length > 0 && (
              <div className="nav-group mb-4">
                <div className="px-3 extra-small fw-bold text-muted text-uppercase ls-wide mb-2 opacity-50">Operations</div>
                <div className="list-group list-group-flush">
                   {ops.map(renderLink)}
                </div>
              </div>
            )}

            {intel.length > 0 && (
              <div className="nav-group mb-4">
                <div className="px-3 extra-small fw-bold text-muted text-uppercase ls-wide mb-2 opacity-50">Intelligence</div>
                <div className="list-group list-group-flush">
                   {intel.map(renderLink)}
                </div>
              </div>
            )}

            {adminLinks.length > 0 && (
              <div className="nav-group mb-4">
                <div className="px-3 extra-small fw-bold text-muted text-uppercase ls-wide mb-2 opacity-50">Administration</div>
                <div className="list-group list-group-flush">
                   {adminLinks.map(renderLink)}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-4 text-center mt-5">
             <div className="bg-light rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style={{ width: '60px', height: '60px' }}>
                <i className="bi bi-shield-lock text-muted fs-4"></i>
             </div>
             <p className="extra-small text-muted fw-bold text-uppercase ls-wide">Employee Portal</p>
             <p className="extra-small text-muted mb-0">You can view your profile and personal info.</p>
          </div>
        )}
      </div>

      {/* Mini Profile Footer */}
      <div className="mt-auto p-3 border-top bg-light bg-opacity-50">
        <div className="d-flex align-items-center p-2 rounded-4" style={{ backgroundColor: 'white', border: '1px solid rgba(0,0,0,0.05)' }}>
          <Link to="/profile" className="text-decoration-none d-flex align-items-center flex-grow-1 hover-lift">
            <div className="rounded-circle bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center fw-bold me-3 shadow-sm" style={{ width: '40px', height: '40px' }}>
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
               <div className="small fw-bold text-dark text-truncate">{displayName}</div>
               <div className={`extra-small fw-bold text-uppercase ${badge.color}`} style={{ fontSize: '0.6rem', letterSpacing: '0.05em' }}>{badge.label}</div>
            </div>
          </Link>
          <button 
            className="btn btn-sm btn-light border-0 ms-2 text-danger" 
            onClick={() => { localStorage.removeItem('user'); localStorage.removeItem('token'); window.location.href='/'; }}
            title="Log Out"
          >
            <i className="bi bi-box-arrow-right fs-5"></i>
          </button>
        </div>
      </div>
    </div>
  );
}
