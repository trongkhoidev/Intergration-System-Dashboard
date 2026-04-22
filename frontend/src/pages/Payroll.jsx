import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import StatCard from '../components/StatCard';
import ChartCard from '../components/ChartCard';
import ExportModal from '../components/ExportModal';
import Skeleton, { TableSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { API_BASE } from '../api';
import { generateMonthOptions } from '../utils/dateUtils';

export default function Payroll() {
  const [payrollData, setPayrollData] = useState([]);
  const [summary, setSummary] = useState({ TotalPayroll: 0, AvgSalary: 0 });
  const [loading, setLoading] = useState(true);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('All Months');
  const [searchQuery, setSearchQuery] = useState('');

  const months = ['All Months', ...generateMonthOptions(12)];

  useEffect(() => {
    setLoading(true);
    const monthQuery = selectedMonth !== 'All Months' ? `?month=${encodeURIComponent(selectedMonth)}` : '';
    Promise.all([
      fetch(`${API_BASE}/payroll${monthQuery}`).then(res => res.json()),
      fetch(`${API_BASE}/payroll/summary${monthQuery}`).then(res => res.json())
    ]).then(([data, summ]) => {
      setPayrollData(Array.isArray(data) ? data : []);
      setSummary(summ && !summ.error ? summ : { TotalPayroll: 0, AvgSalary: 0 });
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setPayrollData([]);
      setLoading(false);
    });
  }, [selectedMonth]);

  const filteredData = payrollData.filter(p => 
    p.FullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lineData = {
    labels: payrollData.slice(0, 6).reverse().map(p => p.MonthYear),
    datasets: [{
      label: 'Financial Trend',
      data: payrollData.slice(0, 6).reverse().map(p => p.TotalSalary),
      borderColor: '#4f46e5',
      backgroundColor: 'rgba(79, 70, 229, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: '#fff'
    }]
  };

  return (
    <div className="pb-5">
      <div className="d-flex justify-content-between align-items-center mb-5 animate-slide-up">
        <div>
          <h2 className="fw-bold text-dark mb-1 tracking-tight">Payroll Register</h2>
          <p className="text-muted small mb-0">Manage organizational distributions, taxations and shared dividends.</p>
        </div>
        <div className="d-flex gap-2">
            <button className="btn btn-white border px-3 shadow-sm d-flex align-items-center gap-2 fw-bold" onClick={() => setIsExportModalOpen(true)}>
                <i className="bi bi-file-earmark-spreadsheet text-success"></i> Export Report
            </button>
            <button className="btn btn-primary-custom px-3 shadow-sm fw-bold">
                <i className="bi bi-check2-circle me-1"></i> Finalize Payroll
            </button>
        </div>
      </div>

      <div className="row g-4 mb-5">
        <div className="col-12 col-md-6">
          <StatCard title="Total Distribution" value={`$${summary.TotalPayroll?.toLocaleString() || 0}`} icon="bi-wallet-fill" color="#4f46e5" />
        </div>
        <div className="col-12 col-md-6">
          <StatCard title="Average Payout" value={`$${summary.AvgSalary?.toLocaleString() || 0}`} icon="bi-graph-up-arrow" color="#10b981" />
        </div>
      </div>

      <div className="row g-4 mb-5">
        <div className="col-12">
          <ChartCard title="Disbursement Trends" subtitle="Net salary progression over the last few cycles">
            {loading ? <Skeleton height="320px" /> : <Line data={lineData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: '#f1f5f9' } } } }} /> }
          </ChartCard>
        </div>
      </div>

      <div className="table-container p-0 border-0 shadow-sm animate-slide-up glass-card" style={{ animationDelay: '0.1s' }}>
        <div className="filter-bar">
          <div className="search-input-wrapper">
             <i className="bi bi-search position-absolute top-50 translate-middle-y ms-3 text-muted"></i>
             <input type="text" placeholder="Search by talent name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <select className="form-select form-control-custom w-auto border-0 bg-light fw-bold" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
             {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div className="table-responsive">
          <table className="table-custom">
            <thead>
              <tr>
                <th>Identity</th>
                <th>Base</th>
                <th>Bonus</th>
                <th>Deductions</th>
                <th className="fw-bold">Net Distribution</th>
                <th className="text-end">Summary</th>
              </tr>
            </thead>
            {loading ? <TableSkeleton rows={7} columns={6} /> : (
              <tbody>
                {filteredData.map((p, i) => (
                  <tr key={i}>
                    <td>
                      <div className="fw-bold text-dark">{p.FullName}</div>
                      <div className="text-muted extra-small">{p.MonthYear}</div>
                    </td>
                    <td><span className="text-muted small fw-bold">${p.BaseSalary?.toLocaleString()}</span></td>
                    <td className="text-success fw-bold small">+${p.Bonus?.toLocaleString()}</td>
                    <td className="text-danger fw-bold small">-${p.Deductions?.toLocaleString()}</td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <span className="fw-bold text-dark fs-6">${p.TotalSalary?.toLocaleString()}</span>
                        {p.TotalSalary > 10000 && <i className="bi bi-star-fill text-warning extra-small"></i>}
                      </div>
                    </td>
                    <td className="text-end">
                       <button className="btn-icon">
                          <i className="bi bi-file-earmark-pdf"></i>
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
          {!loading && filteredData.length === 0 && (
            <EmptyState icon="💰" title="Financials clear" message="No payroll records found for the given criteria. Ensure the selected audit month is correct." />
          )}
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
    </div>
  );
}
