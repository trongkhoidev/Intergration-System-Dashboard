# ============================================================
# ROUTER - Flask API cho Data Integration Dashboard
# Kết nối SQL Server (HUMAN_2025) + MySQL (PAYROLL)
# JWT Authentication + RBAC + Audit Logging
# ============================================================
from flask import Blueprint, jsonify, request
from config import get_sqlserver_connection, get_mysql_connection, get_auth_connection
from werkzeug.security import generate_password_hash, check_password_hash
from jwt_utils import create_token, require_auth, normalize_role
from datetime import datetime, timezone

router = Blueprint("router", __name__)


# Helper: log audit trail
def log_audit(action, username="system", details=""):
    try:
        auth = get_auth_connection()
        auth.autocommit = True
        cur = auth.cursor()
        cur.execute(
            "INSERT INTO AuditLogs (Username, Action, Details, Timestamp) VALUES (?, ?, ?, GETDATE())",
            (username, action, details),
        )
    except Exception as e:
        print(f"Audit log error: {e}")


# ============================================================
# AUTH API: LOGIN – Returns JWT Token (FR13)
# ============================================================
@router.route("/api/login", methods=["POST"])
def login():
    data = request.json
    username = data.get('username', '').strip()
    password = data.get('password', '')

    if not username or not password:
        return jsonify({"status": "error", "msg": "Incomplete data"}), 400

    try:
        auth = get_auth_connection()
        auth.autocommit = True
        cur = auth.cursor()
        cur.execute(
            "SELECT UserID, Username, Email, PasswordHash, Role, FailedAttempts, LockedUntil FROM SystemUsers WHERE Username = ? OR Email = ?",
            (username, username),
        )
        row = cur.fetchone()

        if not row:
            return jsonify({"status": "error", "msg": "Invalid credentials"}), 401

        user_id, db_username, email, pw_hash, role, failed, locked_until = row

        # BR-21: Check account lock
        if locked_until and locked_until > datetime.now():
            return jsonify({"status": "error", "msg": "Account locked. Try again later."}), 423

        if check_password_hash(pw_hash, password):
            # Reset failed attempts on success
            cur.execute("UPDATE SystemUsers SET FailedAttempts = 0, LockedUntil = NULL WHERE UserID = ?", (user_id,))
            normalized_role = normalize_role(role)
            token = create_token(user_id, db_username, email or "", normalized_role)
            log_audit("LOGIN_SUCCESS", db_username, "User logged in")
            return jsonify({
                "status": "success",
                "token": token,
                "user": {"user_id": user_id, "username": db_username, "email": email or "", "role": normalized_role},
            })
        else:
            # Increment failed attempts
            new_failed = (failed or 0) + 1
            lock_sql = ""
            if new_failed >= 3:
                lock_sql = ", LockedUntil = DATEADD(MINUTE, 15, GETDATE())"
            cur.execute(f"UPDATE SystemUsers SET FailedAttempts = ?{lock_sql} WHERE UserID = ?", (new_failed, user_id))
            log_audit("LOGIN_FAILED", db_username, f"Attempt {new_failed}")
            msg = "Invalid credentials"
            if new_failed >= 3:
                msg = "Account locked for 15 minutes after 3 failed attempts"
            return jsonify({"status": "error", "msg": msg}), 401

    except Exception as e:
        print(f"Error in login: {e}")
        return jsonify({"status": "error", "msg": "Authentication server error"}), 500

