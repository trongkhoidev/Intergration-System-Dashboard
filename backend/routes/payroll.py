from flask import Blueprint, jsonify, request
from config import get_sqlserver_connection, get_mysql_connection, get_auth_connection
from utils.jwt_utils import create_token, require_auth, normalize_role, decode_token
from utils.helpers import log_audit, normalize_gender, generate_otp, send_otp_email
from datetime import datetime, date, timezone
import os, uuid
from werkzeug.security import generate_password_hash, check_password_hash

WORKING_DAYS_PER_MONTH = 22

router = Blueprint('payroll', __name__)

@router.route("/api/payroll")
@require_auth(["Admin", "HR", "Payroll"])
def get_payroll():
    try:
        my = get_mysql_connection()
        cur = my.cursor(dictionary=True)
        month = request.args.get('month')
        dept = request.args.get('dept')

        query = """
            SELECT s.SalaryID, DATE_FORMAT(s.SalaryMonth, '%M %Y') AS MonthYear,
                   e.FullName, dp.DepartmentName,
                   s.BaseSalary, s.Bonus, s.Deductions, s.NetSalary AS TotalSalary
            FROM salaries s
            JOIN employees_payroll e ON s.EmployeeID = e.EmployeeID
            LEFT JOIN departments_payroll dp ON e.DepartmentID = dp.DepartmentID
        """

        conditions = []
        params = []

        if month and month != 'All Months':
            conditions.append("DATE_FORMAT(s.SalaryMonth, '%M %Y') = %s")
            params.append(month)
        if dept:
            conditions.append("dp.DepartmentName = %s")
            params.append(dept)

        if conditions:
            query += " WHERE " + " AND ".join(conditions)
        query += " ORDER BY s.SalaryMonth DESC"

        cur.execute(query, params)
        return jsonify(cur.fetchall())
    except Exception as e:
        print(f"Error in get_payroll: {e}")
        return jsonify({"error": "Failed to fetch payroll data"}), 500


@router.route("/api/payroll/<int:salary_id>", methods=["PUT"])
@require_auth(["Admin", "HR", "Payroll"])
def update_payroll(salary_id):
    data = request.json
    try:
        my = get_mysql_connection()
        my.autocommit = True
        cur = my.cursor()
        base = data.get("BaseSalary", 0)
        bonus = data.get("Bonus", 0)
        deductions = data.get("Deductions", 0)
        net = float(base) + float(bonus) - float(deductions)
        
        cur.execute("""
            UPDATE salaries 
            SET BaseSalary=%s, Bonus=%s, Deductions=%s, NetSalary=%s 
            WHERE SalaryID=%s
        """, (base, bonus, deductions, net, salary_id))
        
        username = getattr(request, 'current_user', {}).get('username', 'system')
        log_audit("PAYROLL_UPDATED", username, f"Updated salary {salary_id} net to {net}")
        return jsonify({"status": "success", "msg": "Payroll updated successfully", "NetSalary": net})
    except Exception as e:
        print(f"Error in update_payroll: {e}")
        return jsonify({"status": "error", "msg": "Failed to update payroll"}), 500


@router.route("/api/payroll/<int:emp_id>/history")
@require_auth()
def get_payroll_history(emp_id):
    try:
        my = get_mysql_connection()
        cur = my.cursor(dictionary=True)
        cur.execute("""
            SELECT SalaryMonth, BaseSalary, Bonus, Deductions, NetSalary 
            FROM salaries 
            WHERE EmployeeID = %s 
            ORDER BY SalaryMonth ASC
        """, (emp_id,))
        return jsonify(cur.fetchall())
    except Exception as e:
        print(f"Error in get_payroll_history: {e}")
        return jsonify({"error": "Failed to fetch payroll history"}), 500


