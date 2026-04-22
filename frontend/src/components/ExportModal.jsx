import React from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

/**
 * Reusable Export Modal Component
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {function} onClose - function to close the modal
 * @param {string} title - Title of the report (e.g., "Payroll Report")
 * @param {Array} columns - Array of column definitions for the table
 * @param {Array} data - Array of data objects to export
 * @param {String} filename - Desired filename (without extension)
 */
const ExportModal = ({ isOpen, onClose, title, columns, data, filename = 'report' }) => {
  if (!isOpen) return null;

  const getExportData = () => {
    const tableColumn = columns.map(col => col.header || col);
    const tableRows = data.map(row => 
      columns.map(col => {
        const key = col.key || col;
        return row[key] !== undefined ? row[key] : '';
      })
    );
    return { tableColumn, tableRows };
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const { tableColumn, tableRows } = getExportData();
    
    // Header
    doc.setFontSize(18);
    doc.text(title, 14, 15);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);
    
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 25,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [67, 56, 202], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    });
    
    doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
    onClose();
  };

  const exportToExcel = () => {
    // Map data to use headers as keys for Excel
    const excelData = data.map(row => {
        const newRow = {};
        columns.forEach(col => {
            const header = col.header || col;
            const key = col.key || col;
            newRow[header] = row[key] !== undefined ? row[key] : '';
        });
        return newRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div 
      className="modal-backdrop-custom"
      onClick={handleBackdropClick}
    >
      <div className="modal-content-custom">
        {/* Header */}
        <div className="modal-header-custom">
          <div>
            <h3 className="mb-0 fw-bold">Export Options</h3>
            <p className="text-muted small mb-0">Choose format for <b>{title}</b></p>
          </div>
          <button 
            onClick={onClose}
            className="btn-close-custom"
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        {/* Content */}
        <div className="modal-body-custom">
          <div className="export-grid">
            {/* PDF Option */}
            <button
              onClick={exportToPDF}
              className="export-option-btn export-option-pdf"
            >
              <div className="export-icon-container export-icon-pdf">
                <i className="bi bi-file-earmark-pdf"></i>
              </div>
              <span className="export-label">PDF</span>
              <span className="export-desc">Best for printing</span>
            </button>

            {/* Excel Option */}
            <button
              onClick={exportToExcel}
              className="export-option-btn export-option-excel"
            >
              <div className="export-icon-container export-icon-excel">
                <i className="bi bi-file-earmark-excel"></i>
              </div>
              <span className="export-label">Excel</span>
              <span className="export-desc">Best for analysis</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer-custom">
          <button
            onClick={onClose}
            className="btn-action border-0 bg-transparent text-muted"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
