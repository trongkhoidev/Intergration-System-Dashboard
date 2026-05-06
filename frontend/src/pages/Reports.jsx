import { useState, useEffect, useCallback } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { API_BASE, fetchAuth } from '../api';
import { getCurrentUser } from '../utils/auth';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

export default function Reports() {
  const user = getCurrentUser();
  const role = user.role?.toLowerCase() || 'employee';

  const ALL_TABS = [
    { id: 'HR', label: 'HR Report', icon: 'bi-person-badge', roles: ['admin', 'hr'] },
    { id: 'PAYROLL', label: 'Payroll Report', icon: 'bi-cash-coin', roles: ['admin', 'payroll'] },
    { id: 'ATTENDANCE', label: 'Attendance Report', icon: 'bi-calendar-check', roles: ['admin', 'hr', 'payroll'] },
    { id: 'DIVIDEND', label: 'Dividend Report', icon: 'bi-wallet2', roles: ['admin', 'payroll'] }
  ];

  const allowedTabs = ALL_TABS.filter(t => t.roles.includes(role));
  const [activeTab, setActiveTab] = useState(allowedTabs.length > 0 ? allowedTabs[0].id : 'HR');
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const [hrData, setHrData] = useState({ labels: [], data: [] });
  const [payrollData, setPayrollData] = useState({ labels: [], data: [] });
  const [trendData, setTrendData] = useState({ labels: [], data: [] });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [depts, hrRaw, paySummary, trendRaw] = await Promise.all([
        fetchAuth(`${API_BASE}/departments`).then(res => res.json()),
        fetchAuth(`${API_BASE}/dashboard/status-overview`).then(res => res.json()),
        fetchAuth(`${API_BASE}/payroll/summary`).then(res => res.json()),
        fetchAuth(`${API_BASE}/dashboard/performance`).then(res => res.json())
      ]);

      setDepartments(Array.isArray(depts) ? depts : []);
      
      // HR Dist (Donut)
      setHrData({
        labels: Object.keys(hrRaw),
        data: Object.values(hrRaw)
      });

      // Payroll by Dept (Bar)
      const payDepts = paySummary.Breakdown || [];
      setPayrollData({
        labels: payDepts.map(d => `Dept ${d.DepartmentID}`),
        data: payDepts.map(d => d.Amount)
      });

      // Trend (Line)
      setTrendData({
        labels: trendRaw.labels || [],
        data: trendRaw.revenue || []
      });

    } catch (e) {
      console.error("Reports load error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } },
      tooltip: { backgroundColor: '#0f172a', padding: 12, cornerRadius: 8 }
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header mb-4">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="page-subtitle">Generate comprehensive insights into organizational data</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline"><i className="bi bi-file-earmark-excel me-2"></i> Export Excel</button>
          <button className="btn btn-primary shadow-sm"><i className="bi bi-file-earmark-pdf me-2"></i> Export PDF</button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card border-0 shadow-sm p-3 mb-4 bg-white">
        <div className="row g-3">
          <div className="col-md-3">
            <label className="form-label small fw-bold text-muted">Date Range</label>
            <div className="input-group input-group-sm">
              <input type="date" className="form-control" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} />
              <span className="input-group-text bg-light border-0">to</span>
              <input type="date" className="form-control" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} />
            </div>
          </div>
          <div className="col-md-3">
            <label className="form-label small fw-bold text-muted">Department</label>
            <select className="form-select form-select-sm" value={selectedDept} onChange={e => setSelectedDept(e.target.value)}>
              <option value="">All Departments</option>
              {departments.map(d => <option key={d.DepartmentID} value={d.DepartmentName}>{d.DepartmentName}</option>)}
            </select>
          </div>
          <div className="col-md-6 d-flex align-items-end justify-content-end">
             <button className="btn btn-sm btn-primary px-4" onClick={loadData}>Apply Filters</button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card-custom p-1 mb-4 bg-light rounded-4 d-inline-flex border shadow-sm">
        <ul className="nav nav-pills gap-1">
          {allowedTabs.map(tab => (
            <li key={tab.id} className="nav-item">
              <button 
                className={`nav-link rounded-4 px-4 py-2 fw-bold small d-flex align-items-center gap-2 ${activeTab === tab.id ? 'bg-primary text-white shadow' : 'text-muted'}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <i className={`bi ${tab.icon}`}></i> {tab.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {loading ? (
        <div className="py-5 text-center"><div className="spinner-border text-primary"></div></div>
      ) : (
        <div className="row g-4">
          <div className="col-lg-4">
            <div className="card border-0 shadow-sm h-100">
               <h6 className="fw-bold mb-4 text-muted text-uppercase ls-1">Employee Distribution</h6>
               <div style={{ height: '300px' }}>
                  <Doughnut 
                    data={{
                      labels: hrData.labels,
                      datasets: [{ data: hrData.data, backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'], borderWidth: 0 }]
                    }} 
                    options={{ ...chartOptions, cutout: '70%' }}
                  />
               </div>
            </div>
          </div>
          <div className="col-lg-8">
            <div className="card border-0 shadow-sm h-100">
               <h6 className="fw-bold mb-4 text-muted text-uppercase ls-1">Salary by Department</h6>
               <div style={{ height: '300px' }}>
                  <Bar 
                    data={{
                      labels: payrollData.labels,
                      datasets: [{ label: 'Total Payroll', data: payrollData.data, backgroundColor: '#3b82f6', borderRadius: 6 }]
                    }}
                    options={chartOptions}
                  />
               </div>
            </div>
          </div>
          <div className="col-lg-12">
            <div className="card border-0 shadow-sm">
               <h6 className="fw-bold mb-4 text-muted text-uppercase ls-1">Payroll Trend Analytics</h6>
               <div style={{ height: '350px' }}>
                  <Line 
                    data={{
                      labels: trendData.labels,
                      datasets: [{
                        label: 'Gross Payroll',
                        data: trendData.data,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 3
                      }]
                    }}
                    options={chartOptions}
                  />
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
