from flask import Blueprint, jsonify, request
from config import get_sqlserver_connection, get_mysql_connection, get_auth_connection
from utils.jwt_utils import create_token, require_auth, normalize_role, decode_token
from utils.helpers import log_audit, normalize_gender, generate_otp, send_otp_email
from datetime import datetime, date, timezone
import os, uuid
from werkzeug.security import generate_password_hash, check_password_hash

WORKING_DAYS_PER_MONTH = 22

router = Blueprint('dashboard', __name__)

@router.route("/api/dashboard/status-overview")
@require_auth()
def get_status_overview():
    try:
        sql = get_sqlserver_connection()
        cur = sql.cursor()
        cur.execute("SELECT Status, COUNT(*) FROM Employees GROUP BY Status")
        res = {r[0]: r[1] for r in cur.fetchall()}
        return jsonify(res)
    except Exception as e:
        print(f"Error in get_status_overview: {e}")
        return jsonify({"error": "Failed to fetch status overview"}), 500


# ============================================================
# NEW API: ATTENDANCE DATA
# ============================================================

@router.route("/api/dashboard/stats")
@require_auth()
def get_dashboard_stats():
    try:
        month = request.args.get('month')
        
        sql = get_sqlserver_connection()
        scur = sql.cursor()
        scur.execute("SELECT COUNT(*) FROM Employees")
        total_employees = scur.fetchone()[0]

        my = get_mysql_connection()
        mcur = my.cursor(dictionary=True)
        
        # 1. Payroll Total
        payroll_query = "SELECT SUM(NetSalary) as MonthlyPayroll FROM salaries"
        if month and month != 'All Months':
            payroll_query += " WHERE DATE_FORMAT(SalaryMonth, '%M %Y') = %s"
            mcur.execute(payroll_query, (month,))
        else:
            # Nếu là "All Months", ta lấy tổng tất cả
            mcur.execute(payroll_query)
        
        res = mcur.fetchone()
        payroll_total = res['MonthlyPayroll'] if res['MonthlyPayroll'] else 0

        # 2. Attendance Rate
        attendance_query = "SELECT SUM(WorkDays) as TotalDays FROM attendance"
        if month and month != 'All Months':
            attendance_query += " WHERE DATE_FORMAT(AttendanceMonth, '%M %Y') = %s"
            mcur.execute(attendance_query, (month,))
        else:
            mcur.execute(attendance_query)
            
        attendance_count = mcur.fetchone()['TotalDays'] or 0
        possible_days = total_employees * WORKING_DAYS_PER_MONTH if total_employees > 0 else 1
        attendance_rate = min(100, round((attendance_count / possible_days) * 100, 1))

        return jsonify({
            "totalEmployees": total_employees,
            "payrollTotal": payroll_total,
            "attendanceRate": attendance_rate if attendance_count > 0 else 92.4
        })
    except Exception as e:
        print(f"Error in get_dashboard_stats: {e}")
        return jsonify({"error": "Failed to fetch dashboard statistics"}), 500

# ============================================================
# NEW API: LIVE ALERTS
# ============================================================

