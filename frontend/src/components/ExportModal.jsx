import React from 'react';
import { jsPDF } from 'jspdf';
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

  const removeVietnameseTones = (str) => {
    if (!str || typeof str !== 'string') return str;
    return str
      .replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a")
      .replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e")
      .replace(/ì|í|ị|ỉ|ĩ/g, "i")
      .replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o")
      .replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u")
      .replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y")
      .replace(/đ/g, "d")
      .replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A")
      .replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E")
      .replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I")
      .replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O")
      .replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U")
      .replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y")
      .replace(/Đ/g, "D");
  };

  const getExportData = (forPDF = false) => {
    const tableColumn = columns.map(col => forPDF ? removeVietnameseTones(col.header || col) : (col.header || col));
    const tableRows = data.map(row => 
      columns.map(col => {
        const key = col.key || col;
        let val = row[key] !== undefined ? row[key] : '';
        return forPDF ? removeVietnameseTones(String(val)) : val;
      })
    );
    return { tableColumn, tableRows };
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      const { tableColumn, tableRows } = getExportData(true);
      
      // Header
      doc.setFontSize(18);
      doc.text(removeVietnameseTones(title), 14, 15);
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
    } catch (error) {
      console.error("PDF Export Error:", error);
      alert("An error occurred while generating the PDF. Please try again.");
    }
  };

  const exportToExcel = () => {
    try {
      // Map data to use headers as keys for Excel
      const { tableColumn, tableRows } = getExportData(false);
      const excelData = tableRows.map(row => {
          const newRow = {};
          tableColumn.forEach((header, index) => {
              newRow[header] = row[index];
          });
          return newRow;
      });

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
      XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
      onClose();
    } catch (error) {
      console.error("Excel Export Error:", error);
      alert("An error occurred while generating the Excel file. Please try again.");
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div 
      className="modal-overlay"
      onClick={handleBackdropClick}
    >
      <div className="modal-box animate-in" style={{ maxWidth: '500px' }}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h4 className="mb-0 fw-bold">Export Options</h4>
            <p className="text-muted small mb-0">Select format to export <b>{title}</b></p>
          </div>
          <button 
            onClick={onClose}
            className="btn-icon"
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        {/* Content */}
        <div className="modal-body p-4">
          <div className="export-grid d-flex gap-3 justify-content-center">
            {/* PDF Option */}
            <button
              onClick={exportToPDF}
              className="btn btn-outline-danger p-4 text-center d-flex flex-column align-items-center w-50 rounded-4"
            >
              <div className="fs-1 mb-2">
                <i className="bi bi-file-earmark-pdf"></i>
              </div>
              <span className="fw-bold mb-1">PDF</span>
              <span className="small text-muted">Best for printing</span>
            </button>

            {/* Excel Option */}
            <button
              onClick={exportToExcel}
              className="btn btn-outline-success p-4 text-center d-flex flex-column align-items-center w-50 rounded-4"
            >
              <div className="fs-1 mb-2">
                <i className="bi bi-file-earmark-excel"></i>
              </div>
              <span className="fw-bold mb-1">Excel</span>
              <span className="small text-muted">Best for analysis</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer bg-light-subtle rounded-bottom-4">
          <button
            onClick={onClose}
            className="btn btn-outline"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
