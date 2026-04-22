export default function ChartCard({ title, children, actions, subtitle }) {
  return (
    <div className="chart-card animate-slide-up hover-lift glass-card">
      <div className="chart-header">
        <div>
          <h5 className="chart-title mb-1">{title}</h5>
          {subtitle && <p className="text-muted extra-small mb-0" style={{ fontSize: '0.7rem' }}>{subtitle}</p>}
        </div>
        {actions && (
          <div className="chart-actions">
            {actions}
          </div>
        )}
      </div>
      <div className="chart-body" style={{ height: '320px', position: 'relative' }}>
        {children}
      </div>
    </div>
  );
}