# ============================================================
# NEW API: PAYROLL DATA
# ============================================================
@router.route("/api/payroll")
@require_auth(["Admin", "HR", "Payroll"])
def get_payroll():
    try:
        my = get_mysql_connection()
        cur = my.cursor(dictionary=True)
        month = request.args.get('month')
        
        query = """
            SELECT DATE_FORMAT(s.SalaryMonth, '%M %Y') AS MonthYear, e.FullName, s.BaseSalary, s.Bonus, s.Deductions, s.NetSalary AS TotalSalary
            FROM salaries s
            JOIN employees_payroll e ON s.EmployeeID = e.EmployeeID
        """
        
        if month and month != 'All Months':
            query += " WHERE DATE_FORMAT(s.SalaryMonth, '%M %Y') = %s"
            query += " ORDER BY s.SalaryMonth DESC"
            cur.execute(query, (month,))
        else:
            query += " ORDER BY s.SalaryMonth DESC"
            cur.execute(query)
            
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
        
        # Summary
        base_query = "SELECT SUM(NetSalary) as TotalPayroll, AVG(NetSalary) as AvgSalary FROM salaries"
        if month and month != 'All Months':
            cur.execute(base_query + " WHERE DATE_FORMAT(SalaryMonth, '%M %Y') = %s", (month,))
        else:
            cur.execute(base_query)
        summary = cur.fetchone()
        
        # Breakdown by department
        breakdown_query = """
            SELECT DepartmentID, SUM(NetSalary) as Amount 
            FROM salaries s JOIN employees_payroll e ON s.EmployeeID = e.EmployeeID 
        """
        if month and month != 'All Months':
            breakdown_query += " WHERE DATE_FORMAT(s.SalaryMonth, '%M %Y') = %s"
            breakdown_query += " GROUP BY DepartmentID"
            cur.execute(breakdown_query, (month,))
        else:
            breakdown_query += " GROUP BY DepartmentID"
            cur.execute(breakdown_query)
            
        summary['Breakdown'] = cur.fetchall()
        return jsonify(summary)
    except Exception as e:
        print(f"Error in get_payroll_summary: {e}")
        return jsonify({"error": "Failed to fetch payroll summary"}), 500

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
@router.route("/api/attendance")
@require_auth(["Admin", "HR", "Payroll"])
def get_attendance():
    try:
        my = get_mysql_connection()
        cur = my.cursor(dictionary=True)
        month = request.args.get('month')
        
        query = """
            SELECT e.FullName, e.Status, SUM(a.WorkDays) as WorkDays, SUM(a.LeaveDays) as LeaveDays, SUM(a.AbsentDays) as AbsentDays
            FROM attendance a
            JOIN employees_payroll e ON a.EmployeeID = e.EmployeeID
        """
        
        if month and month != 'All Months':
            query += " WHERE DATE_FORMAT(a.AttendanceMonth, '%M %Y') = %s"
            query += " GROUP BY e.EmployeeID, e.FullName, e.Status"
            cur.execute(query, (month,))
        else:
            query += " GROUP BY e.EmployeeID, e.FullName, e.Status"
            cur.execute(query)
            
        return jsonify(cur.fetchall())
    except Exception as e:
        print(f"Error in get_attendance: {e}")
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
        possible_days = total_employees * 22 if total_employees > 0 else 1
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
    try:
        sql = get_sqlserver_connection()
        cur = sql.cursor()

        # Try to get manual alerts if the table exists
        try:
            cur.execute("SELECT AlertType, Message, Severity, CreatedAt FROM Alerts ORDER BY CreatedAt DESC")
            for r in cur.fetchall():
                alerts.append({"type": r[0], "message": r[1], "severity": r[2], "date": str(r[3]), "employee": "Manual Alert"})
        except Exception:
            pass

        # 1. Birthday Alerts
        cur.execute("SELECT EmployeeID, FullName FROM Employees WHERE MONTH(DateOfBirth) = MONTH(GETDATE()) AND Status = 'Active'")
        for r in cur.fetchall():
            alerts.append({"type": "Birthday", "message": f"It's {r[1]}'s birthday month!", "severity": "info", "date": "This month", "employee": r[1], "employeeId": r[0]})

        # 2. Work Anniversary Alerts – FR10: 1, 3, 5 year milestones (BR-09: 12,36,60 months)
        cur.execute("""
            SELECT EmployeeID, FullName, HireDate, DATEDIFF(MONTH, HireDate, GETDATE()) AS Months
            FROM Employees WHERE Status = 'Active'
            AND DATEDIFF(MONTH, HireDate, GETDATE()) IN (12, 36, 60)
        """)
        for r in cur.fetchall():
            years = r[3] // 12
            alerts.append({"type": "Work anniversary", "message": f"{r[1]} celebrates {years} year(s) of service", "severity": "info", "date": str(r[2]), "employee": r[1], "employeeId": r[0]})

        # 3. Excessive Leave – FR11: >12 days/year (BR-19)
        my = get_mysql_connection()
        mcur = my.cursor(dictionary=True)
        mcur.execute("""
            SELECT e.EmployeeID, e.FullName, SUM(a.LeaveDays) AS TotalLeave
            FROM attendance a JOIN employees_payroll e ON a.EmployeeID = e.EmployeeID
            WHERE e.Status = 'Đang làm việc' OR e.Status = 'Active'
            GROUP BY e.EmployeeID, e.FullName HAVING SUM(a.LeaveDays) > 12
        """)
        for r in mcur.fetchall():
            alerts.append({"type": "Excessive leave", "message": f"{r['FullName']} exceeded {r['TotalLeave']} annual leave days (limit: 12)", "severity": "warning", "date": "Current year", "employee": r['FullName'], "employeeId": r['EmployeeID']})

        # 4. Salary Anomaly – FR12: >20% change between periods (BR-11)
        mcur.execute("""
            SELECT e.EmployeeID, e.FullName, s1.NetSalary AS Current, s2.NetSalary AS Previous,
                   ROUND(ABS(s1.NetSalary - s2.NetSalary) / s2.NetSalary * 100, 1) AS PctChange
            FROM salaries s1
            JOIN salaries s2 ON s1.EmployeeID = s2.EmployeeID AND s1.SalaryID > s2.SalaryID
            JOIN employees_payroll e ON s1.EmployeeID = e.EmployeeID
            WHERE ABS(s1.NetSalary - s2.NetSalary) / s2.NetSalary > 0.20
            AND s2.NetSalary > 0
            ORDER BY s1.SalaryID DESC LIMIT 10
        """)
        for r in mcur.fetchall():
            alerts.append({"type": "Salary anomaly", "message": f"Unusual salary change for {r['FullName']}: {r['PctChange']}% difference", "severity": "critical", "date": "Recent", "employee": r['FullName'], "employeeId": r['EmployeeID']})

        return jsonify(alerts)
    except Exception as e:
        print(f"Error in get_alerts: {e}")
        return jsonify(alerts)

