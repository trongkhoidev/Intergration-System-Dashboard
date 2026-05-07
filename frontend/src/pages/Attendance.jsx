import { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { API_BASE, fetchAuth } from '../api';
import { generateMonthOptions } from '../utils/dateUtils';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function Attendance() {
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('All Months');
  const [searchQuery, setSearchQuery] = useState('');

  const months = ['All Months', ...generateMonthOptions(12)];

  useEffect(() => {
    setLoading(true);
    fetchAuth(`${API_BASE}/attendance?month=${encodeURIComponent(selectedMonth)}`)
      .then(res => res.json())
      .then(data => {
        setAttendanceData(Array.isArray(data) ? data : []);
        setLoading(false);
      }).catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [selectedMonth]);

  const filteredData = attendanceData.filter(a => 
    a.FullName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const barData = {
    labels: filteredData.slice(0, 10).map(a => a.FullName),
    datasets: [
      {
        label: 'Work Days',
        data: filteredData.slice(0, 10).map(a => a.WorkDays || 0),
        backgroundColor: '#3b82f6',
        borderRadius: 4
      },
      {
        label: 'Leave Days',
        data: filteredData.slice(0, 10).map(a => a.LeaveDays || 0),
        backgroundColor: '#ec4899',
        borderRadius: 4
      },
      {
        label: 'Absent Days',
        data: filteredData.slice(0, 10).map(a => a.AbsentDays || 0),
        backgroundColor: '#ef4444',
        borderRadius: 4
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } },
      tooltip: { backgroundColor: '#0f172a', padding: 12, cornerRadius: 8 }
    },
    scales: {
      x: { stacked: true, grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 } } },
      y: { stacked: true, beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { color: '#94a3b8', font: { size: 10 } } }
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header mb-4">
        <div>
          <h1 className="page-title">Attendance Overview</h1>
          <p className="page-subtitle">Track workforce presence and availability trends</p>
        </div>
        <div className="d-flex gap-2">
          {/* Action buttons removed per user request */}
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm h-100 p-4">
            <h5 className="fw-800 mb-4"><i className="bi bi-bar-chart-steps text-primary me-2"></i>Attendance Breakdown</h5>
            <div style={{ height: '320px' }}>
              {loading ? <div className="skeleton h-100"></div> : <Bar data={barData} options={chartOptions} />}
            </div>
          </div>
        </div>
        <div className="col-lg-4">
          <div className="d-grid gap-3 h-100">
            <div className="stat-card stat-card-vivid stat-card-blue animate-in" style={{ animationDelay: '0.1s' }}>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="stat-card-label">Global Presence</div>
                  <div className="stat-card-value">94.8%</div>
                </div>
                <div className="stat-card-icon">
                  <i className="bi bi-person-check-fill"></i>
                </div>
              </div>
              
            </div>
            
            <div className="stat-card stat-card-vivid stat-card-pink animate-in" style={{ animationDelay: '0.2s' }}>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="stat-card-label">On Leave Today</div>
                  <div className="stat-card-value">12 <span className="small opacity-50">Staff</span></div>
                </div>
                <div className="stat-card-icon">
                  <i className="bi bi-calendar-x"></i>
                </div>
              </div>
              <div className="small text-muted mt-2">Scheduled absences</div>
            </div>

            <div className="stat-card stat-card-vivid stat-card-green animate-in" style={{ animationDelay: '0.3s' }}>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="stat-card-label">Avg. Work Days</div>
                  <div className="stat-card-value">21.2 <span className="small opacity-50">Days</span></div>
                </div>
                <div className="stat-card-icon">
                  <i className="bi bi-calendar3-week"></i>
                </div>
              </div>
              <div className="small text-muted mt-2">Per month per employee</div>
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
          <select className="form-select w-auto" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
             {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th className="ps-4">Employee</th>
                <th>Work Days</th>
                <th>Leave Days</th>
                <th>Absent Days</th>
                <th className="pe-4">Intensity</th>
              </tr>
            </thead>
            <tbody>
              {loading ? [...Array(5)].map((_, i) => (
                <tr key={i}>
                  <td className="ps-4"><div className="skeleton" style={{ height: 20, width: 180 }}></div></td>
                  <td><div className="skeleton" style={{ height: 16, width: 80 }}></div></td>
                  <td><div className="skeleton" style={{ height: 16, width: 80 }}></div></td>
                  <td><div className="skeleton" style={{ height: 16, width: 80 }}></div></td>
                  <td className="pe-4"><div className="skeleton" style={{ height: 10, width: '100%', borderRadius: 10 }}></div></td>
                </tr>
              )) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-5 text-muted">No attendance records found</td>
                </tr>
              ) : (
                filteredData.map((a, i) => (
                  <tr key={i}>
                    <td className="ps-4">
                      <div className="fw-bold text-dark">{a.FullName}</div>
                      <div className="small text-muted">{selectedMonth}</div>
                    </td>
                    <td><span className="fw-bold text-primary">{a.WorkDays || 0}</span></td>
                    <td><span className="fw-bold text-warning">{a.LeaveDays || 0}</span></td>
                    <td><span className="fw-bold text-danger">{a.AbsentDays || 0}</span></td>
                    <td className="pe-4" style={{ minWidth: 150 }}>
                      <div className="d-flex align-items-center gap-2">
                        <div className="progress flex-grow-1" style={{ height: 6, borderRadius: 10 }}>
                          <div className="progress-bar bg-primary" style={{ width: `${(a.WorkDays / 22) * 100}%`, borderRadius: 10 }}></div>
                        </div>
                        <span className="small fw-bold">{Math.round((a.WorkDays / 22) * 100)}%</span>
                      </div>
                    </td>
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
