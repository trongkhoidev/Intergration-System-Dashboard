import { useEffect, useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import { API_BASE, fetchAuth } from '../api';
import { Link } from 'react-router-dom';
import { getCurrentUser } from '../utils/auth';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

function StatusBadge({ status }) {
  const map = { 'Active': 'badge-active', 'Inactive': 'badge-inactive', 'On Leave': 'badge-leave', 'Probation': 'badge-probation' };
  return <span className={`badge ${map[status] || 'badge-inactive'}`}>{status || 'Unknown'}</span>;
}

function StatCard({ title, value, icon, gradient, sub, subIcon }) {
  return (
    <div className="card border-0 p-4 h-100 shadow-sm overflow-hidden position-relative">
      <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '80px', height: '80px', background: gradient, opacity: 0.1, borderRadius: '50%' }}></div>
      <div className="d-flex align-items-center gap-3 mb-3">
        <div className="stat-card-icon shadow-sm" style={{ background: gradient, color: '#fff', width: 48, height: 48, borderRadius: 12 }}>
          <i className={`bi ${icon}`} style={{ fontSize: '1.4rem' }}></i>
        </div>
        <div>
          <div className="stat-card-label" style={{ marginBottom: 0 }}>{title}</div>
          <div className="stat-card-value" style={{ fontSize: '1.75rem' }}>{value}</div>
        </div>
      </div>
      <div className="d-flex align-items-center gap-1 mt-auto">
        <span className={`small fw-bold ${sub.includes('+') ? 'text-success' : 'text-muted'}`}>
          <i className={`bi ${subIcon} me-1`}></i>
          {sub}
        </span>
        <span className="small text-light opacity-75">vs last month</span>
      </div>
    </div>
  );
}

const CHART_OPTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#0f172a',
      padding: 12,
      cornerRadius: 10,
      titleFont: { size: 13, weight: '700' },
      bodyFont: { size: 12 },
      displayColors: false
    }
  },
  scales: {
    y: { beginAtZero: true, grid: { color: '#f1f5f9', borderDash: [5, 5] }, ticks: { color: '#94a3b8', font: { size: 11 } } },
    x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 } } }
  }
};