@router.route("/api/alerts", methods=["POST"])
@require_auth(["Admin", "HR"])
def create_alert():
    data = request.json
    try:
        sql = get_sqlserver_connection()
        sql.autocommit = True
        cur = sql.cursor()
        
        # Create table if not exists
        try:
            cur.execute("""
                IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Alerts')
                CREATE TABLE Alerts (
                    AlertID INT PRIMARY KEY IDENTITY(1,1),
                    AlertType NVARCHAR(50),
                    Message NVARCHAR(255),
                    Severity NVARCHAR(20),
                    CreatedAt DATETIME DEFAULT GETDATE()
                )
            """)
        except Exception:
            pass

        cur.execute("INSERT INTO Alerts (AlertType, Message, Severity) VALUES (?, ?, ?)", 
                   (data.get("type", "Manual"), data.get("message"), data.get("severity", "info")))
        
        username = getattr(request, 'current_user', {}).get('username', 'system')
        log_audit("ALERT_CREATED", username, f"Created manual alert: {data.get('message')}")
        
        return jsonify({"status": "success"})
    except Exception as e:
        print(f"Error creating alert: {e}")
        return jsonify({"status": "error", "msg": str(e)}), 500

# ============================================================
# NEW API: CHANGE PASSWORD (FUNCTIONAL)
# ============================================================
@router.route("/api/password", methods=["PUT"])
@require_auth()
def change_password():
    data = request.json
    username = data.get('username')
    new_password = data.get('new_password')
    
    if not username or not new_password:
        return jsonify({"status": "error", "msg": "Incomplete data"}), 400

    try:
        auth = get_auth_connection()
        auth.autocommit = True
        cur = auth.cursor()
        hashed_password = generate_password_hash(new_password)
        cur.execute("UPDATE SystemUsers SET PasswordHash = ? WHERE Username = ?", (hashed_password, username))
        return jsonify({"status": "success", "msg": "Password updated successfully"})
    except Exception as e:
        print(f"Error in change_password: {e}")
        return jsonify({"status": "error", "msg": "Failed to update password"}), 500

# ============================================================
# API: FORGOT PASSWORD (FR)
# ============================================================
import uuid

@router.route("/api/forgot-password", methods=["POST"])
def forgot_password():
    data = request.json
    email = data.get('email', '').strip()
    if not email:
        return jsonify({"status": "error", "msg": "Email is required"}), 400

    try:
        auth = get_auth_connection()
        auth.autocommit = True
        cur = auth.cursor()

        # Add Reset columns if not exists
        try:
            cur.execute("ALTER TABLE SystemUsers ADD ResetToken NVARCHAR(255) NULL")
            cur.execute("ALTER TABLE SystemUsers ADD ResetTokenExpiry DATETIME NULL")
        except Exception:
            pass

        cur.execute("SELECT UserID, Username FROM SystemUsers WHERE Email = ?", (email,))
        row = cur.fetchone()
        if not row:
            # Return success to prevent email enumeration
            return jsonify({"status": "success", "msg": "If the email exists, a reset link will be sent."})

        user_id, username = row
        token = str(uuid.uuid4())
        
        cur.execute("UPDATE SystemUsers SET ResetToken = ?, ResetTokenExpiry = DATEADD(MINUTE, 30, GETDATE()) WHERE UserID = ?", (token, user_id))
        
        # In a real app, send email here. We simulate it via console log.
        reset_link = f"http://localhost:3000/reset-password?token={token}"
        print(f"[EMAIL MOCK] Password reset link for {email}: {reset_link}")
        log_audit("PASSWORD_RESET_REQUESTED", username, "User requested password reset")

        return jsonify({"status": "success", "msg": f"Development Mode: <a href='/reset-password?token={token}' class='fw-bold text-decoration-underline'>Click Here</a> to reset your password. (Normally sent via email)"})
    except Exception as e:
        print(f"Error in forgot_password: {e}")
        return jsonify({"status": "error", "msg": "Failed to process request"}), 500