@router.route("/api/payroll/summary")
@require_auth(["Admin", "HR", "Payroll"])
def get_payroll_summary():
    try:
        my = get_mysql_connection()
        cur = my.cursor(dictionary=True)
        month = request.args.get('month')
        dept = request.args.get('dept')

        # Summary
        conditions = []
        params = []
        base_query = """
            SELECT SUM(s.NetSalary) as TotalPayroll, AVG(s.NetSalary) as AvgSalary
            FROM salaries s
            JOIN employees_payroll e ON s.EmployeeID = e.EmployeeID
            LEFT JOIN departments_payroll dp ON e.DepartmentID = dp.DepartmentID
        """
        if month and month != 'All Months':
            conditions.append("DATE_FORMAT(s.SalaryMonth, '%M %Y') = %s")
            params.append(month)
        if dept:
            conditions.append("dp.DepartmentName = %s")
            params.append(dept)
        if conditions:
            base_query += " WHERE " + " AND ".join(conditions)
        cur.execute(base_query, params)
        summary = cur.fetchone()

        # Breakdown by department
        breakdown_conditions = list(conditions)
        breakdown_params = list(params)
        breakdown_query = """
            SELECT dp.DepartmentID, dp.DepartmentName, SUM(s.NetSalary) as Amount
            FROM salaries s
            JOIN employees_payroll e ON s.EmployeeID = e.EmployeeID
            LEFT JOIN departments_payroll dp ON e.DepartmentID = dp.DepartmentID
        """
        if breakdown_conditions:
            breakdown_query += " WHERE " + " AND ".join(breakdown_conditions)
        breakdown_query += " GROUP BY dp.DepartmentID, dp.DepartmentName"
        cur.execute(breakdown_query, breakdown_params)

        summary['Breakdown'] = cur.fetchall()
        return jsonify(summary)
    except Exception as e:
        print(f"Error in get_payroll_summary: {e}")
        return jsonify({"error": "Failed to fetch payroll summary"}), 500


@router.route("/api/attendance")
@require_auth(["Admin", "HR", "Payroll"])
def get_attendance():
    try:
        my = get_mysql_connection()
        cur = my.cursor(dictionary=True)
        month = request.args.get('month')
        
        query = """
            SELECT e.FullName, e.Status, 
                   COALESCE(SUM(a.WorkDays), 0) as WorkDays, 
                   COALESCE(SUM(a.LeaveDays), 0) as LeaveDays, 
                   COALESCE(SUM(a.AbsentDays), 0) as AbsentDays
            FROM employees_payroll e
            LEFT JOIN attendance a ON e.EmployeeID = a.EmployeeID
        """
        
        if month and month != 'All Months':
            query += " WHERE DATE_FORMAT(a.AttendanceMonth, '%M %Y') = %s OR a.AttendanceMonth IS NULL"
            query += " GROUP BY e.EmployeeID, e.FullName, e.Status"
            cur.execute(query, (month,))
        else:
            query += " GROUP BY e.EmployeeID, e.FullName, e.Status"
            cur.execute(query)
            
        # Manually convert Decimals to float to avoid JSON serialization issues
        results = []
        for r in cur.fetchall():
            results.append({
                "FullName": r.get("FullName"),
                "Status": r.get("Status"),
                "WorkDays": float(r.get("WorkDays", 0)),
                "LeaveDays": float(r.get("LeaveDays", 0)),
                "AbsentDays": float(r.get("AbsentDays", 0))
            })
        return jsonify(results)
    except Exception as e:
        print(f"Error in get_attendance: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Failed to fetch attendance data"}), 500


@router.route("/api/attendance/<int:emp_id>/summary")
@require_auth()
def get_attendance_summary(emp_id):
    try:
        my = get_mysql_connection()
        cur = my.cursor(dictionary=True)
        cur.execute("""
            SELECT SUM(WorkDays) as TotalWorkDays, SUM(LeaveDays) as TotalLeaveDays, SUM(AbsentDays) as TotalAbsentDays 
            FROM attendance 
            WHERE EmployeeID = %s
        """, (emp_id,))
        summary = cur.fetchone()
        if not summary or summary['TotalWorkDays'] is None:
            return jsonify({"TotalWorkDays": 0, "TotalLeaveDays": 0, "TotalAbsentDays": 0})
        return jsonify(summary)
    except Exception as e:
        print(f"Error in get_attendance_summary: {e}")
        return jsonify({"error": "Failed to fetch attendance summary"}), 500

# ============================================================
# NEW API: DASHBOARD STATS
# ============================================================

