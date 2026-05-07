import { useState, useEffect, useCallback } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import ExportModal from '../components/ExportModal';
import PayslipModal from '../components/PayslipModal';
import { API_BASE, fetchAuth } from '../api';
import { generateMonthOptions } from '../utils/dateUtils';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function Payroll() {
  const [payrollData, setPayrollData] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [summary, setSummary] = useState({ TotalPayroll: 0, AvgSalary: 0 });
  const [loading, setLoading] = useState(true);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState('All Months');
  const [selectedDept, setSelectedDept] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const months = ['All Months', ...generateMonthOptions(12)];

  const loadData = useCallback(() => {
    setLoading(true);
    const monthQuery = selectedMonth !== 'All Months' ? `month=${encodeURIComponent(selectedMonth)}` : '';
    const deptQuery = selectedDept ? `dept=${encodeURIComponent(selectedDept)}` : '';
    const query = [monthQuery, deptQuery].filter(Boolean).join('&');
    const url = `${API_BASE}/payroll${query ? '?' + query : ''}`;

    Promise.all([
      fetchAuth(url).then(res => res.json()),
      fetchAuth(`${API_BASE}/payroll/summary${query ? '?' + query : ''}`).then(res => res.json()),
      fetchAuth(`${API_BASE}/departments`).then(res => res.json())
    ]).then(([data, summ, depts]) => {
      setPayrollData(Array.isArray(data) ? data : []);
      setSummary(summ && !summ.error ? summ : { TotalPayroll: 0, AvgSalary: 0 });
      setDepartments(Array.isArray(depts) ? depts : []);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [selectedMonth, selectedDept]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredData = payrollData.filter(p => 
    p.FullName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lineData = {
    labels: payrollData.slice(0, 10).reverse().map(p => p.MonthYear),
    datasets: [{
      label: 'Salary Trend',
      data: payrollData.slice(0, 10).reverse().map(p => p.TotalSalary),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      tension: 0.4,
      borderWidth: 2,
      pointRadius: 4,
      pointBackgroundColor: '#fff',
      pointBorderWidth: 2,
      pointBorderColor: '#3b82f6'
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 } } },
      y: { grid: { color: '#f1f5f9' }, ticks: { color: '#94a3b8', font: { size: 10 } } }
    }
  };

  const formatVND = (value) => {
    const number = Number(value || 0);
    return `${number.toLocaleString('vi-VN')} VND`;
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header mb-4">
        <div>
          <h1 className="page-title">Payroll Management</h1>
          <p className="page-subtitle">Process and track employee compensation</p>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-lg-4">
          <div className="stat-card stat-card-vivid stat-card-blue animate-in" style={{ animationDelay: '0.1s' }}>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <div className="stat-card-label">Total Distribution</div>
                <div className="stat-card-value" style={{ fontSize: '1.75rem' }}>
                  {formatVND(summary.TotalPayroll)}
                </div>
              </div>
              <div className="stat-card-icon">
                <i className="bi bi-cash-stack"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-lg-4">
          <div className="stat-card stat-card-vivid stat-card-pink animate-in" style={{ animationDelay: '0.2s' }}>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <div className="stat-card-label">Average Salary</div>
                <div className="stat-card-value" style={{ fontSize: '1.75rem' }}>
                  {formatVND(summary.AvgSalary)}
                </div>
              </div>
              <div className="stat-card-icon">
                <i className="bi bi-graph-up"></i>
              </div>
            </div>
            <div className="small text-muted mt-2">Based on {payrollData.length} records</div>
          </div>
        </div>
        <div className="col-lg-4">
          <div className="card border-0 p-4 h-100 shadow-sm animate-in" style={{ animationDelay: '0.3s' }}>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="small fw-bold text-muted text-uppercase">Salary Trend</span>
              <span className="badge badge-pink">Last 10 Cycles</span>
            </div>
            <div style={{ height: '80px' }}>
              <Line data={lineData} options={chartOptions} />
            </div>
          </div>
        </div>
      </div>

      <div className="card p-0 border-0 shadow-sm overflow-hidden">
        <div className="p-4 border-bottom bg-white d-flex flex-wrap gap-3 align-items-center justify-content-between">
          <div className="search-wrapper" style={{ minWidth: 280 }}>
            <i className="bi bi-search search-icon"></i>
            <input
              type="text"
              className="form-control ps-5"
              placeholder="Search by employee name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="d-flex gap-2">
            <select className="form-select w-auto" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
               {months.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select className="form-select w-auto" value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)}>
               <option value="">All Departments</option>
               {departments.map(d => <option key={d.DepartmentID} value={d.DepartmentName}>{d.DepartmentName}</option>)}
            </select>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th className="ps-4">Employee</th>
                <th>Base Salary</th>
                <th>Bonus</th>
                <th>Deductions</th>
                <th>Net Salary</th>
                <th className="pe-4 text-end">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? [...Array(5)].map((_, i) => (
                <tr key={i}>
                  <td className="ps-4"><div className="skeleton" style={{ height: 20, width: 180 }}></div></td>
                  <td><div className="skeleton" style={{ height: 16, width: 100 }}></div></td>
                  <td><div className="skeleton" style={{ height: 16, width: 80 }}></div></td>
                  <td><div className="skeleton" style={{ height: 16, width: 80 }}></div></td>
                  <td><div className="skeleton" style={{ height: 16, width: 100 }}></div></td>
                  <td className="pe-4 text-end"><div className="skeleton" style={{ height: 32, width: 40, float: 'right' }}></div></td>
                </tr>
              )) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-5 text-muted">No payroll records found</td>
                </tr>
              ) : (
                filteredData.map((p, i) => (
                  <tr key={i}>
                    <td className="ps-4">
                      <div className="fw-bold text-dark">{p.FullName}</div>
                      <div className="small text-muted">{p.MonthYear} {p.DepartmentName ? `• ${p.DepartmentName}` : ''}</div>
                    </td>
                    <td><span className="fw-600 text-dark">{formatVND(p.BaseSalary)}</span></td>
                    <td><span className="text-success fw-600">+{formatVND(p.Bonus)}</span></td>
                    <td><span className="text-danger fw-600">-{formatVND(p.Deductions)}</span></td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <span className="fw-bold text-primary fs-6">{formatVND(p.TotalSalary)}</span>
                        {p.TotalSalary > 100000000 && <i className="bi bi-lightning-fill text-warning small"></i>}
                      </div>
                    </td>
                    <td className="text-end">
                       <button className="btn-icon" onClick={() => setSelectedPayslip(p)}>
                          <i className="bi bi-file-earmark-pdf"></i>
                       </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ExportModal 
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Payroll Registry Export"
        columns={[{ header: 'Employee', key: 'FullName' }, { header: 'Net Salary', key: 'TotalSalary' }]}
        data={filteredData}
        filename="Executive_Payroll"
      />

      <PayslipModal
        isOpen={!!selectedPayslip}
        onClose={() => setSelectedPayslip(null)}
        data={selectedPayslip}
      />
    </div>
  );
}