@router.route("/api/reset-password", methods=["POST"])
def reset_password():
    data = request.json
    token = data.get('token')
    new_password = data.get('new_password')

    if not token or not new_password:
        return jsonify({"status": "error", "msg": "Missing token or new password"}), 400

    try:
        auth = get_auth_connection()
        auth.autocommit = True
        cur = auth.cursor()
        
        cur.execute("SELECT UserID, Username FROM SystemUsers WHERE ResetToken = ? AND ResetTokenExpiry > GETDATE()", (token,))
        row = cur.fetchone()
        
        if not row:
            return jsonify({"status": "error", "msg": "Invalid or expired reset token"}), 400
            
        user_id, username = row
        hashed = generate_password_hash(new_password)
        
        cur.execute("UPDATE SystemUsers SET PasswordHash = ?, ResetToken = NULL, ResetTokenExpiry = NULL, FailedAttempts = 0, LockedUntil = NULL WHERE UserID = ?", (hashed, user_id))
        log_audit("PASSWORD_RESET_SUCCESS", username, "User reset password successfully")
        
        return jsonify({"status": "success", "msg": "Password updated successfully"})
    except Exception as e:
        print(f"Error in reset_password: {e}")
        return jsonify({"status": "error", "msg": "Failed to reset password"}), 500


# ============================================================
# API: DANH SÁCH PHÒNG BAN (DEPARTMENTS)
# ============================================================
@router.route("/api/departments")
@require_auth()
def get_departments():
    try:
        sql = get_sqlserver_connection()
        cur = sql.cursor()
        cur.execute("""
            SELECT DepartmentID, DepartmentName
            FROM Departments
            ORDER BY DepartmentName
        """)
        rows = [
            {"DepartmentID": r[0], "DepartmentName": r[1]}
            for r in cur.fetchall()
        ]
        return jsonify(rows)
    except Exception as e:
        print(f"Error in get_departments: {e}")
        return jsonify({"error": "Failed to fetch departments"}), 500

# ============================================================
# API: LẤY DANH SÁCH CHỨC VỤ (POSITIONS)
# ============================================================
@router.route("/api/positions")
@require_auth()
def get_positions():
    try:
        sql = get_sqlserver_connection()
        cur = sql.cursor()
        cur.execute("""
            SELECT PositionID, PositionName
            FROM Positions
            ORDER BY PositionName
        """)
        rows = [
            {"PositionID": r[0], "PositionName": r[1]}
            for r in cur.fetchall()
        ]
        return jsonify(rows)
    except Exception as e:
        print(f"Error in get_positions: {e}")
        return jsonify({"error": "Failed to fetch positions"}), 500

# ============================================================
# API: LẤY DANH SÁCH NHÂN VIÊN (GET EMPLOYEES)
# ============================================================
@router.route("/api/employees")
@require_auth(["Admin", "HR", "Payroll"])
def get_employees():
    try:
        sql = get_sqlserver_connection()
        cur = sql.cursor()
        cur.execute("""
            SELECT e.EmployeeID, e.FullName, e.DateOfBirth, e.Gender, e.PhoneNumber, e.Email, e.HireDate, 
                   e.DepartmentID, d.DepartmentName, e.PositionID, p.PositionName, e.Status
            FROM Employees e
            LEFT JOIN Departments d ON e.DepartmentID = d.DepartmentID
            LEFT JOIN Positions p ON e.PositionID = p.PositionID
            ORDER BY e.EmployeeID DESC
        """)
        
        rows = []
        for r in cur.fetchall():
            rows.append({
                "EmployeeID": r[0],
                "FullName": r[1],
                "DateOfBirth": str(r[2]) if r[2] else None,
                "Gender": r[3],
                "PhoneNumber": r[4],
                "Email": r[5],
                "HireDate": str(r[6]) if r[6] else None,
                "DepartmentID": r[7],
                "Department": r[8] if r[8] else None,
                "PositionID": r[9],
                "Position": r[10] if r[10] else None,
                "Status": r[11] if r[11] else "Active"
            })
        return jsonify(rows)
    except Exception as e:
        print(f"Error in get_employees: {e}")
        return jsonify({"error": "Failed to fetch employees"}), 500

