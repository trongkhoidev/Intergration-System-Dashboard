import { useEffect, useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { API_BASE, fetchAuth } from '../api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function MyPayroll() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuth(`${API_BASE}/my/payroll`)
      .then(r => r.json())
      .then(d => { setData(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const totalEarned = data.reduce((sum, r) => sum + (r.NetSalary || 0), 0);
  
  const chartData = {
    labels: [...data].reverse().map(r => r.MonthYear),
    datasets: [{
      label: 'Monthly Net Salary',
      data: [...data].reverse().map(r => r.NetSalary),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      tension: 0.4,
      borderWidth: 3,
      pointRadius: 5,
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
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 } } }
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header mb-4">
        <div>
          <h1 className="page-title">My Payroll History</h1>
          <p className="page-subtitle">Detailed records of your monthly compensation and benefits</p>
        </div>
        <button className="btn btn-primary shadow-sm"><i className="bi bi-download me-2"></i> Download All Payslips</button>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-lg-3">
          <div className="stat-card">
            <div className="stat-card-label">Total Earnings</div>
            <div className="stat-card-value text-primary">${totalEarned.toLocaleString()}</div>
            <div className="small text-muted mt-1">Cumulative to date</div>
          </div>
          <div className="stat-card mt-3">
            <div className="stat-card-label">Average Net</div>
            <div className="stat-card-value text-success">${data.length ? Math.round(totalEarned / data.length).toLocaleString() : 0}</div>
            <div className="small text-muted mt-1">Per payment cycle</div>
          </div>
        </div>
        <div className="col-lg-9">
          <div className="card h-100 p-3 border-0 shadow-sm">
            <h6 className="fw-bold mb-3 text-muted">Income Trend</h6>
            <div style={{ height: '180px' }}>
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>
        </div>
      </div>

      <div className="card p-0 border-0 shadow-sm overflow-hidden bg-white">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th className="ps-4">Cycle</th>
                <th>Base Salary</th>
                <th>Bonus</th>
                <th>Deductions</th>
                <th className="pe-4 text-end">Net Salary</th>
              </tr>
            </thead>
            <tbody>
              {loading ? [...Array(3)].map((_, i) => (
                <tr key={i}>
                  <td className="ps-4"><div className="skeleton" style={{ height: 20, width: 120 }}></div></td>
                  <td><div className="skeleton" style={{ height: 16, width: 80 }}></div></td>
                  <td><div className="skeleton" style={{ height: 16, width: 80 }}></div></td>
                  <td><div className="skeleton" style={{ height: 16, width: 80 }}></div></td>
                  <td className="pe-4"><div className="skeleton" style={{ height: 16, width: 80, float: 'right' }}></div></td>
                </tr>
              )) : data.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-5 text-muted">No payroll records identified</td></tr>
              ) : (
                data.map((r, i) => (
                  <tr key={i}>
                    <td className="ps-4 fw-bold text-dark">{r.MonthYear}</td>
                    <td>${(r.BaseSalary || 0).toLocaleString()}</td>
                    <td><span className="text-success fw-bold">+${(r.Bonus || 0).toLocaleString()}</span></td>
                    <td><span className="text-danger fw-bold">-${(r.Deductions || 0).toLocaleString()}</span></td>
                    <td className="pe-4 fw-bold text-primary fs-6 text-end">${(r.NetSalary || 0).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