@router.route("/api/dividends/summary")
@require_auth(["Admin", "HR", "Payroll"])
def get_dividends_summary():
    try:
        sql = get_sqlserver_connection()
        cur = sql.cursor()
        cur.execute("SELECT SUM(DividendAmount) FROM Dividends")
        total = cur.fetchone()[0] or 0
        return jsonify({"TotalDividends": float(total), "YieldRate": "5.2%", "LastPayout": "Mar 2024"})
    except Exception as e:
        print(f"Error in get_dividends_summary: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"TotalDividends": 0, "YieldRate": "0%", "LastPayout": "N/A"})


# ============================================================
# API: PROFILE (FR – User Profile)
# ============================================================

@router.route("/api/dividends")
@require_auth(["Admin", "HR", "Payroll"])
def get_dividends():
    try:
        sql = get_sqlserver_connection()
        cur = sql.cursor()

        cur.execute("SELECT DB_NAME()")
        db_name = cur.fetchone()[0]
        print(f"[DEBUG] Current database inside Flask: {db_name}")

        query = """
            SELECT 
                d.DividendID,
                d.EmployeeID,
                COALESCE(e.FullName, CONCAT('Employee #', d.EmployeeID)) AS FullName,
                COALESCE(d.DividendAmount, 0) AS Amount,
                d.DividendDate
            FROM Dividends d
            LEFT JOIN Employees e ON d.EmployeeID = e.EmployeeID
            ORDER BY d.DividendAmount DESC
        """
        cur.execute(query)

        rows = cur.fetchall()
        print(f"[DEBUG] /api/dividends found {len(rows)} rows")

        data = []
        for row in rows:
            data.append({
                "FullName": row[2],
                "Amount": float(row[3] or 0),
                "DividendDate": str(row[4]) if row[4] else None
            })

        print(f"[DEBUG] /api/dividends processed {len(data)} items to JSON")

        cur.close()
        sql.close()
        return jsonify(data)

    except Exception as e:
        print(f"[ERROR] get_dividends: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

        
# ============================================================
# API: AUDIT LOGS (FR15)
# ============================================================

@router.route("/api/my/payroll")
@require_auth()
def my_payroll():
    """Employee xem lịch sử lương của chính mình."""
    user_data = getattr(request, 'current_user', {})
    email = user_data.get('email', '')
    if not email:
        return jsonify([])
    try:
        # Find EmployeeID from SQL Server by email
        sql = get_sqlserver_connection()
        scur = sql.cursor()
        scur.execute("SELECT EmployeeID FROM Employees WHERE Email = ?", (email,))
        row = scur.fetchone()
        if not row:
            return jsonify([])
        emp_id = row[0]

        # Get salary records from MySQL
        my = get_mysql_connection()
        mcur = my.cursor(dictionary=True)
        mcur.execute("""
            SELECT SalaryMonth, BaseSalary, Bonus, Deductions, NetSalary
            FROM salaries WHERE EmployeeID = %s ORDER BY SalaryMonth DESC
        """, (emp_id,))
        rows = mcur.fetchall()
        for r in rows:
            if r.get('SalaryMonth'):
                r['SalaryMonth'] = str(r['SalaryMonth'])
        return jsonify(rows)
    except Exception as e:
        print(f"Error my_payroll: {e}")
        return jsonify([])



@router.route("/api/my/attendance")
@require_auth()
def my_attendance():
    """Employee xem lịch sử chấm công của chính mình."""
    user_data = getattr(request, 'current_user', {})
    email = user_data.get('email', '')
    if not email:
        return jsonify([])
    try:
        sql = get_sqlserver_connection()
        scur = sql.cursor()
        scur.execute("SELECT EmployeeID FROM Employees WHERE Email = ?", (email,))
        row = scur.fetchone()
        if not row:
            return jsonify([])
        emp_id = row[0]

        my = get_mysql_connection()
        mcur = my.cursor(dictionary=True)
        mcur.execute("""
            SELECT AttendanceMonth, WorkDays, LeaveDays, AbsentDays
            FROM attendance WHERE EmployeeID = %s ORDER BY AttendanceMonth DESC
        """, (emp_id,))
        rows = mcur.fetchall()
        for r in rows:
            if r.get('AttendanceMonth'):
                r['AttendanceMonth'] = str(r['AttendanceMonth'])
        return jsonify(rows)
    except Exception as e:
        print(f"Error my_attendance: {e}")
        return jsonify([])


# ============================================================
# API: EMPLOYEE SUMMARY (Unified HR + Payroll + Attendance)
# ============================================================

