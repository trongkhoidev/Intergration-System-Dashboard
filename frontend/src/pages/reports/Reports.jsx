import { useState } from 'react';
import { getCurrentUser } from '../../utils/auth';

import HRReport from './HRReport';
import PayrollReport from './PayrollReport';
import AttendanceReport from './AttendanceReport';
import DividendReport from './DividendReport';

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
  const [exportFns, setExportFns] = useState({ excel: null, pdf: null });

  const handleExportExcel = () => {
    if (exportFns.excel) {
      exportFns.excel();
    }
  };

  const handleExportPDF = () => {
    if (exportFns.pdf) {
      exportFns.pdf();
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
          <button className="btn btn-outline" onClick={handleExportExcel} disabled={!exportFns.excel}>
            <i className="bi bi-file-earmark-excel me-2"></i> Export Excel
          </button>
          <button className="btn btn-primary shadow-sm" onClick={handleExportPDF} disabled={!exportFns.pdf}>
            <i className="bi bi-file-earmark-pdf me-2"></i> Export PDF
          </button>
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

      {/* Report Content */}
      <div className="report-content">
        {activeTab === 'HR' && <HRReport setExportFunctions={setExportFns} />}
        {activeTab === 'PAYROLL' && <PayrollReport setExportFunctions={setExportFns} />}
        {activeTab === 'ATTENDANCE' && <AttendanceReport setExportFunctions={setExportFns} />}
        {activeTab === 'DIVIDEND' && <DividendReport setExportFunctions={setExportFns} />}
      </div>
    </div>
  );
}
