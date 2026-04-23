import { useState, useEffect, useCallback } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import ChartCard from '../components/ChartCard';
import ExportModal from '../components/ExportModal';
import Skeleton from '../components/Skeleton';
import { API_BASE, fetchAuth } from '../api';

export default function Reports() {
  const [activeTab, setActiveTab] = useState('HR');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    hr: { bar: { labels: [], datasets: [] }, donut: { labels: [], datasets: [] }, table: [] },
    payroll: { line: { labels: [], datasets: [] }, bar: { labels: [], datasets: [] }, table: [] },
    attendance: { bar: { labels: [], datasets: [] }, table: [] },
    dividend: { donut: { labels: [], datasets: [] }, table: [] }
  });

  const tabs = [
    { id: 'HR', label: 'HR Analytics', icon: 'bi-person-badge' },
    { id: 'PAYROLL', label: 'Payroll Metrics', icon: 'bi-cash-coin' },
    { id: 'ATTENDANCE', label: 'Operations', icon: 'bi-calendar-week' },
    { id: 'DIVIDEND', label: 'Dividends', icon: 'bi-wallet' }
  ];

  const loadHRData = useCallback(async () => {
    try {
        const [hrDist] = await Promise.all([
            fetchAuth(`${API_BASE}/reports/hr`).then(res => res.json())
        ]);
        const statuses = hrDist.reduce((acc, curr) => {
             acc[curr.Status] = (acc[curr.Status] || 0) + curr.Count;
             return acc;
        }, {});
        const total = hrDist.reduce((acc, curr) => acc + curr.Count, 0);

        setData(prev => ({
            ...prev,
            hr: {
                bar: { labels: ['Active Workforce'], datasets: [{ label: 'Operational Members', data: [total], backgroundColor: '#4f46e5', borderRadius: 12 }] },
                donut: { labels: Object.keys(statuses), datasets: [{ data: Object.values(statuses), backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#4f46e5'], borderWidth: 0 }] },
                table: [ { metric: 'Total Identified Talent', value: total }, { metric: 'Unique Status Segments', value: Object.keys(statuses).length } ]
            }
        }));
    } catch (e) { console.error(e); }
  }, []);

  const loadPayrollData = useCallback(async () => {
    try {
        const [history] = await Promise.all([
            fetchAuth(`${API_BASE}/reports/payroll`).then(res => res.json())
        ]);
        const last6 = (history || []).slice(-6);
        const totalPayroll = history.reduce((acc, curr) => acc + curr.TotalNet, 0);
        const avgPayroll = history.length ? totalPayroll / history.length : 0;
        setData(prev => ({
            ...prev,
            payroll: {
                line: { labels: last6.map(h => h.Month), datasets: [{ label: 'Net Inflow', data: last6.map(h => h.TotalNet), borderColor: '#4f46e5', fill: true, backgroundColor: 'rgba(79, 70, 229, 0.1)', tension: 0.4 }] },
                bar: { labels: last6.map(h => h.Month), datasets: [{ label: 'Deductions', data: last6.map(h => h.TotalDeductions), backgroundColor: '#ef4444', borderRadius: 8 }] },
                table: [ { metric: 'Cumulative Payroll', value: `$${totalPayroll.toLocaleString()}` }, { metric: 'Median Compensation', value: `$${avgPayroll.toLocaleString()}` } ]
            }
        }));
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    setLoading(true);
    let p;
    if (activeTab === 'HR') p = loadHRData();
    else if (activeTab === 'PAYROLL') p = loadPayrollData();
    else p = Promise.resolve();
    p.finally(() => setLoading(false));
  }, [activeTab, loadHRData, loadPayrollData]);

  const activeContent = data[activeTab.toLowerCase()] || data.hr;

  return (
    <div className="pb-5">
      <div className="d-flex justify-content-between align-items-center mb-5 animate-slide-up">
        <div>
          <h2 className="fw-bold text-dark mb-1 tracking-tight">Intelligence & Audits</h2>
          <p className="text-muted small mb-0">Deep-dive into organizational metrics with automated reporting.</p>
        </div>
        <button className="btn btn-primary-custom px-4 shadow-sm fw-bold" onClick={() => setIsExportModalOpen(true)}>
           <i className="bi bi-file-earmark-pdf me-2"></i> Export Summary
        </button>
      </div>

      <div className="card-custom p-2 mb-5 bg-white border shadow-sm glass-card animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <ul className="nav nav-pills gap-1">
          {tabs.map(tab => (
            <li key={tab.id} className="nav-item">
              <button className={`nav-link rounded-3 px-4 py-2 fw-bold small d-flex align-items-center gap-2 transition-all ${activeTab === tab.id ? 'bg-primary text-white shadow' : 'text-muted hover-bg-light'}`} onClick={() => setActiveTab(tab.id)}>
                <i className={`bi ${tab.icon}`}></i> {tab.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {loading ? <div className="py-5 text-center"><div className="spinner-border text-primary"></div></div> : (
        <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="row g-4 mb-5">
             <div className="col-12 col-xl-7">
                <ChartCard title={`${activeTab} Flow Overview`} subtitle="Primary distribution over recent operational cycles">
                   <div style={{ height: '350px' }}>
                      {activeTab === 'HR' && <Bar data={activeContent.bar} options={{ responsive: true, maintainAspectRatio: false }} />}
                      {activeTab === 'PAYROLL' && <Line data={activeContent.line} options={{ responsive: true, maintainAspectRatio: false }} />}
                   </div>
                </ChartCard>
             </div>
             <div className="col-12 col-xl-5">
                <ChartCard title="Segment Distribution" subtitle="Percentage share across identified sectors">
                    <div style={{ height: '350px' }}>
                       {activeTab === 'HR' && <Doughnut data={activeContent.donut} options={{ cutout: '70%', maintainAspectRatio: false }} />}
                       {activeTab === 'PAYROLL' && <Bar data={activeContent.bar} options={{ maintainAspectRatio: false }} />}
                    </div>
                </ChartCard>
             </div>
          </div>

          <div className="table-container p-5 border-0 shadow-sm glass-card text-center">
             <h5 className="fw-bold text-dark mb-5 text-uppercase ls-wide extra-small">Executive Statistics Summary</h5>
             <div className="row g-4">
                {activeContent.table.map((item, i) => (
                   <div key={i} className="col-12 col-md-4">
                      <div className="p-4 rounded-4 border bg-light bg-opacity-25 hover-lift">
                         <div className="text-muted extra-small fw-bold mb-2 text-uppercase ls-wide">{item.metric}</div>
                         <div className="h2 fw-bold text-dark mb-0 tracking-tight">{item.value}</div>
                      </div>
                   </div>
                ))}
             </div>
          </div>
        </div>
      )}

      <ExportModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} title={`${activeTab} Executive Report`} columns={[{header:'Metric', key:'metric'}, {header:'Value', key:'value'}]} data={activeContent.table} filename={`${activeTab}_Analytics`} />
    </div>
  );
}