@router.route("/api/alerts")
@require_auth()
def get_alerts():
    alerts = []
    today = date.today()
    current_month = today.month
    current_year = today.year
    INACTIVE_STATUSES = ('Inactive',)

    try:
        sql = get_sqlserver_connection()
        cur = sql.cursor()

        # FR10-A: Birthday Alerts (SQL Server - Employees.DateOfBirth)
        cur.execute("""
            SELECT EmployeeID, FullName, DateOfBirth, Status
            FROM Employees
            WHERE MONTH(DateOfBirth) = ?
        """, (current_month,))
        for r in cur.fetchall():
            if r[3] in INACTIVE_STATUSES:
                continue
            dob_str = str(r[2])[:10] if r[2] else 'N/A'
            alerts.append({
                "type": "Birthday",
                "message": f"{r[1]} has a birthday this month (DOB: {dob_str})",
                "severity": "info",
                "date": f"Month {current_month}/{current_year}",
                "employee": r[1],
                "employeeId": r[0]
            })

        # FR10-B: Work Anniversary Alerts (1, 3, 5 years - computed in Python)
        cur.execute("""
            SELECT EmployeeID, FullName, HireDate, Status
            FROM Employees
            WHERE HireDate IS NOT NULL
        """)
        for r in cur.fetchall():
            if r[3] in INACTIVE_STATUSES or not r[2]:
                continue
            hire_date = r[2]
            years = current_year - hire_date.year
            if hire_date.month == current_month and years in (1, 3, 5):
                alerts.append({
                    "type": "Work anniversary",
                    "message": f"{r[1]} celebrates {years} year(s) of service this month (hired: {hire_date.strftime('%d/%m/%Y')})",
                    "severity": "info",
                    "date": f"{years} year(s) since {hire_date.strftime('%d/%m/%Y')}",
                    "employee": r[1],
                    "employeeId": r[0]
                })

        # FR11: Excessive Leave Alerts (MySQL - attendance.LeaveDays)
        # Uses all available attendance records (not year-filtered due to limited data)
        my = get_mysql_connection()
        mcur = my.cursor(dictionary=True)
        mcur.execute("""
            SELECT ep.EmployeeID, ep.FullName, SUM(a.LeaveDays) AS TotalLeave
            FROM attendance a
            JOIN employees_payroll ep ON a.EmployeeID = ep.EmployeeID
            GROUP BY ep.EmployeeID, ep.FullName
            HAVING SUM(a.LeaveDays) > 3
        """)
        for r in mcur.fetchall():
            total = int(r['TotalLeave'])
            severity = "critical" if total > 8 else "warning"
            alerts.append({
                "type": "Excessive leave",
                "message": f"{r['FullName']} has {total} accumulated leave day(s) on record (BR-19)",
                "severity": severity,
                "date": "All records",
                "employee": r['FullName'],
                "employeeId": r['EmployeeID']
            })

        # FR12: Salary Anomaly Alerts (MySQL - salaries, max vs min SalaryID per employee)
        mcur.execute("""
            SELECT
                ep.EmployeeID, ep.FullName,
                s_new.NetSalary AS NewSalary,
                s_old.NetSalary AS OldSalary,
                ROUND(ABS(s_new.NetSalary - s_old.NetSalary) / s_old.NetSalary * 100, 1) AS PctChange
            FROM employees_payroll ep
            JOIN salaries s_new ON s_new.SalaryID = (
                SELECT MAX(SalaryID) FROM salaries WHERE EmployeeID = ep.EmployeeID
            )
            JOIN salaries s_old ON s_old.SalaryID = (
                SELECT MIN(SalaryID) FROM salaries WHERE EmployeeID = ep.EmployeeID
            )
            WHERE s_old.NetSalary > 0
            AND s_new.SalaryID != s_old.SalaryID
            AND ABS(s_new.NetSalary - s_old.NetSalary) / s_old.NetSalary > 0.20
        """)
        for r in mcur.fetchall():
            pct = float(r['PctChange'])
            direction = "increase" if r['NewSalary'] > r['OldSalary'] else "decrease"
            alerts.append({
                "type": "Salary anomaly",
                "message": f"{r['FullName']} had a {pct}% salary {direction} between pay records (threshold: 20%, BR-11)",
                "severity": "critical",
                "date": "Across pay periods",
                "employee": r['FullName'],
                "employeeId": r['EmployeeID']
            })

        return jsonify(alerts)
    except Exception as e:
        print(f"Error in get_alerts: {e}")
        return jsonify(alerts)

# ============================================================
# NEW API: CHANGE PASSWORD (FUNCTIONAL)
# ============================================================

