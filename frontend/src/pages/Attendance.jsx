import { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import StatCard from '../components/StatCard';
import ChartCard from '../components/ChartCard';
import ExportModal from '../components/ExportModal';
import Skeleton, { TableSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { API_BASE } from '../api';
import { generateMonthOptions } from '../utils/dateUtils';

export default function Attendance() {
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('All Months');
  const [searchQuery, setSearchQuery] = useState('');

  const months = ['All Months', ...generateMonthOptions(12)];

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/attendance?month=${encodeURIComponent(selectedMonth)}`)
      .then(res => res.json())
      .then(data => {
        setAttendanceData(Array.isArray(data) ? data : []);
        setLoading(false);
      }).catch(err => {
        console.error(err);
        setAttendanceData([]);
        setLoading(false);
      });
  }, [selectedMonth]);

  const filteredData = attendanceData.filter(a => 
    a.FullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const barData = {
    labels: filteredData.slice(0, 8).map(a => a.FullName),
    datasets: [
      {
        label: 'Work Days',
        data: filteredData.slice(0, 8).map(a => a.WorkDays || 0),
        backgroundColor: '#4f46e5',
        borderRadius: 6
      },
      {
        label: 'Leave',
        data: filteredData.slice(0, 8).map(a => a.LeaveDays || 0),
        backgroundColor: '#f59e0b',
        borderRadius: 6
      },
      {
        label: 'Absent',
        data: filteredData.slice(0, 8).map(a => a.AbsentDays || 0),
        backgroundColor: '#ef4444',
        borderRadius: 6
      }
    ]
  };

  const chartOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, padding: 25, font: { weight: '600' } } },
      tooltip: { backgroundColor: '#1e293b', padding: 12, cornerRadius: 8 }
    },
    scales: {
      x: { stacked: true, grid: { display: false } },
      y: { stacked: true, beginAtZero: true, max: 22, grid: { color: '#f1f5f9' } }
    }
  };

  return (
    <div className="pb-5">
      <div className="d-flex justify-content-between align-items-center mb-5 animate-slide-up">
        <div>
          <h2 className="fw-bold text-dark mb-1 tracking-tight">Attendance Logs</h2>
          <p className="text-muted small mb-0">Track workforce availability and presence across segments.</p>
        </div>
        <div className="d-flex gap-2">
            <button className="btn btn-white border px-3 shadow-sm d-flex align-items-center gap-2 fw-bold" onClick={() => setIsExportModalOpen(true)}>
                <i className="bi bi-download text-primary"></i> Export
            </button>
            <button className="btn btn-primary-custom px-3 shadow-sm fw-bold">
                <i className="bi bi-calendar-event me-2"></i> Monthly Review
            </button>
        </div>
      </div>

      <div className="row g-4 mb-5">
        <div className="col-12 col-md-6 col-xl-8">
          <ChartCard title="Operational Presence" subtitle="Work days distribution vs scheduled leave">
            {loading ? <Skeleton height="320px" /> : (
                filteredData.length > 0 ? <Bar data={barData} options={chartOptions} /> : <div className="text-center py-5">No data</div>
            )}
          </ChartCard>
        </div>
        <div className="col-12 col-md-6 col-xl-4 flex-column d-flex gap-4">
          <StatCard title="Global Presence" value="94.2%" icon="bi-person-check-fill" color="#4f46e5" />
          <StatCard title="Active Requests" value="12 Leave" icon="bi-envelope-heart-fill" color="#10b981" />
        </div>
      </div>

      <div className="table-container p-0 border-0 shadow-sm animate-slide-up glass-card" style={{ animationDelay: '0.1s' }}>
        <div className="filter-bar">
          <div className="search-input-wrapper">
             <i className="bi bi-search position-absolute top-50 translate-middle-y ms-3 text-muted"></i>
             <input type="text" placeholder="Filter employee presence..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
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
                <th>Status</th>
                <th>Efficiency</th>
                <th>Days Balance</th>
                <th>Intensity</th>
              </tr>
            </thead>
            {loading ? <TableSkeleton rows={8} columns={5} /> : (
              <tbody>
                {filteredData.map((a, i) => (
                  <tr key={i}>
                    <td className="fw-bold text-dark">{a.FullName}</td>
                    <td><span className={`badge-custom ${a.Status === 'Active' ? 'badge-active' : 'badge-inactive'}`}>{a.Status}</span></td>
                    <td>{a.WorkDays} / 22 <span className="text-muted extra-small">Days</span></td>
                    <td>
                      <div className="d-flex gap-2">
                         <span className={a.LeaveDays > 0 ? "fw-bold text-warning" : "text-muted"}>{a.LeaveDays || 0} L</span>
                         <span className={a.AbsentDays > 0 ? "fw-bold text-danger" : "text-muted"}>{a.AbsentDays || 0} A</span>
                      </div>
                    </td>
                    <td style={{ minWidth: '150px' }}>
                      <div className="d-flex align-items-center gap-3">
                        <div className="progress flex-grow-1" style={{ height: '6px', borderRadius: '10px', backgroundColor: '#f1f5f9' }}>
                          <div className={`progress-bar ${a.WorkDays > 20 ? 'bg-success' : 'bg-primary'}`} style={{ width: `${(a.WorkDays / 22) * 100}%`, borderRadius: '10px' }}></div>
                        </div>
                        <span className="fw-bold small">{Math.round((a.WorkDays / 22) * 100)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
          {!loading && filteredData.length === 0 && (
            <EmptyState icon="🗓️" title="No logs identified" message="We found no attendance records matching your criteria. Please verify the selected month or search terms." />
          )}
        </div>
      </div>

      <ExportModal 
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title={`Attendance Summary - ${selectedMonth}`}
        columns={[{ header: 'Employee', key: 'FullName' }, { header: 'WorkDays', key: 'WorkDays' }, { header: 'Absent', key: 'AbsentDays' }]}
        data={filteredData}
        filename={`Presence_${selectedMonth}`}
      />
    </div>
  );
}