# ============================================================
# API: LẤY CHI TIẾT NHÂN VIÊN THEO ID
# ============================================================
@router.route("/api/employees/<int:emp_id>")
@require_auth(["Admin", "HR", "Payroll"])
def get_employee_detail(emp_id):
    try:
        sql = get_sqlserver_connection()
        cur = sql.cursor()
        cur.execute("""
            SELECT
                e.EmployeeID, e.FullName, e.Email, e.DateOfBirth, e.Gender,
                e.PhoneNumber, e.HireDate, e.Status,
                d.DepartmentID, d.DepartmentName,
                p.PositionID, p.PositionName
            FROM Employees e
            LEFT JOIN Departments d ON e.DepartmentID = d.DepartmentID
            LEFT JOIN Positions p ON e.PositionID = p.PositionID
            WHERE e.EmployeeID = ?
        """, (emp_id,))
        r = cur.fetchone()
        if not r:
            return jsonify({"msg": "Employee not found"}), 404
        return jsonify({
            "EmployeeID": r[0], "FullName": r[1], "Email": r[2],
            "DateOfBirth": str(r[3]) if r[3] else None,
            "Gender": r[4], "PhoneNumber": r[5],
            "HireDate": str(r[6]) if r[6] else None,
            "Status": r[7],
            "DepartmentID": r[8], "DepartmentName": r[9],
            "PositionID": r[10], "PositionName": r[11]
        })
    except Exception as e:
        print(f"Error in get_employee_detail: {e}")
        return jsonify({"error": "Failed to fetch employee details"}), 500

