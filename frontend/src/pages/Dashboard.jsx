import { useEffect, useState, useRef } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import StatCard from '../components/StatCard';
import ChartCard from '../components/ChartCard';
import ExportModal from '../components/ExportModal';
import Skeleton from '../components/Skeleton';
import { API_BASE } from '../api';
import { generateMonthOptions } from '../utils/dateUtils';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

export default function Dashboard() {
  const [stats, setStats] = useState({ totalEmployees: 0, payrollTotal: 0, attendanceRate: 0 });
  const [loading, setLoading] = useState(true);
  const [performance, setPerformance] = useState({ labels: [], revenue: [], expenses: [] });
  const [payrollBreakdown, setPayrollBreakdown] = useState({ labels: [], data: [] });
  const [statusOverview, setStatusOverview] = useState({ labels: [], data: [] });
  const [recentEmployees, setRecentEmployees] = useState([]);
  const [alerts, setAlerts] = useState([]);
  
  const [selectedMonth, setSelectedMonth] = useState('All Months');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const months = ['All Months', ...generateMonthOptions(12)];
  const chartRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    const monthParam = selectedMonth !== 'All Months' ? `?month=${encodeURIComponent(selectedMonth)}` : '';
    
    Promise.all([
      fetch(`${API_BASE}/dashboard/stats${monthParam}`).then(res => res.json()),
      fetch(`${API_BASE}/dashboard/performance${monthParam}`).then(res => res.json()),
      fetch(`${API_BASE}/payroll/summary${monthParam}`).then(res => res.json()),
      fetch(`${API_BASE}/dashboard/status-overview${monthParam}`).then(res => res.json()),
      fetch(`${API_BASE}/employees`).then(res => res.json()),
      fetch(`${API_BASE}/alerts`).then(res => res.json())
    ])
    .then(([statsData, perf, pay, status, employees, alertData]) => {
      setStats(statsData || { totalEmployees: 0, payrollTotal: 0, attendanceRate: 0 });
      setPerformance(perf || { labels: [], revenue: [], expenses: [] });
      setAlerts(alertData || []);
      
      const payLabels = pay?.Breakdown?.map(b => b.DepartmentID) || [];
      const payData = pay?.Breakdown?.map(b => b.Amount) || [];
      setPayrollBreakdown({ labels: payLabels, data: payData });

      const statLabels = status ? Object.keys(status) : [];
      const statData = status ? Object.values(status) : [];
      setStatusOverview({ labels: statLabels, data: statData });

      setRecentEmployees((employees || []).slice(-6).reverse());
      setLoading(false);
    })
    .catch(err => {
      console.error("Dashboard error:", err);
      setLoading(false);
    });
  }, [selectedMonth]);

  // Create Gradient for Line Chart
  const createGradient = (ctx, area) => {
    const gradient = ctx.createLinearGradient(0, area.bottom, 0, area.top);
    gradient.addColorStop(0, 'rgba(79, 70, 229, 0)');
    gradient.addColorStop(1, 'rgba(79, 70, 229, 0.2)');
    return gradient;
  };

  const lineData = {
    labels: performance.labels,
    datasets: [
      {
        label: 'Revenue',
        data: performance.revenue,
        borderColor: '#4f46e5',
        backgroundColor: (context) => {
            const chart = context.chart;
            const {ctx, chartArea} = chart;
            if (!chartArea) return null;
            return createGradient(ctx, chartArea);
        },
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#fff',
        pointBorderWidth: 2,
      },
      {
        label: 'Expenses',
        data: performance.expenses,
        borderColor: '#94a3b8',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        tension: 0.4,
        pointRadius: 0
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, padding: 25, font: { weight: '600', size: 12 } } },
      tooltip: {
        backgroundColor: '#1e293b',
        padding: 12,
        cornerRadius: 8,
        titleFont: { weight: '700' },
        usePointStyle: true
      }
    },
    scales: {
      y: { 
        beginAtZero: true, 
        grid: { color: '#f1f5f9', borderDash: [4, 4] },
        ticks: { font: { weight: '500' }, color: '#64748b' }
      },
      x: { grid: { display: false }, ticks: { font: { weight: '500' }, color: '#64748b' } }
    }
  };

  const filteredEmployees = recentEmployees.filter(e => 
    e.FullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (e.Department && e.Department.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="pb-5">
      {/* Header Section */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-5 gap-3">
        <div className="animate-slide-up">
          <h2 className="fw-bold text-dark mb-1 tracking-tight">Enterprise Overview</h2>
          <p className="text-muted small mb-0">Monitor vital statistics and organization health in real-time.</p>
        </div>
        
        <div className="d-flex gap-2 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="dropdown">
            <button className="btn btn-white border shadow-sm px-3 dropdown-toggle fw-bold text-base" type="button" data-bs-toggle="dropdown">
              <i className="bi bi-calendar3 me-2 text-primary"></i> {selectedMonth}
            </button>
            <ul className="dropdown-menu dropdown-menu-end shadow-lg border-0 p-2 rounded-4">
              {months.map(m => (
                <li key={m}>
                  <button className={`dropdown-item rounded-3 py-2 ${selectedMonth === m ? 'bg-primary text-white' : ''}`} onClick={() => setSelectedMonth(m)}>{m}</button>
                </li>
              ))}
            </ul>
          </div>
          <button className="btn btn-primary-custom d-flex align-items-center gap-2 shadow-sm" onClick={() => setIsExportModalOpen(true)}>
            <i className="bi bi-file-earmark-arrow-down"></i> Export Info
          </button>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="row g-4 mb-5">
        <div className="col-12 col-md-4">
          {loading ? <Skeleton height="140px" borderRadius="12px" /> : 
            <StatCard title="Active Workforce" value={stats.totalEmployees} icon="bi-people-fill" color="#4f46e5" />
          }
        </div>
        <div className="col-12 col-md-4">
          {loading ? <Skeleton height="140px" borderRadius="12px" /> : 
            <StatCard title="Financial Outflow" value={`$${stats.payrollTotal.toLocaleString()}`} icon="bi-currency-dollar" color="#10b981" />
          }
        </div>
        <div className="col-12 col-md-4">
          {loading ? <Skeleton height="140px" borderRadius="12px" /> : 
            <StatCard title="Operations Rate" value={`${stats.attendanceRate}%`} icon="bi-lightning-charge-fill" color="#f59e0b" />
          }
        </div>
      </div>

      <div className="row g-4 mb-5">
        {/* Main Performance Chart */}
        <div className="col-12 col-xl-8">
          <ChartCard title="Capital Performance" subtitle="Monthly revenue vs shared expenses metrics">
            {loading ? <div className="d-flex h-100 align-items-center justify-content-center"><div className="spinner-border text-primary"></div></div> : 
             <Line data={lineData} options={chartOptions} />
            }
          </ChartCard>
        </div>

        {/* Live Alerts Panel */}
        <div className="col-12 col-xl-4">
          <div className="card-custom h-100 border-0 shadow-sm animate-slide-up glass-card" style={{ animationDelay: '0.2s' }}>
            <h5 className="fw-bold mb-4 d-flex align-items-center gap-2">
              <i className="bi bi-bell-fill text-primary"></i> Operational Alerts
            </h5>
            <div className="d-flex flex-column gap-3 overflow-auto" style={{ maxHeight: '280px' }}>
              {alerts.length > 0 ? alerts.map((alert, i) => (
                <div key={i} className={`p-3 rounded-3 animate-fade-in severity-${alert.severity || 'info'}`} style={{ borderLeftWidth: '4px' }}>
                  <div className="d-flex justify-content-between align-items-start mb-1">
                    <span className="fw-bold small">{alert.type}</span>
                    <span className="text-muted extra-small">{alert.date}</span>
                  </div>
                  <div className="small fw-medium">{alert.message}</div>
                </div>
              )) : (
                <div className="text-center py-5 text-muted small">
                  <i className="bi bi-check-circle fs-2 mb-2 d-block opacity-25"></i>
                  No active alerts for now
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Payroll Distribution */}
        <div className="col-12 col-xl-4">
          <ChartCard title="Payroll Allocation" subtitle="Percentage share per active department">
             {loading ? <Skeleton height="200px" /> : (
               <Doughnut 
                 data={{
                   labels: payrollBreakdown.labels,
                   datasets: [{
                     data: payrollBreakdown.data,
                     backgroundColor: ['#4f46e5', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff'],
                     borderWidth: 0,
                     hoverOffset: 15
                   }]
                 }}
                 options={{ ...chartOptions, cutout: '75%' }}
               />
             )}
          </ChartCard>
        </div>

        {/* Employee List Search */}
        <div className="col-12 col-xl-8">
          <div className="table-container m-0 animate-slide-up glass-card" style={{ animationDelay: '0.3s' }}>
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center px-2 mb-4 gap-3">
              <h5 className="fw-bold mb-0">Talent Snapshot</h5>
              <div className="search-input-wrapper">
                <i className="bi bi-search position-absolute top-50 translate-middle-y ms-3 text-muted"></i>
                <input 
                  type="text" 
                  placeholder="Filter name or department..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="table-responsive">
              <table className="table-custom">
                <thead>
                  <tr>
                    <th>Identity</th>
                    <th>Structural Unit</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? <tr className="border-0"><td colSpan="3"><Skeleton height="40px" /></td></tr> : 
                   filteredEmployees.map((emp, i) => (
                    <tr key={i}>
                      <td>
                        <div className="d-flex align-items-center gap-3">
                          <div className="rounded-4 bg-primary bg-opacity-10 d-flex align-items-center justify-content-center fw-bold" style={{ width: '40px', height: '40px', color: 'var(--primary-color)' }}>
                            {emp.FullName.charAt(0)}
                          </div>
                          <div>
                            <div className="fw-bold text-dark">{emp.FullName}</div>
                            <div className="text-muted extra-small">{emp.Position || 'Member'}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className="text-muted small">{emp.Department}</span></td>
                      <td>
                        <span className="badge-custom badge-active">Active</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!loading && filteredEmployees.length === 0 && (
                <div className="text-center py-5 text-muted small">No matches found</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ExportModal 
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Dashboard Summary Report"
        columns={[{ header: 'Metric', key: 'metric' }, { header: 'Value', key: 'value' }]}
        data={[
          { metric: 'Total Employees', value: stats.totalEmployees },
          { metric: 'Payroll Total', value: stats.payrollTotal },
          { metric: 'Attendance Rate', value: `${stats.attendanceRate}%` }
        ]}
        filename="Executive_Summary"
      />
    </div>
  );
}
