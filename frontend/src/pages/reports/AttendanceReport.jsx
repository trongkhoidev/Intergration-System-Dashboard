import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { API_BASE, fetchAuth } from '../../api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AttendanceReport({ setExportFunctions }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
  setLoading(true);
  try {
    const res = await fetchAuth(`${API_BASE}/attendance?month=All%20Months`);
    const result = await res.json();

    console.log('Attendance Report API result:', result);

    setData(Array.isArray(result) ? result : []);
  } catch (error) {
    console.error('Attendance Report load error:', error);
  } finally {
    setLoading(false);
  }
}, []);

  useEffect(() => {
    loadData();
  }, [loadData]);


  const normalizedData = useMemo(() => {
    return data.map((row) => ({
      FullName: row.FullName || row.EmployeeName || row.fullName || 'Unknown Employee',

      TotalWork: Number(
        row.WorkDays ??
        row.TotalWork ??
        row.TotalWorkDays ??
        row.workDays ??
        row.workdays ??
        row.work_days ??
        0
      ),

      TotalLeave: Number(
        row.LeaveDays ??
        row.TotalLeave ??
        row.TotalLeaveDays ??
        row.leaveDays ??
        row.leave_days ??
        0
      ),

      TotalAbsent: Number(
        row.AbsentDays ??
        row.TotalAbsent ??
        row.TotalAbsentDays ??
        row.absentDays ??
        row.absent_days ??
        0
      ),
    }));
  }, [data]);

  const exportExcel = useCallback(() => {
    const exportRows = normalizedData.map((row) => ({
      'Employee Name': row.FullName,
      'Work Days': row.TotalWork,
      'Leave Days': row.TotalLeave,
      'Absent Days': row.TotalAbsent,
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance Report');
    XLSX.writeFile(wb, 'attendance_report.xlsx');
  }, [normalizedData]);

  const exportPDF = useCallback(() => {
    const exportRows = normalizedData.map((row) => [
      row.FullName,
      row.TotalWork,
      row.TotalLeave,
      row.TotalAbsent,
    ]);

    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text('Attendance Report', 14, 15);

    autoTable(doc, {
      head: [['Employee', 'Work Days', 'Leave Days', 'Absent Days']],
      body: exportRows,
      startY: 25,
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
      },
    });

    doc.save('attendance_report.pdf');
  }, [normalizedData]);

  useEffect(() => {
    if (setExportFunctions) {
      setExportFunctions({ excel: exportExcel, pdf: exportPDF });
    }
  }, [setExportFunctions, exportExcel, exportPDF]);

  // KPIs
  const totalWork = normalizedData.reduce((sum, row) => sum + row.TotalWork, 0);
  const totalLeave = normalizedData.reduce((sum, row) => sum + row.TotalLeave, 0);
  const totalAbsent = normalizedData.reduce((sum, row) => sum + row.TotalAbsent, 0);

  // Chart Data: Top Absentees
  const sortedByAbsent = [...normalizedData]
    .sort((a, b) => b.TotalAbsent - a.TotalAbsent)
    .slice(0, 5);

  const absenteeLabels = sortedByAbsent.map((row) => row.FullName);
  const absenteeData = sortedByAbsent.map((row) => row.TotalAbsent);

  // Chart Data: Attendance Breakdown
  const names = normalizedData.map((row) => row.FullName);
  const workData = normalizedData.map((row) => row.TotalWork);
  const leaveData = normalizedData.map((row) => row.TotalLeave);
  const absentData = normalizedData.map((row) => row.TotalAbsent);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 10,
          font: { size: 11 },
        },
      },
    },
  };

  return (
    <div className="attendance-report">
      {/* KPIs */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm p-3 text-center h-100">
            <h6 className="text-muted mb-2">Total Work Days</h6>
            <h3 className="mb-0 fw-bold text-primary">{totalWork}</h3>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm p-3 text-center h-100">
            <h6 className="text-muted mb-2 text-warning">Total Leave Days</h6>
            <h3 className="mb-0 fw-bold text-warning">{totalLeave}</h3>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm p-3 text-center h-100">
            <h6 className="text-muted mb-2 text-danger">Total Absent Days</h6>
            <h3 className="mb-0 fw-bold text-danger">{totalAbsent}</h3>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-5 text-center">
          <div className="spinner-border text-primary"></div>
        </div>
      ) : (
        <div className="row g-4">
          <div className="col-lg-5">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <h6 className="fw-bold mb-4 text-muted text-uppercase ls-1">
                  Top Absentees
                </h6>

                <div style={{ height: '300px' }}>
                  <Bar
                    data={{
                      labels: absenteeLabels,
                      datasets: [
                        {
                          label: 'Absent Days',
                          data: absenteeData,
                          backgroundColor: '#ef4444',
                          borderRadius: 4,
                        },
                      ],
                    }}
                    options={{ ...chartOptions, indexAxis: 'y' }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-7">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <h6 className="fw-bold mb-4 text-muted text-uppercase ls-1">
                  Attendance Breakdown
                </h6>

                <div style={{ height: '300px' }}>
                  <Bar
                    data={{
                      labels: names,
                      datasets: [
                        {
                          label: 'Work Days',
                          data: workData,
                          backgroundColor: '#10b981',
                        },
                        {
                          label: 'Leave Days',
                          data: leaveData,
                          backgroundColor: '#f59e0b',
                        },
                        {
                          label: 'Absent Days',
                          data: absentData,
                          backgroundColor: '#ef4444',
                        },
                      ],
                    }}
                    options={{
                      ...chartOptions,
                      scales: {
                        x: { stacked: true },
                        y: { stacked: true },
                      },
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="col-12">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <h6 className="fw-bold mb-4 text-muted text-uppercase ls-1">
                  Detailed Attendance Data
                </h6>

                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Employee Name</th>
                        <th>Work Days</th>
                        <th>Leave Days</th>
                        <th>Absent Days</th>
                      </tr>
                    </thead>

                    <tbody>
                      {normalizedData.map((row, idx) => (
                        <tr key={idx}>
                          <td>{row.FullName}</td>
                          <td className="text-success fw-bold">{row.TotalWork}</td>
                          <td className="text-warning">{row.TotalLeave}</td>
                          <td className="text-danger fw-bold">{row.TotalAbsent}</td>
                        </tr>
                      ))}

                      {normalizedData.length === 0 && (
                        <tr>
                          <td colSpan="4" className="text-center text-muted py-3">
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