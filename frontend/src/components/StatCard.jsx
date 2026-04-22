export default function StatCard({ title, value, icon, color = 'var(--primary-color)' }) {
  return (
    <div className="card-custom position-relative animate-slide-up hover-lift glass-card" style={{ overflow: 'hidden' }}>
      {/* Decorative background shape */}
      <div style={{ 
          position: 'absolute', 
          top: '-10px', 
          right: '-10px', 
          width: '60px', 
          height: '60px', 
          background: color, 
          opacity: 0.05, 
          borderRadius: '50%',
          zIndex: 0 
      }}></div>

      <div className="position-relative" style={{ zIndex: 1 }}>
        <div className="d-flex align-items-center gap-3 mb-3">
          <div className="d-flex align-items-center justify-content-center rounded-3" style={{ width: '40px', height: '40px', backgroundColor: `${color}15`, color: color }}>
            <i className={`bi ${icon} fs-5`}></i>
          </div>
          <div className="stat-label">{title}</div>
        </div>
        
        <div className="stat-value" style={{ color: 'var(--text-dark)' }}>{value}</div>
        
        <div className="mt-2 small d-flex align-items-center">
          <span className="fw-bold me-1" style={{ color: 'var(--success-color)' }}>
            <i className="bi bi-graph-up-arrow me-1"></i>+12%
          </span>
          <span className="text-muted">vs last month</span>
        </div>
      </div>
    </div>
  );
}
