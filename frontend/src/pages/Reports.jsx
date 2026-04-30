import { useState, useEffect, useCallback } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { API_BASE, fetchAuth } from '../api';
import ExportModal from '../components/ExportModal';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } },
    tooltip: { backgroundColor: '#0f172a', padding: 12, cornerRadius: 8 }
  }
};

// ─── HR Tab ───────────────────────────────────────────────────────────────────
function HRReport({ data, loading }) {
  // data: [{Department, Status, Count}]
  const deptMap = {};
  (data || []).forEach(r => {
    if (!deptMap[r.Department]) deptMap[r.Department] = 0;
    deptMap[r.Department] += r.Count;
  });
  const depts = Object.keys(deptMap);
  const counts = Object.values(deptMap);

  const statusMap = {};
  (data || []).forEach(r => {
    if (!statusMap[r.Status]) statusMap[r.Status] = 0;
    statusMap[r.Status] += r.Count;
  });

  return (
    <div className="row g-4">
      <div className="col-lg-5">
        <div className="card border-0 shadow-sm h-100">
          <h6 className="fw-bold mb-4 text-muted text-uppercase ls-1">Employee by Status</h6>
          <div style={{ height: '280px' }}>
            {loading ? <div className="skeleton h-100" /> : (
              <Doughnut
                data={{
                  labels: Object.keys(statusMap),
                  datasets: [{ data: Object.values(statusMap), backgroundColor: CHART_COLORS, borderWidth: 0 }]
                }}
                options={{ ...chartOptions, cutout: '70%' }}
              />
            )}
          </div>
        </div>
      </div>
      <div className="col-lg-7">
        <div className="card border-0 shadow-sm h-100">
          <h6 className="fw-bold mb-4 text-muted text-uppercase ls-1">Headcount by Department</h6>
          <div style={{ height: '280px' }}>
            {loading ? <div className="skeleton h-100" /> : (
              <Bar
                data={{
                  labels: depts,
                  datasets: [{ label: 'Headcount', data: counts, backgroundColor: '#3b82f6', borderRadius: 6 }]
                }}
                options={{ ...chartOptions, plugins: { ...chartOptions.plugins, legend: { display: false } } }}
              />
            )}
          </div>
          <div className="table-responsive mt-3">
            <table className="data-table" style={{ fontSize: 13 }}>
              <thead><tr><th>Department</th><th>Status</th><th className="text-end">Count</th></tr></thead>
              <tbody>
                {(data || []).map((r, i) => (
                  <tr key={i}><td>{r.Department}</td><td>{r.Status}</td><td className="text-end fw-bold">{r.Count}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Payroll Tab ──────────────────────────────────────────────────────────────
function PayrollReport({ data, loading }) {
  // data: [{Month, TotalBase, TotalBonus, TotalDeductions, TotalNet}]
  return (
    <div className="row g-4">
      <div className="col-12">
        <div className="card border-0 shadow-sm">
          <h6 className="fw-bold mb-4 text-muted text-uppercase ls-1">Monthly Payroll Trend</h6>
          <div style={{ height: '300px' }}>
            {loading ? <div className="skeleton h-100" /> : (
              <Line
                data={{
                  labels: (data || []).map(r => r.Month),
                  datasets: [
                    {
                      label: 'Net Payroll',
                      data: (data || []).map(r => parseFloat(r.TotalNet || 0)),
                      borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)',
                      fill: true, tension: 0.4, borderWidth: 3
                    },
                    {
                      label: 'Base Salary',
                      data: (data || []).map(r => parseFloat(r.TotalBase || 0)),
                      borderColor: '#3b82f6', backgroundColor: 'transparent',
                      tension: 0.4, borderWidth: 2, borderDash: [5, 5]
                    }
                  ]
                }}
                options={chartOptions}
              />
            )}
          </div>
        </div>
      </div>
      <div className="col-12">
        <div className="card border-0 shadow-sm">
          <h6 className="fw-bold mb-3 text-muted text-uppercase ls-1">Payroll Detail by Month</h6>
          <div className="table-responsive">
            <table className="data-table" style={{ fontSize: 13 }}>
              <thead><tr><th>Month</th><th>Base Salary</th><th>Bonus</th><th>Deductions</th><th className="text-end">Net Payroll</th></tr></thead>
              <tbody>
                {(data || []).map((r, i) => (
                  <tr key={i}>
                    <td className="fw-bold">{r.Month}</td>
                    <td>${parseFloat(r.TotalBase || 0).toLocaleString()}</td>
                    <td className="text-success">+${parseFloat(r.TotalBonus || 0).toLocaleString()}</td>
                    <td className="text-danger">-${parseFloat(r.TotalDeductions || 0).toLocaleString()}</td>
                    <td className="text-end fw-bold text-primary">${parseFloat(r.TotalNet || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Attendance Tab ───────────────────────────────────────────────────────────
function AttendanceReport({ data, loading }) {
  // data: [{FullName, TotalLeave, TotalAbsent}]
  return (
    <div className="row g-4">
      <div className="col-lg-7">
        <div className="card border-0 shadow-sm h-100">
          <h6 className="fw-bold mb-4 text-muted text-uppercase ls-1">Leave & Absence by Employee (Top 10)</h6>
          <div style={{ height: '300px' }}>
            {loading ? <div className="skeleton h-100" /> : (
              <Bar
                data={{
                  labels: (data || []).map(r => r.FullName),
                  datasets: [
                    { label: 'Leave Days', data: (data || []).map(r => r.TotalLeave || 0), backgroundColor: '#f59e0b', borderRadius: 4 },
                    { label: 'Absent Days', data: (data || []).map(r => r.TotalAbsent || 0), backgroundColor: '#ef4444', borderRadius: 4 }
                  ]
                }}
                options={{ ...chartOptions, scales: { x: { stacked: false }, y: { beginAtZero: true } } }}
              />
            )}
          </div>
        </div>
      </div>
      <div className="col-lg-5">
        <div className="card border-0 shadow-sm h-100">
          <h6 className="fw-bold mb-3 text-muted text-uppercase ls-1">Absence Detail</h6>
          <div className="table-responsive">
            <table className="data-table" style={{ fontSize: 13 }}>
              <thead><tr><th>Employee</th><th className="text-center">Leave</th><th className="text-center">Absent</th></tr></thead>
              <tbody>
                {(data || []).map((r, i) => (
                  <tr key={i}>
                    <td className="fw-bold">{r.FullName}</td>
                    <td className="text-center">
                      <span className={`badge ${r.TotalLeave > 8 ? 'badge-inactive' : r.TotalLeave > 3 ? 'badge-probation' : 'badge-active'}`}>
                        {r.TotalLeave || 0}
                      </span>
                    </td>
                    <td className="text-center">
                      <span className={`badge ${r.TotalAbsent > 3 ? 'badge-inactive' : 'badge-active'}`}>
                        {r.TotalAbsent || 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Dividend Tab ─────────────────────────────────────────────────────────────
function DividendReport({ data, loading }) {
  // data: [{FullName, Amount}]
  const total = (data || []).reduce((s, r) => s + parseFloat(r.Amount || 0), 0);
  return (
    <div className="row g-4">
      <div className="col-lg-5">
        <div className="card border-0 shadow-sm h-100">
          <h6 className="fw-bold mb-4 text-muted text-uppercase ls-1">Dividend Distribution</h6>
          <div style={{ height: '280px' }}>
            {loading ? <div className="skeleton h-100" /> : (
              <Doughnut
                data={{
                  labels: (data || []).map(r => r.FullName),
                  datasets: [{ data: (data || []).map(r => parseFloat(r.Amount || 0)), backgroundColor: CHART_COLORS, borderWidth: 0 }]
                }}
                options={{ ...chartOptions, cutout: '65%' }}
              />
            )}
          </div>
        </div>
      </div>
      <div className="col-lg-7">
        <div className="card border-0 shadow-sm h-100">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="fw-bold text-muted text-uppercase ls-1 m-0">Dividend Records</h6>
            <span className="badge bg-primary-light text-primary fw-bold">Total: ${total.toLocaleString()}</span>
          </div>
          <div className="table-responsive">
            <table className="data-table" style={{ fontSize: 13 }}>
              <thead><tr><th>Employee</th><th className="text-end">Amount</th><th className="text-end">Share %</th></tr></thead>
              <tbody>
                {(data || []).map((r, i) => (
                  <tr key={i}>
                    <td className="fw-bold">{r.FullName}</td>
                    <td className="text-end text-primary fw-bold">${parseFloat(r.Amount || 0).toLocaleString()}</td>
                    <td className="text-end text-muted">{total > 0 ? ((parseFloat(r.Amount) / total) * 100).toFixed(1) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Reports() {
  const [activeTab, setActiveTab] = useState('HR');
  const [loading, setLoading] = useState(false);
  const [hrData, setHrData] = useState([]);
  const [payrollData, setPayrollData] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [dividendData, setDividendData] = useState([]);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const tabs = [
    { id: 'HR', label: 'HR Report', icon: 'bi-person-badge' },
    { id: 'PAYROLL', label: 'Payroll Report', icon: 'bi-cash-coin' },
    { id: 'ATTENDANCE', label: 'Attendance Report', icon: 'bi-calendar-check' },
    { id: 'DIVIDEND', label: 'Dividend Report', icon: 'bi-wallet2' }
  ];

  // Fetch dữ liệu theo từng tab khi chuyển tab
  const loadTab = useCallback(async (tab) => {
    setLoading(true);
    try {
      if (tab === 'HR' && hrData.length === 0) {
        const res = await fetchAuth(`${API_BASE}/reports/hr`).then(r => r.json());
        setHrData(Array.isArray(res) ? res : []);
      } else if (tab === 'PAYROLL' && payrollData.length === 0) {
        const res = await fetchAuth(`${API_BASE}/reports/payroll`).then(r => r.json());
        setPayrollData(Array.isArray(res) ? res : []);
      } else if (tab === 'ATTENDANCE' && attendanceData.length === 0) {
        const res = await fetchAuth(`${API_BASE}/reports/attendance`).then(r => r.json());
        setAttendanceData(Array.isArray(res) ? res : []);
      } else if (tab === 'DIVIDEND' && dividendData.length === 0) {
        const res = await fetchAuth(`${API_BASE}/reports/dividends`).then(r => r.json());
        setDividendData(Array.isArray(res) ? res : []);
      }
    } catch (e) {
      console.error('Reports load error:', e);
    } finally {
      setLoading(false);
    }
  }, [hrData.length, payrollData.length, attendanceData.length, dividendData.length]);

  useEffect(() => {
    loadTab(activeTab);
  }, [activeTab, loadTab]);

  const handleRefresh = () => {
    // Reset cache và reload tab hiện tại
    if (activeTab === 'HR') setHrData([]);
    else if (activeTab === 'PAYROLL') setPayrollData([]);
    else if (activeTab === 'ATTENDANCE') setAttendanceData([]);
    else if (activeTab === 'DIVIDEND') setDividendData([]);
  };

  useEffect(() => {
    if (
      (activeTab === 'HR' && hrData.length === 0) ||
      (activeTab === 'PAYROLL' && payrollData.length === 0) ||
      (activeTab === 'ATTENDANCE' && attendanceData.length === 0) ||
      (activeTab === 'DIVIDEND' && dividendData.length === 0)
    ) {
      loadTab(activeTab);
    }
  }, [hrData, payrollData, attendanceData, dividendData, activeTab, loadTab]);

  return (
    <div className="animate-fade-in">
      <div className="page-header mb-4">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="page-subtitle">Generate comprehensive insights into organizational data</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline" onClick={handleRefresh}>
            <i className="bi bi-arrow-clockwise me-2"></i> Refresh
          </button>
          <button className="btn btn-primary shadow-sm" onClick={() => setIsExportModalOpen(true)}>
            <i className="bi bi-download me-2"></i> Export Report
          </button>
        </div>
      </div>

      <ExportModal 
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title={activeTab === 'HR' ? 'HR Report' : activeTab === 'PAYROLL' ? 'Payroll Report' : activeTab === 'ATTENDANCE' ? 'Attendance Report' : 'Dividend Report'}
        filename={`report_${activeTab.toLowerCase()}`}
        columns={
            activeTab === 'HR' ? [{header: 'Department', key: 'Department'}, {header: 'Status', key: 'Status'}, {header: 'Count', key: 'Count'}]
          : activeTab === 'PAYROLL' ? [{header: 'Month', key: 'Month'}, {header: 'Base Salary', key: 'TotalBase'}, {header: 'Bonus', key: 'TotalBonus'}, {header: 'Deductions', key: 'TotalDeductions'}, {header: 'Net Payroll', key: 'TotalNet'}]
          : activeTab === 'ATTENDANCE' ? [{header: 'Employee', key: 'FullName'}, {header: 'Leave', key: 'TotalLeave'}, {header: 'Absent', key: 'TotalAbsent'}]
          : [{header: 'Employee', key: 'FullName'}, {header: 'Amount ($)', key: 'Amount'}]
        }
        data={activeTab === 'HR' ? hrData : activeTab === 'PAYROLL' ? payrollData : activeTab === 'ATTENDANCE' ? attendanceData : dividendData}
      />

      {/* Tabs */}
      <div className="card-custom p-1 mb-4 bg-light rounded-4 d-inline-flex border shadow-sm">
        <ul className="nav nav-pills gap-1">
          {tabs.map(tab => (
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

      {/* Tab Content */}
      {activeTab === 'HR' && <HRReport data={hrData} loading={loading} />}
      {activeTab === 'PAYROLL' && <PayrollReport data={payrollData} loading={loading} />}
      {activeTab === 'ATTENDANCE' && <AttendanceReport data={attendanceData} loading={loading} />}
      {activeTab === 'DIVIDEND' && <DividendReport data={dividendData} loading={loading} />}
    </div>
  );
}
