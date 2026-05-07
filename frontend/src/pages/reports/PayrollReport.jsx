import React, { useState, useEffect, useCallback } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { API_BASE, fetchAuth } from '../../api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function PayrollReport({ setExportFunctions }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAuth(`${API_BASE}/reports/payroll`);
      const result = await res.json();
      setData(Array.isArray(result) ? result : []);
    } catch (error) {
      console.error('Payroll Report load error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatVND = useCallback((value) => {
    const number = Number(value || 0);
    return `${number.toLocaleString('vi-VN')} VND`;
  }, []);

  const normalizedData = data.map((row) => ({
    Month: row.Month || 'Unknown',
    TotalBase: Number(row.TotalBase || 0),
    TotalBonus: Number(row.TotalBonus || 0),
    TotalDeductions: Number(row.TotalDeductions || 0),
    TotalNet: Number(row.TotalNet || 0),
  }));

  const exportExcel = useCallback(() => {
    const exportRows = normalizedData.map((row) => ({
      Month: row.Month,
      'Total Base Salary': row.TotalBase,
      'Total Bonus': row.TotalBonus,
      'Total Deductions': row.TotalDeductions,
      'Total Net Salary': row.TotalNet,
      Currency: 'VND',
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payroll Report');
    XLSX.writeFile(wb, 'payroll_report.xlsx');
  }, [normalizedData]);

  const exportPDF = useCallback(() => {
    const exportRows = normalizedData.map((row) => [
      row.Month,
      formatVND(row.TotalBase),
      formatVND(row.TotalBonus),
      formatVND(row.TotalDeductions),
      formatVND(row.TotalNet),
    ]);

    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text('Payroll Report', 14, 15);

    doc.setFontSize(10);
    doc.text('Currency: VND', 14, 23);

    autoTable(doc, {
      head: [['Month', 'Total Base', 'Total Bonus', 'Total Deductions', 'Total Net']],
      body: exportRows,
      startY: 30,
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
      },
    });

    doc.save('payroll_report.pdf');
  }, [normalizedData, formatVND]);

  useEffect(() => {
    if (setExportFunctions) {
      setExportFunctions({ excel: exportExcel, pdf: exportPDF });
    }
  }, [setExportFunctions, exportExcel, exportPDF]);

  // KPIs
  const lastMonthData =
    normalizedData.length > 0
      ? normalizedData[normalizedData.length - 1]
      : { TotalNet: 0, TotalBonus: 0 };

  const totalNetAllTime = normalizedData.reduce(
    (sum, row) => sum + row.TotalNet,
    0
  );

  const avgMonthlyNet =
    normalizedData.length > 0 ? totalNetAllTime / normalizedData.length : 0;

  // Chart Data: Net Salary Trend
  const labels = normalizedData.map((row) => row.Month);
  const netData = normalizedData.map((row) => row.TotalNet);

  // Chart Data: Breakdown
  const baseData = normalizedData.map((row) => row.TotalBase);
  const bonusData = normalizedData.map((row) => row.TotalBonus);
  const deductionsData = normalizedData.map((row) => row.TotalDeductions);

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
      tooltip: {
        backgroundColor: '#0f172a',
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            return `${label}: ${formatVND(context.raw)}`;
          },
        },
      },
    },
    scales: {
      y: {
        ticks: {
          callback: (value) => formatVND(value),
        },
      },
    },
  };

  return (
    <div className="payroll-report">
      {/* KPIs */}
      <div className="row g-4 mb-4">
        <div className="col-md-4">
          <div className="stat-card stat-card-vivid stat-card-blue animate-in" style={{ animationDelay: '0.1s' }}>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <div className="stat-card-label">Total Net (Latest Month)</div>
                <div className="stat-card-value">
                  {formatVND(lastMonthData.TotalNet)}
                </div>
              </div>
              <div className="stat-card-icon">
                <i className="bi bi-wallet2"></i>
              </div>
            </div>
            <div className="small text-muted mt-2">Current period payout</div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="stat-card stat-card-vivid stat-card-pink animate-in" style={{ animationDelay: '0.2s' }}>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <div className="stat-card-label">Avg Monthly Payroll</div>
                <div className="stat-card-value">
                  {formatVND(avgMonthlyNet)}
                </div>
              </div>
              <div className="stat-card-icon">
                <i className="bi bi-calculator"></i>
              </div>
            </div>
            <div className="small text-muted mt-2">Overall monthly average</div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="stat-card stat-card-vivid stat-card-green animate-in" style={{ animationDelay: '0.3s' }}>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <div className="stat-card-label">Bonus (Latest Month)</div>
                <div className="stat-card-value">
                  {formatVND(lastMonthData.TotalBonus)}
                </div>
              </div>
              <div className="stat-card-icon">
                <i className="bi bi-gift"></i>
              </div>
            </div>
            <div className="small text-muted mt-2">Incentives distributed</div>
          </div>
        </div>
      </div>

      {/* Charts & Table */}
      {loading ? (
        <div className="py-5 text-center">
          <div className="spinner-border text-primary"></div>
        </div>
      ) : (
        <div className="row g-4">
          {/* Trend Analytics Chart Removed per user request */}
          

          <div className="col-lg-12">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <h6 className="fw-bold mb-4 text-muted text-uppercase ls-1">
                  Salary Breakdown by Month
                </h6>

                <div style={{ height: '300px' }}>
                  <Bar
                    data={{
                      labels,
                      datasets: [
                        {
                          label: 'Base Salary',
                          data: baseData,
                          backgroundColor: '#3b82f6',
                        },
                        {
                          label: 'Bonus',
                          data: bonusData,
                          backgroundColor: '#10b981',
                        },
                        {
                          label: 'Deductions',
                          data: deductionsData,
                          backgroundColor: '#ef4444',
                        },
                      ],
                    }}
                    options={{
                      ...chartOptions,
                      scales: {
                        x: { stacked: true },
                        y: {
                          stacked: true,
                          ticks: {
                            callback: (value) => formatVND(value),
                          },
                        },
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
                  Detailed Payroll Data
                </h6>

                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Month</th>
                        <th>Base Salary</th>
                        <th>Bonus</th>
                        <th>Deductions</th>
                        <th>Net Salary</th>
                      </tr>
                    </thead>

                    <tbody>
                      {normalizedData.map((row, idx) => (
                        <tr key={idx}>
                          <td>{row.Month}</td>
                          <td>{formatVND(row.TotalBase)}</td>
                          <td className="text-success">{formatVND(row.TotalBonus)}</td>
                          <td className="text-danger">{formatVND(row.TotalDeductions)}</td>
                          <td className="fw-bold">{formatVND(row.TotalNet)}</td>
                        </tr>
                      ))}

                      {normalizedData.length === 0 && (
                        <tr>
                          <td colSpan="5" className="text-center text-muted py-3">
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