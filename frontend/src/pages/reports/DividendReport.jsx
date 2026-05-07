import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Doughnut, Bar } from 'react-chartjs-2';
import { API_BASE, fetchAuth } from '../../api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function DividendReport({ setExportFunctions }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAuth(`${API_BASE}/dividends`);
      const result = await res.json();
      console.log('Dividend Data received:', result);
      setData(Array.isArray(result) ? result : []);
    } catch (error) {
      console.error('Dividend Report load error:', error);
      setData([]);
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

  const normalizedData = useMemo(() => {
    return data.map((row) => ({
      FullName: row.FullName || 'Unknown Employee',
      Amount: Number(row.Amount || 0),
    }));
  }, [data]);

  const totalDividend = normalizedData.reduce((sum, row) => sum + row.Amount, 0);
  const recipientCount = normalizedData.length;
  const avgDividend = recipientCount > 0 ? totalDividend / recipientCount : 0;

  const exportExcel = useCallback(() => {
    const exportData = normalizedData.map((row) => ({
      'Employee Name': row.FullName,
      Amount: row.Amount,
      Currency: 'VND',
      '% Share':
        totalDividend > 0
          ? `${((row.Amount / totalDividend) * 100).toFixed(2)}%`
          : '0%',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dividend Report');
    XLSX.writeFile(wb, 'dividend_report.xlsx');
  }, [normalizedData, totalDividend]);

  // Helper to remove Vietnamese diacritics for PDF export (jsPDF default fonts don't support Unicode)
  const removeDiacritics = (str) => {
    if (!str) return '';
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
  };

  const exportPDF = useCallback(() => {
    const exportRows = normalizedData.map((row) => [
      removeDiacritics(row.FullName), // Clean Vietnamese characters
      formatVND(row.Amount),
      totalDividend > 0
        ? `${((row.Amount / totalDividend) * 100).toFixed(2)}%`
        : '0%',
    ]);

    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text('Dividend Report', 14, 15);

    doc.setFontSize(10);
    doc.text('Currency: VND (Note: Names normalized for PDF compatibility)', 14, 23);

    autoTable(doc, {
      head: [['Employee Name', 'Amount', '% Share']],
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

    doc.save('dividend_report.pdf');
  }, [normalizedData, totalDividend, formatVND]);

  useEffect(() => {
    if (setExportFunctions) {
      setExportFunctions({ excel: exportExcel, pdf: exportPDF });
    }
  }, [setExportFunctions, exportExcel, exportPDF]);

  const sortedData = useMemo(() => {
    return [...normalizedData].sort((a, b) => b.Amount - a.Amount);
  }, [normalizedData]);

  let donutLabels = [];
  let donutData = [];

  if (sortedData.length > 8) {
    const top8 = sortedData.slice(0, 8);
    const others = sortedData.slice(8);

    donutLabels = [...top8.map((row) => row.FullName), 'Others'];
    donutData = [
      ...top8.map((row) => row.Amount),
      others.reduce((sum, row) => sum + row.Amount, 0),
    ];
  } else {
    donutLabels = sortedData.map((row) => row.FullName);
    donutData = sortedData.map((row) => row.Amount);
  }

  const top10 = sortedData.slice(0, 10);
  const barLabels = top10.map((row) => row.FullName);
  const barData = top10.map((row) => row.Amount);

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
            const label = context.label || context.dataset.label || '';
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
    <div className="dividend-report">
      {/* KPIs */}
      <div className="row g-4 mb-4">
        <div className="col-md-4">
          <div className="stat-card stat-card-vivid stat-card-green animate-in" style={{ animationDelay: '0.1s' }}>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <div className="stat-card-label">Total Dividend Paid</div>
                <div className="stat-card-value">
                  {formatVND(totalDividend)}
                </div>
              </div>
              <div className="stat-card-icon">
                <i className="bi bi-cash-coin"></i>
              </div>
            </div>
            <div className="small text-muted mt-2">Total distribution pool</div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="stat-card stat-card-vivid stat-card-blue animate-in" style={{ animationDelay: '0.2s' }}>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <div className="stat-card-label">Total Recipients</div>
                <div className="stat-card-value">
                  {recipientCount} <span className="small opacity-50">Staff</span>
                </div>
              </div>
              <div className="stat-card-icon">
                <i className="bi bi-people-fill"></i>
              </div>
            </div>
            <div className="small text-muted mt-2">Eligible stakeholders</div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="stat-card stat-card-vivid stat-card-pink animate-in" style={{ animationDelay: '0.3s' }}>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <div className="stat-card-label">Average Dividend</div>
                <div className="stat-card-value">
                  {formatVND(avgDividend)}
                </div>
              </div>
              <div className="stat-card-icon">
                <i className="bi bi-graph-up-arrow"></i>
              </div>
            </div>
            <div className="small text-muted mt-2">Per capita distribution</div>
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
                  Dividend Share
                </h6>

                <div style={{ height: '300px' }}>
                  <Doughnut
                    data={{
                      labels: donutLabels,
                      datasets: [
                        {
                          data: donutData,
                          backgroundColor: [
                            '#10b981',
                            '#3b82f6',
                            '#f59e0b',
                            '#ef4444',
                            '#8b5cf6',
                            '#ec4899',
                            '#06b6d4',
                            '#64748b',
                            '#cbd5e1',
                          ],
                          borderWidth: 0,
                        },
                      ],
                    }}
                    options={{ ...chartOptions, cutout: '65%' }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-7">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <h6 className="fw-bold mb-4 text-muted text-uppercase ls-1">
                  Top Recipients
                </h6>

                <div style={{ height: '300px' }}>
                  <Bar
                    data={{
                      labels: barLabels,
                      datasets: [
                        {
                          label: 'Dividend Amount',
                          data: barData,
                          backgroundColor: '#8b5cf6',
                          borderRadius: 4,
                        },
                      ],
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
                <h6 className="fw-bold mb-4 text-muted text-uppercase ls-1">
                  Detailed Dividend Data
                </h6>

                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Employee Name</th>
                        <th>Amount</th>
                        <th>% Share</th>
                      </tr>
                    </thead>

                    <tbody>
                      {normalizedData.map((row, idx) => (
                        <tr key={idx}>
                          <td className="fw-medium">{row.FullName}</td>
                          <td className="text-success fw-bold">
                            {formatVND(row.Amount)}
                          </td>
                          <td>
                            {totalDividend > 0
                              ? ((row.Amount / totalDividend) * 100).toFixed(2)
                              : 0}
                            %
                          </td>
                        </tr>
                      ))}

                      {normalizedData.length === 0 && (
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