# ============================================================
# API: THÊM NHÂN VIÊN MỚI (POST)
# ============================================================
@router.route("/api/employees", methods=["POST"])
@require_auth(["Admin", "HR"])
def add_employee():
    data = request.get_json()
    if not data:
        return jsonify({"status": "error", "msg": "Invalid JSON"}), 400

    full_name = data.get("FullName")
    dob = data.get("DateOfBirth")
    gender = data.get("Gender")
    phone = data.get("PhoneNumber")
    email = data.get("Email")
    hire_date = data.get("HireDate")
    dept_id = data.get("DepartmentID") or None
    pos_id = data.get("PositionID") or None
    status = data.get("Status") or "Active"

    sql = None
    my = None
    try:
        sql = get_sqlserver_connection()
        cur = sql.cursor()
        cur.execute("SELECT COUNT(*) FROM Employees WHERE Email = ?", (email,))
        if cur.fetchone()[0] > 0:
            return jsonify({"status": "error", "msg": "Email đã tồn tại"}), 400

        my = get_mysql_connection()
        sql.autocommit = False
        my.start_transaction()

        cur.execute("""
            INSERT INTO Employees
            (FullName, DateOfBirth, Gender, PhoneNumber, Email,
             HireDate, DepartmentID, PositionID, Status)
            OUTPUT INSERTED.EmployeeID
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (full_name, dob, gender, phone, email, hire_date, dept_id, pos_id, status))

        row = cur.fetchone()
        new_id = int(row[0])

        my_cur = my.cursor()
        my_cur.execute("""
            INSERT INTO employees_payroll
            (EmployeeID, FullName, DepartmentID, PositionID, Status)
            VALUES (%s, %s, %s, %s, %s)
        """, (new_id, full_name, dept_id, pos_id, status))

        sql.commit()
        my.commit()

        return jsonify({
            "status": "success",
            "msg": f"Thêm nhân viên thành công (ID = {new_id})"
        })
    except Exception as e:
        if sql: sql.rollback()
        if my: my.rollback()
        print(f"Error in add_employee: {e}")
        return jsonify({"status": "error", "msg": "Failed to add employee"}), 500

# ============================================================
# API: CẬP NHẬT NHÂN VIÊN (PUT)
# ============================================================
@router.route("/api/employees/<int:emp_id>", methods=["PUT"])
@require_auth(["Admin", "HR"])
def update_employee(emp_id):
    data = request.get_json()
    if not data:
        return jsonify({"status": "error", "msg": "Invalid JSON"}), 400

    full_name = data.get("FullName")
    dob = data.get("DateOfBirth")
    gender = data.get("Gender")
    phone = data.get("PhoneNumber")
    email = data.get("Email")
    hire_date = data.get("HireDate")
    dept_id = data.get("DepartmentID")
    pos_id = data.get("PositionID")
    status = data.get("Status")

    sql = None
    my = None
    try:
        sql = get_sqlserver_connection()
        my = get_mysql_connection()
        sql.autocommit = False
        my.start_transaction()

        cur = sql.cursor()
        cur.execute("""
            UPDATE Employees
            SET FullName=?, DateOfBirth=?, Gender=?, PhoneNumber=?,
                Email=?, HireDate=?, DepartmentID=?, PositionID=?, Status=?
            WHERE EmployeeID=?
        """, (full_name, dob, gender, phone, email, hire_date, dept_id, pos_id, status, emp_id))

        my_cur = my.cursor()
        my_cur.execute("""
            UPDATE employees_payroll
            SET FullName=%s, DepartmentID=%s, PositionID=%s, Status=%s
            WHERE EmployeeID=%s
        """, (full_name, dept_id, pos_id, status, emp_id))

        sql.commit()
        my.commit()

        return jsonify({"status": "success", "msg": "Update thành công"})
    except Exception as e:
        if sql: sql.rollback()
        if my: my.rollback()
        print(f"Error in update_employee: {e}")
        return jsonify({"status": "error", "msg": "Failed to update employee"}), 500

# ============================================================
# API: XÓA NHÂN VIÊN (DELETE)
# ============================================================
@router.route("/api/employees/<int:emp_id>", methods=["DELETE"])
@require_auth(["Admin", "HR"])
def delete_employee(emp_id):
    sql = None
    my = None
    try:
        # BR-05: Soft delete only – set Status to 'Inactive'
        sql = get_sqlserver_connection()
        my = get_mysql_connection()
        sql.autocommit = False
        my.start_transaction()

        # Validation: check if Dividends exist
        cur = sql.cursor()
        cur.execute("SELECT COUNT(*) FROM Dividends WHERE EmployeeID = ?", (emp_id,))
        if cur.fetchone()[0] > 0:
            return jsonify({"status": "error", "msg": "Cannot delete: Employee has dividend records"}), 409

        # Validation: check if Salaries exist
        my_cur = my.cursor()
        my_cur.execute("SELECT COUNT(*) FROM salaries WHERE EmployeeID = %s", (emp_id,))
        if my_cur.fetchone()[0] > 0:
            return jsonify({"status": "error", "msg": "Cannot delete: Employee has salary records"}), 409

        # BR-05: Soft delete only – set Status to 'Inactive'
        cur.execute("UPDATE Employees SET Status = 'Inactive' WHERE EmployeeID=?", (emp_id,))

        my_cur = my.cursor()
        my_cur.execute("UPDATE employees_payroll SET Status='Inactive' WHERE EmployeeID=%s", (emp_id,))

        sql.commit()
        my.commit()

        username = getattr(request, 'current_user', {}).get('username', 'system')
        log_audit("EMPLOYEE_DEACTIVATED", username, f"Employee {emp_id} set to Inactive")

        return jsonify({"status": "success", "msg": "Employee deactivated successfully"})
    except Exception as e:
        if sql: sql.rollback()
        if my: my.rollback()
        print(f"Error in delete_employee: {e}")
        return jsonify({"status": "error", "msg": "Failed to delete employee"}), 500

# ============================================================
# NEW API: DIVIDENDS DATA
# ============================================================
@router.route("/api/dividends")
@require_auth(["Admin", "HR", "Payroll"])
def get_dividends():
    try:
        sql = get_sqlserver_connection()
        cur = sql.cursor()
        cur.execute("""
            SELECT e.FullName, d.Amount
            FROM Dividends d
            JOIN Employees e ON d.EmployeeID = e.EmployeeID
        """)
        rows = [
            {"FullName": r[0], "Amount": float(r[1])}
            for r in cur.fetchall()
        ]
        return jsonify(rows)
    except Exception as e:
        print(f"Error in get_dividends: {e}")
        return jsonify([])

@router.route("/api/dividends/summary")
@require_auth(["Admin", "HR", "Payroll"])
def get_dividends_summary():
    try:
        sql = get_sqlserver_connection()
        cur = sql.cursor()
        cur.execute("SELECT SUM(Amount) FROM Dividends")
        total = cur.fetchone()[0] or 0
        return jsonify({"TotalDividends": float(total), "YieldRate": "5.2%", "LastPayout": "Mar 2024"})
    except Exception as e:
        print(f"Error in get_dividends_summary: {e}")
        return jsonify({"TotalDividends": 0, "YieldRate": "0%", "LastPayout": "N/A"})


# ============================================================
# API: PROFILE (FR – User Profile)
# ============================================================
@router.route("/api/profile", methods=["GET", "PUT"])
@require_auth()
def profile_handler():
    auth_header = request.headers.get("Authorization", "")
    from jwt_utils import decode_token
    token = auth_header.split(" ", 1)[1] if auth_header.startswith("Bearer ") else ""
    payload = decode_token(token) if token else None
    
    if not payload:
        return jsonify({"msg": "Unauthorized"}), 401
        
    username = payload.get("username")
    email = payload.get("email")

    if request.method == "GET":
        try:
            auth = get_auth_connection()
            cur = auth.cursor()
            cur.execute("SELECT UserID, Username, Email, Role FROM SystemUsers WHERE Username = ?", (username,))
            row = cur.fetchone()
            if not row:
                return jsonify({"msg": "User not found"}), 404

            user_info = {"UserID": row[0], "Username": row[1], "Email": row[2] or "", "Role": row[3]}

            # Try to find matching employee by email
            if user_info["Email"]:
                sql = get_sqlserver_connection()
                ecur = sql.cursor()
                ecur.execute("""
                    SELECT e.FullName, e.Email, e.PhoneNumber, e.DateOfBirth, e.Gender, e.HireDate, e.Status,
                           d.DepartmentName, p.PositionName
                    FROM Employees e
                    LEFT JOIN Departments d ON e.DepartmentID = d.DepartmentID
                    LEFT JOIN Positions p ON e.PositionID = p.PositionID
                    WHERE e.Email = ?
                """, (user_info["Email"],))
                emp = ecur.fetchone()
                if emp:
                    user_info.update({
                        "FullName": emp[0], "PhoneNumber": emp[2],
                        "DateOfBirth": str(emp[3]) if emp[3] else None,
                        "Gender": emp[4], "HireDate": str(emp[5]) if emp[5] else None,
                        "Status": emp[6], "Department": emp[7], "Position": emp[8]
                    })
            return jsonify(user_info)
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    elif request.method == "PUT":
        data = request.json
        full_name = data.get("FullName")
        phone = data.get("PhoneNumber")
        
        try:
            # 1. Update SQL Server Employees table if email matches
            if email:
                sql = get_sqlserver_connection()
                sql.autocommit = True
                cur = sql.cursor()
                cur.execute("UPDATE Employees SET FullName = ?, PhoneNumber = ? WHERE Email = ?", 
                           (full_name, phone, email))
                
                # 2. Update MySQL employees_payroll table
                my = get_mysql_connection()
                my.autocommit = True
                mcur = my.cursor()
                mcur.execute("UPDATE employees_payroll SET FullName = %s WHERE EmployeeID = (SELECT EmployeeID FROM (SELECT EmployeeID FROM employees_payroll WHERE Email = %s OR FullName = %s LIMIT 1) as t)", 
                            (full_name, email, full_name))
            
            log_audit("PROFILE_UPDATED", username, f"Updated FullName to {full_name}")
            return jsonify({"status": "success", "msg": "Profile updated successfully"})
        except Exception as e:
            print(f"Error updating profile: {e}")
            return jsonify({"status": "error", "msg": str(e)}), 500


# ============================================================
# API: REPORTS (FR7, FR8, FR9)
# ============================================================
@router.route("/api/reports/hr")
@require_auth(["Admin", "HR"])
def report_hr():
    """FR7: HR report – employee distribution by department/status."""
    try:
        sql = get_sqlserver_connection()
        cur = sql.cursor()
        cur.execute("""
            SELECT d.DepartmentName, e.Status, COUNT(*) AS Cnt
            FROM Employees e LEFT JOIN Departments d ON e.DepartmentID = d.DepartmentID
            GROUP BY d.DepartmentName, e.Status ORDER BY d.DepartmentName
        """)
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
            SELECT e.FullName, SUM(a.LeaveDays) as TotalLeave, SUM(a.AbsentDays) as TotalAbsent
            FROM attendance a
            JOIN employees_payroll e ON a.EmployeeID = e.EmployeeID
            GROUP BY e.FullName
            ORDER BY TotalAbsent DESC, TotalLeave DESC
            LIMIT 10
        """)
        return jsonify(cur.fetchall())
    except Exception as e:
        print(f"Error report_attendance: {e}")
        return jsonify([])

