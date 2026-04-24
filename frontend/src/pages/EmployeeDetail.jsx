import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Line } from 'react-chartjs-2';
import { API_BASE, fetchAuth } from "../api";

export default function EmployeeDetail() {
  const { id } = useParams();
  const [employee, setEmployee] = useState(null);
  const [payrollHistory, setPayrollHistory] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState({ TotalWorkDays: 0, TotalLeaveDays: 0, TotalAbsentDays: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchAuth(`${API_BASE}/employees/${id}`).then(res => res.json()),
      fetchAuth(`${API_BASE}/payroll/${id}/history`).then(res => res.json()),
      fetchAuth(`${API_BASE}/attendance/${id}/summary`).then(res => res.json())
    ]).then(([emp, payroll, attendance]) => {
      if(emp && !emp.msg) setEmployee(emp);
      if(Array.isArray(payroll)) setPayrollHistory(payroll);
      if(attendance && !attendance.error) setAttendanceSummary(attendance);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="p-5 text-center"><div className="spinner-border text-primary"></div></div>;
  if (!employee) return <div className="p-5 text-center text-muted">Employee not found.</div>;

  const chartData = {
    labels: payrollHistory.map(p => p.SalaryMonth),
    datasets: [
      {
        label: 'Net Salary',
        data: payrollHistory.map(p => p.NetSalary),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Base Salary',
        data: payrollHistory.map(p => p.BaseSalary),
        borderColor: '#4f46e5',
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  const latestPayroll = payrollHistory.length > 0 ? payrollHistory[payrollHistory.length - 1] : null;

  return (
    <div className="pb-5 mx-auto animate-slide-up" style={{ maxWidth: '1000px' }}>
      <div className="d-flex justify-content-between align-items-center mb-5">
        <div className="d-flex align-items-center gap-3">
          <Link to="/employees" className="btn btn-icon bg-white border shadow-sm">
            <i className="bi bi-arrow-left"></i>
          </Link>
          <div>
            <h2 className="fw-bold text-dark mb-0 tracking-tight">Employee Detail Overview</h2>
            <p className="text-muted extra-small mb-0">Record UUID: <span className="text-primary fw-bold">#{id}</span></p>
          </div>
        </div>
        <Link to={`/employees/${id}`} className="btn btn-primary-custom px-4 shadow-sm fw-bold">
            <i className="bi bi-pencil-square me-2"></i> Edit Record
        </Link>
      </div>

      <div className="row g-4">
        {/* HR Profile Details */}
        <div className="col-12 col-md-4">
           <div className="card-custom p-4 border-0 shadow-sm h-100">
              <div className="text-center mb-4">
                  <div className="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style={{ width: '80px', height: '80px', fontSize: '2rem' }}>
                    {employee.FullName?.charAt(0)}
                  </div>
                  <h4 className="fw-bold mb-1">{employee.FullName}</h4>
                  <p className="text-muted small mb-0">{employee.Position || 'No Position'} • {employee.Department || 'No Dept'}</p>
                  <span className={`badge mt-2 ${employee.Status === 'Active' ? 'bg-success' : 'bg-secondary'}`}>{employee.Status}</span>
              </div>
              <div className="border-top pt-3">
                  <div className="d-flex justify-content-between mb-2 small"><span className="text-muted">Email:</span> <span className="fw-bold">{employee.Email || 'N/A'}</span></div>
                  <div className="d-flex justify-content-between mb-2 small"><span className="text-muted">Phone:</span> <span className="fw-bold">{employee.PhoneNumber || 'N/A'}</span></div>
                  <div className="d-flex justify-content-between mb-2 small"><span className="text-muted">DOB:</span> <span className="fw-bold">{employee.DateOfBirth ? new Date(employee.DateOfBirth).toLocaleDateString() : 'N/A'}</span></div>
                  <div className="d-flex justify-content-between mb-2 small"><span className="text-muted">Gender:</span> <span className="fw-bold">{employee.Gender || 'N/A'}</span></div>
                  <div className="d-flex justify-content-between mb-2 small"><span className="text-muted">Hire Date:</span> <span className="fw-bold">{employee.HireDate ? new Date(employee.HireDate).toLocaleDateString() : 'N/A'}</span></div>
              </div>
           </div>
        </div>

        {/* Latest Payroll & Chart */}
        <div className="col-12 col-md-8">
           <div className="card-custom p-4 border-0 shadow-sm h-100">
              <h5 className="fw-bold mb-4">Latest Financial Snapshot</h5>
              {latestPayroll ? (
                 <div className="row g-3 mb-4">
                    <div className="col-6 col-md-3">
                       <div className="p-3 bg-light rounded text-center">
                          <div className="small text-muted mb-1">Month</div>
                          <div className="fw-bold">{latestPayroll.SalaryMonth}</div>
                       </div>
                    </div>
                    <div className="col-6 col-md-3">
                       <div className="p-3 bg-light rounded text-center">
                          <div className="small text-muted mb-1">Base</div>
                          <div className="fw-bold text-primary">${latestPayroll.BaseSalary}</div>
                       </div>
                    </div>
                    <div className="col-6 col-md-3">
                       <div className="p-3 bg-light rounded text-center">
                          <div className="small text-muted mb-1">Bonus</div>
                          <div className="fw-bold text-success">+${latestPayroll.Bonus}</div>
                       </div>
                    </div>
                    <div className="col-6 col-md-3">
                       <div className="p-3 bg-light rounded text-center">
                          <div className="small text-muted mb-1">Net Pay</div>
                          <div className="fw-bold text-dark">${latestPayroll.NetSalary}</div>
                       </div>
                    </div>
                 </div>
              ) : (
                 <p className="text-muted small">No payroll records found for this employee.</p>
              )}
              
              <h5 className="fw-bold mb-3 mt-5">Attendance Summary</h5>
              <div className="row g-3 mb-4">
                 <div className="col-12 col-md-4">
                    <div className="p-3 bg-light rounded text-center border-start border-4 border-primary">
                       <div className="small text-muted mb-1">Total Work Days</div>
                       <div className="fw-bold fs-4 text-dark">{attendanceSummary.TotalWorkDays}</div>
                    </div>
                 </div>
                 <div className="col-12 col-md-4">
                    <div className="p-3 bg-light rounded text-center border-start border-4 border-warning">
                       <div className="small text-muted mb-1">Total Leave Days</div>
                       <div className="fw-bold fs-4 text-warning">{attendanceSummary.TotalLeaveDays}</div>
                    </div>
                 </div>
                 <div className="col-12 col-md-4">
                    <div className="p-3 bg-light rounded text-center border-start border-4 border-danger">
                       <div className="small text-muted mb-1">Total Absent Days</div>
                       <div className="fw-bold fs-4 text-danger">{attendanceSummary.TotalAbsentDays}</div>
                    </div>
                 </div>
              </div>

              <h5 className="fw-bold mb-3 mt-5">Compensation History</h5>
              <div style={{ height: '250px' }}>
                 {payrollHistory.length > 0 ? (
                   <Line data={chartData} options={{ maintainAspectRatio: false }} />
                 ) : (
                   <div className="h-100 d-flex align-items-center justify-content-center text-muted small">No historical data</div>
                 )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