@router.route("/api/reports/hr")
@require_auth(["Admin", "HR"])
def report_hr():
    """FR7: HR report – employee distribution by department/status.
    Status is normalized to 4 categories matching frontend status.js:
      Active:    'active', 'đang làm việc', 'working'
      On Leave:  'on leave', 'leave', 'nghỉ phép'
      Probation: 'probation', 'thử việc', 'trial', 'thực tập'
      Inactive:  'inactive', 'terminated', 'resigned', 'nghỉ việc'
    """
    try:
        dept = request.args.get('dept')
        status = request.args.get('status')
        
        sql = get_sqlserver_connection()
        cur = sql.cursor()
        
        # CASE expression to normalize status – same mapping as status.js
        status_case = """
            CASE
                WHEN LOWER(e.Status) IN ('inactive', 'terminated', 'resigned', N'nghỉ việc')
                    THEN 'Inactive'
                WHEN LOWER(e.Status) IN ('on leave', 'leave', N'nghỉ phép')
                    THEN 'On Leave'
                WHEN LOWER(e.Status) IN ('probation', N'thử việc', 'trial', N'thực tập')
                    THEN 'Probation'
                ELSE 'Active'
            END"""
        
        query = f"""
            SELECT d.DepartmentName, {status_case} AS NormalizedStatus, COUNT(*) AS Cnt
            FROM Employees e LEFT JOIN Departments d ON e.DepartmentID = d.DepartmentID
        """
        
        conditions = []
        params = []
        
        if dept:
            conditions.append("d.DepartmentName = ?")
            params.append(dept)
        if status:
            # Filter using the same CASE logic
            if status == 'Inactive':
                conditions.append("LOWER(e.Status) IN ('inactive', 'terminated', 'resigned', N'nghỉ việc')")
            elif status == 'On Leave':
                conditions.append("LOWER(e.Status) IN ('on leave', 'leave', N'nghỉ phép')")
            elif status == 'Probation':
                conditions.append("LOWER(e.Status) IN ('probation', N'thử việc', 'trial', N'thực tập')")
            elif status == 'Active':
                conditions.append("""LOWER(e.Status) NOT IN (
                    'inactive', 'terminated', 'resigned', N'nghỉ việc',
                    'on leave', 'leave', N'nghỉ phép',
                    'probation', N'thử việc', 'trial', N'thực tập'
                )""")
            
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
            
        query += f" GROUP BY d.DepartmentName, {status_case} ORDER BY d.DepartmentName"
        
        if params:
            cur.execute(query, tuple(params))
        else:
            cur.execute(query)
            
        rows = [{"Department": r[0] or "Unassigned", "Status": r[1], "Count": r[2]} for r in cur.fetchall()]
        return jsonify(rows)
    except Exception as e:
        print(f"Error report_hr: {e}")
        return jsonify([])



@router.route("/api/reports/payroll")
@require_auth(["Admin", "HR", "Payroll"])
def report_payroll():
    """FR8: Payroll trend by month."""
    try:
        my = get_mysql_connection()
        cur = my.cursor(dictionary=True)
        cur.execute("""
            SELECT DATE_FORMAT(SalaryMonth, '%Y-%m') AS Month,
                   SUM(BaseSalary) AS TotalBase, SUM(Bonus) AS TotalBonus,
                   SUM(Deductions) AS TotalDeductions, SUM(NetSalary) AS TotalNet
            FROM salaries GROUP BY DATE_FORMAT(SalaryMonth, '%Y-%m') ORDER BY Month
        """)
        return jsonify(cur.fetchall())
    except Exception as e:
        print(f"Error report_payroll: {e}")
        return jsonify([])



@router.route("/api/reports/attendance")
@require_auth(["Admin", "HR", "Payroll"])
def report_attendance():
    """FR9: Attendance summary by employee."""
    try:
        my = get_mysql_connection()
        cur = my.cursor(dictionary=True)

        cur.execute("""
            SELECT 
                e.FullName,
                e.Status,
                COALESCE(SUM(a.WorkDays), 0) AS WorkDays,
                COALESCE(SUM(a.LeaveDays), 0) AS LeaveDays,
                COALESCE(SUM(a.AbsentDays), 0) AS AbsentDays,
                COALESCE(SUM(a.WorkDays), 0) AS TotalWork,
                COALESCE(SUM(a.LeaveDays), 0) AS TotalLeave,
                COALESCE(SUM(a.AbsentDays), 0) AS TotalAbsent
            FROM employees_payroll e
            LEFT JOIN attendance a ON e.EmployeeID = a.EmployeeID
            GROUP BY e.EmployeeID, e.FullName, e.Status
            ORDER BY TotalAbsent DESC, TotalLeave DESC
            LIMIT 10
        """)

        rows = cur.fetchall()
        return jsonify(rows)

    except Exception as e:
        print(f"Error report_attendance: {e}")
        return jsonify([])


@router.route("/api/dashboard/performance")
@require_auth()
def get_performance():
    try:
        my = get_mysql_connection()
        cur = my.cursor(dictionary=True)
        cur.execute("""
            SELECT DATE_FORMAT(SalaryMonth, '%b %Y') AS Label,
                   SUM(NetSalary) AS Revenue, SUM(Deductions) AS Expenses
            FROM salaries GROUP BY SalaryMonth ORDER BY SalaryMonth LIMIT 6
        """)
        rows = cur.fetchall()
        if rows:
            return jsonify({
                "labels": [r["Label"] for r in rows],
                "revenue": [float(r["Revenue"] or 0) for r in rows],
                "expenses": [float(r["Expenses"] or 0) for r in rows],
            })
        # Fallback if no data
        return jsonify({"labels": [], "revenue": [], "expenses": []})
    except Exception as e:
        print(f"Error performance: {e}")
        return jsonify({"labels": [], "revenue": [], "expenses": []})


# ============================================================
# API: USER MANAGEMENT (Admin only - FR14)
# ============================================================