@router.route("/api/reports/dividends")
@require_auth(["Admin", "HR", "Payroll"])
def report_dividends():
    try:
        sql = get_sqlserver_connection()
        cur = sql.cursor()
        try:
            cur.execute("SELECT e.FullName, d.Amount FROM Dividends d JOIN Employees e ON d.EmployeeID = e.EmployeeID")
            data = [{"FullName": row[0], "Amount": row[1]} for row in cur.fetchall()]
            return jsonify(data)
        except Exception:
            return jsonify([])
    except Exception as e:
        print(f"Error report_dividends: {e}")
        return jsonify([])


# ============================================================
# API: AUDIT LOGS (FR15)
# ============================================================
@router.route("/api/audit-logs")
@require_auth(["Admin"])
def get_audit_logs():
    try:
        auth = get_auth_connection()
        cur = auth.cursor()
        cur.execute("SELECT TOP 100 LogID, Username, Action, Details, Timestamp FROM AuditLogs ORDER BY Timestamp DESC")
        rows = [{"LogID": r[0], "Username": r[1], "Action": r[2], "Details": r[3], "Timestamp": str(r[4])} for r in cur.fetchall()]
        return jsonify(rows)
    except Exception as e:
        print(f"Error audit logs: {e}")
        return jsonify([])