export default function Dashboard() {
  const user = getCurrentUser();
  const [stats, setStats] = useState({ totalEmployees: 0, payrollTotal: 0, attendanceRate: 0 });
  const [performance, setPerformance] = useState({ labels: [], revenue: [], expenses: [] });
  const [payrollBreakdown, setPayrollBreakdown] = useState({ labels: [], data: [] });
  const [statusData, setStatusData] = useState({ labels: [], data: [] });
  const [recentEmployees, setRecentEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchAuth(`${API_BASE}/dashboard/stats`).then(r => r.json()),
      fetchAuth(`${API_BASE}/dashboard/performance`).then(r => r.json()),
      fetchAuth(`${API_BASE}/payroll/summary`).then(r => r.json()),
      fetchAuth(`${API_BASE}/dashboard/status-overview`).then(r => r.json()),
      fetchAuth(`${API_BASE}/employees`).then(r => r.json())
    ]).then(([st, perf, paySummary, statusRaw, emps]) => {
      setStats(st || {});
      setPerformance(perf || { labels: [], revenue: [], expenses: [] });
      
      // Process Payroll Distribution (Doughnut)
      const payDepts = paySummary.Breakdown || [];
      setPayrollBreakdown({
        labels: payDepts.map(d => `Dept ${d.DepartmentID}`),
        data: payDepts.map(d => d.Amount)
      });

      // Process Status Distribution (Bar)
      setStatusData({
        labels: Object.keys(statusRaw),
        data: Object.values(statusRaw)
      });

      setRecentEmployees((emps || []).slice(0, 8));
      setLoading(false);
    }).catch(err => {
      console.error("Dashboard error:", err);
      setLoading(false);
    });
  }, []);

  const lineData = {
    labels: performance.labels,
    datasets: [{
      label: 'Performance',
      data: performance.revenue,
      borderColor: '#3b82f6',
      backgroundColor: (context) => {
        const ctx = context.chart.ctx;
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
        return gradient;
      },
      fill: true,
      tension: 0.4,
      borderWidth: 3,
      pointRadius: 5,
      pointBackgroundColor: '#fff',
      pointBorderWidth: 2,
      pointBorderColor: '#3b82f6'
    }]
  };

  const doughnutData = {
    labels: payrollBreakdown.labels,
    datasets: [{
      data: payrollBreakdown.data,
      backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
      borderWidth: 0,
      hoverOffset: 15,
      weight: 0.5
    }]
  };

  const barData = {
    labels: statusData.labels,
    datasets: [{
      label: 'Employees',
      data: statusData.data,
      backgroundColor: statusData.labels.map(l => 
        l === 'Active' ? '#10b981' : l === 'On Leave' ? '#f59e0b' : l === 'Inactive' ? '#ef4444' : '#3b82f6'
      ),
      borderRadius: 6,
      barThickness: 30
    }]
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header mb-4">
        <div>
          <h1 className="page-title">Executive Overview</h1>
          <p className="page-subtitle">Real-time insights across human resources and payroll</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline bg-white"><i className="bi bi-calendar3 me-2"></i> Last 30 Days</button>
          <button className="btn btn-primary shadow-sm"><i className="bi bi-download me-2"></i> Export Report</button>
        </div>
      </div>

      {/* Top Stats Cards */}
      <div className="row g-4 mb-4">
        <div className="col-lg-4 col-md-6">
          <StatCard 
            title="Total Employees" 
            value={loading ? '...' : stats.totalEmployees?.toLocaleString()} 
            icon="bi-people-fill" 
            gradient="linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
            sub="+4.2%" subIcon="bi-graph-up-arrow"
          />
        </div>
        <div className="col-lg-4 col-md-6">
          <StatCard 
            title="Total Payroll" 
            value={loading ? '...' : `$${(stats.payrollTotal / 1000).toFixed(1)}k`} 
            icon="bi-wallet2" 
            gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)"
            sub="+1.8%" subIcon="bi-graph-up-arrow"
          />
        </div>
        <div className="col-lg-4 col-md-6">
          <StatCard 
            title="Attendance Rate" 
            value={loading ? '...' : `${stats.attendanceRate}%`} 
            icon="bi-clock-history" 
            gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
            sub="-0.5%" subIcon="bi-graph-down-arrow"
          />
        </div>
      </div>

      {/* Charts Section */}
      <div className="row g-4 mb-4">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="fw-bold m-0"><i className="bi bi-graph-up-arrow text-primary me-2"></i>Monthly Performance</h5>
              <div className="dropdown">
                <button className="btn btn-sm btn-light border" type="button">This Year <i className="bi bi-chevron-down small"></i></button>
              </div>
            </div>
            <div style={{ height: '300px' }}>
              {loading ? <div className="skeleton h-100"></div> : <Line data={lineData} options={{ ...CHART_OPTS, plugins: { ...CHART_OPTS.plugins, legend: { display: false } } }} />}
            </div>
          </div>
        </div>
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <h5 className="fw-bold mb-4"><i className="bi bi-pie-chart-fill text-success me-2"></i>Payroll Distribution</h5>
            <div className="position-relative" style={{ height: '260px' }}>
              {loading ? <div className="skeleton h-100"></div> : <Doughnut data={doughnutData} options={{ ...CHART_OPTS, cutout: '75%', scales: undefined, plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 10, padding: 15, font: { size: 10 } } } } }} />}
              {!loading && (
                <div className="position-absolute top-50 start-50 translate-middle text-center">
                  <div className="text-muted small">Total</div>
                  <div className="fw-bold h4 m-0">${(stats.payrollTotal / 1000).toFixed(1)}k</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm">
            <h5 className="fw-bold mb-4"><i className="bi bi-bar-chart-fill text-warning me-2"></i>Employee Status Overview</h5>
            <div style={{ height: '300px' }}>
              {loading ? <div className="skeleton h-100"></div> : <Bar data={barData} options={CHART_OPTS} />}
            </div>
          </div>
        </div>
        <div className="col-lg-8">
          <div className="card p-0 border-0 shadow-sm overflow-hidden h-100">
            <div className="p-4 border-bottom bg-white d-flex align-items-center justify-content-between">
              <h5 className="fw-bold m-0"><i className="bi bi-clock-history text-primary me-2"></i>Recent Activities</h5>
              <Link to="/employees" className="btn btn-sm btn-outline-primary border-0 fw-bold">View Directory →</Link>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="ps-4">Employee</th>
                    <th>Department</th>
                    <th>Role</th>
                    <th className="pe-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? [...Array(4)].map((_, i) => (
                    <tr key={i}>
                      <td className="ps-4"><div className="skeleton" style={{ height: 16, width: 150 }}></div></td>
                      <td><div className="skeleton" style={{ height: 16, width: 100 }}></div></td>
                      <td><div className="skeleton" style={{ height: 16, width: 120 }}></div></td>
                      <td className="pe-4"><div className="skeleton" style={{ height: 24, width: 80, borderRadius: 20 }}></div></td>
                    </tr>
                  )) : recentEmployees.map(emp => (
                    <tr key={emp.EmployeeID}>
                      <td className="ps-4">
                        <div className="d-flex align-items-center gap-3">
                          <div className="avatar bg-primary-light text-primary fw-bold" style={{ width: 32, height: 32, fontSize: '0.8rem' }}>{emp.FullName?.charAt(0)}</div>
                          <span className="fw-bold text-dark">{emp.FullName}</span>
                        </div>
                      </td>
                      <td className="text-muted small">{emp.Department || 'Unassigned'}</td>
                      <td className="text-muted small">{emp.Position || 'Staff'}</td>
                      <td className="pe-4"><StatusBadge status={emp.Status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
