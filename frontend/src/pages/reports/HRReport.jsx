import React, { useState, useEffect, useCallback } from 'react';
import { Doughnut, Bar } from 'react-chartjs-2';
import { API_BASE, fetchAuth } from '../../api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getStatusPresentation } from '../../utils/status';

function StatusBadge({ status }) {
  const presentation = getStatusPresentation(status);
  return <span className={`badge ${presentation.className}`}>{presentation.label}</span>;
}

export default function HRReport({ setExportFunctions }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [deptRes, reportRes] = await Promise.all([
        fetchAuth(`${API_BASE}/departments`).then(res => res.json()),
        fetchAuth(`${API_BASE}/reports/hr`).then(res => res.json())
      ]);

      setDepartments(Array.isArray(deptRes) ? deptRes : []);
      setData(Array.isArray(reportRes) ? reportRes : []);
    } catch (error) {
      console.error("HR Report load error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Normalize report rows so status values work with both English and Vietnamese data
  const normalizedData = data.map((row) => ({
    ...row,
    Count: Number(row.Count || 0),
    Department: row.Department || 'Unknown',
    NormalizedStatus: getStatusPresentation(row.Status).label,
  }));

  const filteredData = normalizedData.filter((row) => {
    const matchDepartment = selectedDept ? row.Department === selectedDept : true;
    const matchStatus = selectedStatus ? row.NormalizedStatus === selectedStatus : true;

    return matchDepartment && matchStatus;
  });
  const exportExcel = useCallback(() => {
    const exportRows = filteredData.map((row) => ({
      Department: row.Department,
      Status: row.NormalizedStatus,
      Count: row.Count,
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "HR Report");
    XLSX.writeFile(wb, "hr_report.xlsx");
  }, [filteredData]);

  const exportPDF = useCallback(() => {
    const exportRows = filteredData.map((row) => [
      row.Department,
      row.NormalizedStatus,
      row.Count,
    ]);

    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("HR Report", 14, 15);

    doc.setFontSize(10);
    doc.text(`Department: ${selectedDept || 'All Departments'}`, 14, 23);
    doc.text(`Status: ${selectedStatus || 'All Statuses'}`, 14, 29);

    autoTable(doc, {
      head: [['Department', 'Status', 'Count']],
      body: exportRows,
      startY: 35,
      styles: {
        fontSize: 10,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
      },
    });

    doc.save("hr_report.pdf");
  }, [filteredData, selectedDept, selectedStatus]);

  useEffect(() => {
    if (setExportFunctions) {
      setExportFunctions({ excel: exportExcel, pdf: exportPDF });
    }
  }, [setExportFunctions, exportExcel, exportPDF]);




  const getStatusCount = (statusLabel) =>
    filteredData
      .filter((row) => row.NormalizedStatus === statusLabel)
      .reduce((sum, row) => sum + row.Count, 0);

  const totalEmployees = filteredData.reduce((sum, row) => sum + row.Count, 0);
  const activeEmployees = getStatusCount('Active');
  const inactiveEmployees = getStatusCount('Inactive');
  // Chart Data: Status Distribution (Donut) – normalized English labels
  const statusLabels = [...new Set(filteredData.map((r) => r.NormalizedStatus))];

  const statusData = statusLabels.map((statusLabel) =>
    filteredData
      .filter((row) => row.NormalizedStatus === statusLabel)
      .reduce((sum, row) => sum + row.Count, 0)
  );

  const STATUS_COLORS = {
    Active: '#10b981',
    'On Leave': '#f59e0b',
    Probation: '#3b82f6',
    Inactive: '#ef4444',
  };

  const statusColors = statusLabels.map((statusLabel) => STATUS_COLORS[statusLabel] || '#94a3b8');
  // Chart Data: Department Distribution (Bar)
  const deptLabels = [...new Set(filteredData.map((r) => r.Department))];

  const deptCounts = deptLabels.map((dept) =>
    filteredData
      .filter((row) => row.Department === dept)
      .reduce((sum, row) => sum + row.Count, 0)
  );

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } }
    }
  };

  return (
    <div className="hr-report">
      {/* Filters */}
      <div className="card border-0 shadow-sm p-3 mb-4 bg-white">
        <div className="row g-3">
          <div className="col-md-3">
            <label className="form-label small fw-bold text-muted">Department</label>
            <select className="form-select form-select-sm" value={selectedDept} onChange={e => setSelectedDept(e.target.value)}>
              <option value="">All Departments</option>
              {departments.map(d => <option key={d.DepartmentID} value={d.DepartmentName}>{d.DepartmentName}</option>)}
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label small fw-bold text-muted">Status</label>
            <select className="form-select form-select-sm" value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="On Leave">On Leave</option>
              <option value="Probation">Probation</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm p-3 text-center h-100">
            <h6 className="text-muted mb-2">Total Employees</h6>
            <h3 className="mb-0 fw-bold">{totalEmployees}</h3>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm p-3 text-center h-100">
            <h6 className="text-muted mb-2 text-success">Active</h6>
            <h3 className="mb-0 fw-bold text-success">{activeEmployees}</h3>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm p-3 text-center h-100">
            <h6 className="text-muted mb-2 text-danger">Inactive</h6>
            <h3 className="mb-0 fw-bold text-danger">{inactiveEmployees}</h3>
          </div>
        </div>
      </div>

      {/* Charts & Table */}
      {loading ? (
        <div className="py-5 text-center"><div className="spinner-border text-primary"></div></div>
      ) : (
        <div className="row g-4">
          <div className="col-lg-5">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <h6 className="fw-bold mb-4 text-muted text-uppercase ls-1">Status Distribution</h6>
                <div style={{ height: '250px' }}>
                  <Doughnut
                    data={{
                      labels: statusLabels,
                      datasets: [{ data: statusData, backgroundColor: statusColors, borderWidth: 0 }]
                    }}
                    options={{ ...chartOptions, cutout: '70%' }}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="col-lg-7">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <h6 className="fw-bold mb-4 text-muted text-uppercase ls-1">By Department</h6>
                <div style={{ height: '250px' }}>
                  <Bar
                    data={{
                      labels: deptLabels,
                      datasets: [{ label: 'Employees', data: deptCounts, backgroundColor: '#3b82f6', borderRadius: 4 }]
                    }}
                    options={chartOptions}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="col-12">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <h6 className="fw-bold mb-4 text-muted text-uppercase ls-1">Detailed Data</h6>
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Department</th>
                        <th>Status</th>
                        <th>Employee Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((row, idx) => (
                        <tr key={idx}>
                          <td>{row.Department}</td>
                          <td>
                            <StatusBadge status={row.NormalizedStatus} />
                          </td>
                          <td>{row.Count}</td>
                        </tr>
                      ))}

                      {filteredData.length === 0 && (
                        <tr>
                          <td colSpan="3" className="text-center text-muted py-3">
                            No data found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
