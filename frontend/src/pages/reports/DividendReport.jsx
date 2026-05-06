import React, { useState, useEffect, useCallback } from 'react';
import { Doughnut, Bar } from 'react-chartjs-2';
import { API_BASE, fetchAuth } from '../../api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function DividendReport({ setExportFunctions }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAuth(`${API_BASE}/reports/dividends`);
      const result = await res.json();
      setData(Array.isArray(result) ? result : []);
    } catch (error) {
      console.error("Dividend Report load error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // KPIs
  const totalDividend = data.reduce((sum, row) => sum + parseFloat(row.Amount || 0), 0);
  const recipientCount = data.length;
  const avgDividend = recipientCount > 0 ? totalDividend / recipientCount : 0;

  const exportExcel = useCallback(() => {
    const exportData = data.map(row => ({
      ...row,
      '% Share': totalDividend > 0 ? ((row.Amount / totalDividend) * 100).toFixed(2) + '%' : '0%'
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dividend Report");
    XLSX.writeFile(wb, "dividend_report.xlsx");
  }, [data, totalDividend]);

  const exportPDF = useCallback(() => {
    const doc = new jsPDF();
    doc.text("Dividend Report", 14, 15);
    doc.autoTable({
      head: [['Employee Name', 'Amount', '% Share']],
      body: data.map(row => [
        row.FullName, 
        `$${parseFloat(row.Amount).toLocaleString()}`, 
        totalDividend > 0 ? ((row.Amount / totalDividend) * 100).toFixed(2) + '%' : '0%'
      ]),
      startY: 20
    });
    doc.save("dividend_report.pdf");
  }, [data, totalDividend]);

  useEffect(() => {
    if (setExportFunctions) {
      setExportFunctions({ excel: exportExcel, pdf: exportPDF });
    }
  }, [setExportFunctions, exportExcel, exportPDF]);

  // Chart Data: Dividend Share (Donut)
  // Only top 8 for Donut to keep it readable, group rest as "Others"
  const sortedData = [...data].sort((a, b) => b.Amount - a.Amount);
  let donutLabels = [];
  let donutData = [];
  
  if (sortedData.length > 8) {
    const top8 = sortedData.slice(0, 8);
    const others = sortedData.slice(8);
    donutLabels = [...top8.map(r => r.FullName), 'Others'];
    donutData = [...top8.map(r => r.Amount), others.reduce((s, r) => s + parseFloat(r.Amount), 0)];
  } else {
    donutLabels = sortedData.map(r => r.FullName);
    donutData = sortedData.map(r => r.Amount);
  }

  // Chart Data: Top Recipients (Bar)
  const top10 = sortedData.slice(0, 10);
  const barLabels = top10.map(r => r.FullName);
  const barData = top10.map(r => r.Amount);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } },
      tooltip: { backgroundColor: '#0f172a', padding: 12, cornerRadius: 8 }
    }
  };

  return (
    <div className="dividend-report">
      {/* KPIs */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm p-3 text-center h-100">
            <h6 className="text-muted mb-2">Total Dividend Paid</h6>
            <h3 className="mb-0 fw-bold text-success">${parseFloat(totalDividend).toLocaleString()}</h3>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm p-3 text-center h-100">
            <h6 className="text-muted mb-2">Total Recipients</h6>
            <h3 className="mb-0 fw-bold">{recipientCount}</h3>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm p-3 text-center h-100">
            <h6 className="text-muted mb-2">Average Dividend</h6>
            <h3 className="mb-0 fw-bold">${parseFloat(avgDividend).toLocaleString()}</h3>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-5 text-center"><div className="spinner-border text-primary"></div></div>
      ) : (
        <div className="row g-4">
          <div className="col-lg-5">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <h6 className="fw-bold mb-4 text-muted text-uppercase ls-1">Dividend Share</h6>
                <div style={{ height: '300px' }}>
                  <Doughnut 
                    data={{
                      labels: donutLabels,
                      datasets: [{ data: donutData, backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b', '#cbd5e1'], borderWidth: 0 }]
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
                <h6 className="fw-bold mb-4 text-muted text-uppercase ls-1">Top Recipients</h6>
                <div style={{ height: '300px' }}>
                  <Bar 
                    data={{
                      labels: barLabels,
                      datasets: [{ label: 'Dividend Amount ($)', data: barData, backgroundColor: '#8b5cf6', borderRadius: 4 }]
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
                <h6 className="fw-bold mb-4 text-muted text-uppercase ls-1">Detailed Dividend Data</h6>
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Employee Name</th>
                        <th>Amount ($)</th>
                        <th>% Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((row, idx) => (
                        <tr key={idx}>
                          <td className="fw-medium">{row.FullName}</td>
                          <td className="text-success fw-bold">${parseFloat(row.Amount || 0).toLocaleString()}</td>
                          <td>{totalDividend > 0 ? ((row.Amount / totalDividend) * 100).toFixed(2) : 0}%</td>
                        </tr>
                      ))}
                      {data.length === 0 && <tr><td colSpan="3" className="text-center text-muted py-3">No data found</td></tr>}
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