# ============================================================
# API: PERFORMANCE (Real data from salaries - replaces mock)
# ============================================================
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
@router.route("/api/users")
@require_auth(["Admin"])
def get_users():
    try:
        auth = get_auth_connection()
        cur = auth.cursor()
        cur.execute("SELECT UserID, Username, Email, Role FROM SystemUsers ORDER BY UserID")
        rows = [{"UserID": r[0], "Username": r[1], "Email": r[2], "Role": r[3]} for r in cur.fetchall()]
        return jsonify(rows)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@router.route("/api/users", methods=["POST"])
@require_auth(["Admin"])
def add_user():
    data = request.json
    username = data.get("username")
    email = data.get("email", "")
    password = data.get("password", "123456")
    role = data.get("role", "Employee")
    try:
        auth = get_auth_connection()
        auth.autocommit = True
        cur = auth.cursor()
        hashed = generate_password_hash(password)
        cur.execute("INSERT INTO SystemUsers (Username, Email, PasswordHash, Role) VALUES (?, ?, ?, ?)",
                     (username, email, hashed, role))
        log_audit("USER_CREATED", "admin", f"Created user {username} with role {role}")
        return jsonify({"status": "success", "msg": f"User {username} created"})
    except Exception as e:
        return jsonify({"status": "error", "msg": str(e)}), 500


@router.route("/api/users/<int:uid>", methods=["PUT"])
@require_auth(["Admin"])
def update_user(uid):
    data = request.json
    try:
        auth = get_auth_connection()
        auth.autocommit = True
        cur = auth.cursor()
        cur.execute("UPDATE SystemUsers SET Username=?, Email=?, Role=? WHERE UserID=?",
                     (data.get("username"), data.get("email"), data.get("role"), uid))
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "msg": str(e)}), 500



@router.route("/api/users/<int:uid>", methods=["DELETE"])
@require_auth(["Admin"])
def delete_user(uid):
    try:
        auth = get_auth_connection()
        auth.autocommit = True
        cur = auth.cursor()
        cur.execute("DELETE FROM SystemUsers WHERE UserID=?", (uid,))
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "msg": str(e)}), 500


# ============================================================
# API: AUTH LOGOUT (Ghi log Audit)
# ============================================================
@router.route("/api/auth/logout", methods=["POST"])
@require_auth()
def auth_logout():
    user_data = getattr(request, 'current_user', {})
    username = user_data.get('username', 'unknown')
    log_audit("LOGOUT", username, f"User logged out")
    return jsonify({"status": "success", "msg": "Logged out"})


# ============================================================
# API: EMPLOYEE SELF-SERVICE (Employee role – own data only)
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
@router.route("/api/employees/<int:emp_id>/summary")
@require_auth(["Admin", "HR", "Payroll"])
def get_employee_summary(emp_id):
    """Lấy dữ liệu tổng hợp 1 nhân viên từ cả 3 nguồn."""
    try:
        sql = get_sqlserver_connection()
        cur = sql.cursor()
        cur.execute("""
            SELECT e.FullName, e.Email, e.PhoneNumber, e.Status,
                   d.DepartmentName, p.PositionName, e.HireDate
            FROM Employees e
            LEFT JOIN Departments d ON e.DepartmentID = d.DepartmentID
            LEFT JOIN Positions p ON e.PositionID = p.PositionID
            WHERE e.EmployeeID = ?
        """, (emp_id,))
        row = cur.fetchone()
        if not row:
            return jsonify({"error": "Not found"}), 404
        hr = {
            "FullName": row[0], "Email": row[1], "PhoneNumber": row[2],
            "Status": row[3], "Department": row[4], "Position": row[5],
            "HireDate": str(row[6]) if row[6] else None
        }

        my = get_mysql_connection()
        mcur = my.cursor(dictionary=True)

        mcur.execute("""
            SELECT SalaryMonth, BaseSalary, Bonus, Deductions, NetSalary
            FROM salaries WHERE EmployeeID = %s ORDER BY SalaryMonth DESC LIMIT 1
        """, (emp_id,))
        payroll = mcur.fetchone()
        if payroll and payroll.get('SalaryMonth'):
            payroll['SalaryMonth'] = str(payroll['SalaryMonth'])

        mcur.execute("""
            SELECT SUM(WorkDays) as TotalWork, SUM(LeaveDays) as TotalLeave, SUM(AbsentDays) as TotalAbsent
            FROM attendance WHERE EmployeeID = %s
        """, (emp_id,))
        attendance = mcur.fetchone()

        return jsonify({"hr": hr, "payroll": payroll, "attendance": attendance})
    except Exception as e:
        print(f"Error employee_summary: {e}")
        return jsonify({"error": str(e)}), 500


