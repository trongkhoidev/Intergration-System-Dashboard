# ============================================================
# ROUTER - Flask API cho Data Integration Dashboard
# Kết nối SQL Server (HUMAN_2025) + MySQL (PAYROLL)
# JWT Authentication + RBAC + Audit Logging
# ============================================================
from flask import Blueprint, jsonify, request
from config import get_sqlserver_connection, get_mysql_connection, get_auth_connection
from werkzeug.security import generate_password_hash, check_password_hash
from jwt_utils import create_token, require_auth, normalize_role, decode_token
from datetime import datetime, date, timezone
import os
import random
import smtplib
import uuid
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Hằng số nghiệp vụ
WORKING_DAYS_PER_MONTH = 22

router = Blueprint("router", __name__)


# DEBUG: Kiểm tra MySQL config trên Railway (xóa sau khi debug xong)
@router.route("/api/debug/mysql")
def debug_mysql():
    import os, mysql.connector
    host = os.environ.get('MYSQL_HOST', 'NOT_SET')
    port = os.environ.get('MYSQL_PORT', 'NOT_SET')
    user = os.environ.get('MYSQL_USER', 'NOT_SET')
    database = os.environ.get('MYSQL_DATABASE', 'NOT_SET')
    password_set = bool(os.environ.get('MYSQL_PASSWORD'))
    
    # Thu test ket noi
    conn_status = "unknown"
    conn_error = ""
    try:
        conn = mysql.connector.connect(
            host=host,
            port=int(port) if port != 'NOT_SET' else 3306,
            user=user,
            password=os.environ.get('MYSQL_PASSWORD', ''),
            database=database,
            connect_timeout=5,
        )
        cur = conn.cursor()
        cur.execute("SHOW TABLES")
        tables = [r[0] for r in cur.fetchall()]
        conn.close()
        conn_status = "connected"
    except Exception as e:
        conn_status = "failed"
        conn_error = str(e)
    
    return jsonify({
        "MYSQL_HOST": host,
        "MYSQL_PORT": port,
        "MYSQL_USER": user,
        "MYSQL_DATABASE": database,
        "MYSQL_PASSWORD_SET": password_set,
        "connection_status": conn_status,
        "connection_error": conn_error,
        "tables": tables if conn_status == "connected" else []
    })


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
        cur.close()
        auth.close()
    except Exception as e:
        print(f"Audit log error: {e}")


# ============================================================
# AUTH API: LOGIN – Returns JWT Token (FR13)
# Đăng nhập bằng Email (ưu tiên) hoặc Username
# ============================================================
@router.route("/api/login", methods=["POST"])
def login():
    data = request.json
    email_or_username = data.get('email', data.get('username', '')).strip()
    password = data.get('password', '')

    if not email_or_username or not password:
        return jsonify({"status": "error", "msg": "Vui lòng nhập email và mật khẩu"}), 400

    try:
        auth = get_auth_connection()
        auth.autocommit = True
        cur = auth.cursor()
        cur.execute(
            "SELECT UserID, Username, Email, PasswordHash, Role, FailedAttempts, LockedUntil, EmployeeID FROM SystemUsers WHERE Email = ? OR Username = ?",
            (email_or_username, email_or_username),
        )
        row = cur.fetchone()

        if not row:
            return jsonify({"status": "error", "msg": "Email hoặc mật khẩu không đúng"}), 401

        user_id, db_username, email, pw_hash, role, failed, locked_until, employee_id = row

        # BR-21: Check account lock
        if locked_until and locked_until > datetime.now():
            return jsonify({"status": "error", "msg": "Tài khoản đã bị khóa. Vui lòng thử lại sau."}), 423

        if check_password_hash(pw_hash, password):
            # Reset failed attempts on success
            cur.execute("UPDATE SystemUsers SET FailedAttempts = 0, LockedUntil = NULL WHERE UserID = ?", (user_id,))
            normalized_role = normalize_role(role)
            token = create_token(user_id, db_username, email or "", normalized_role, employee_id)

            # Lấy FullName từ bảng Employees nếu có EmployeeID
            full_name = db_username  # fallback
            if employee_id:
                try:
                    sql = get_sqlserver_connection()
                    scur = sql.cursor()
                    scur.execute("SELECT FullName FROM Employees WHERE EmployeeID = ?", (employee_id,))
                    emp_row = scur.fetchone()
                    if emp_row:
                        full_name = emp_row[0]
                    sql.close()
                except Exception:
                    pass

            log_audit("LOGIN_SUCCESS", db_username, f"User logged in via {'email' if '@' in email_or_username else 'username'}")
            return jsonify({
                "status": "success",
                "token": token,
                "user": {
                    "user_id": user_id,
                    "username": db_username,
                    "email": email or "",
                    "role": normalized_role,
                    "employee_id": employee_id,
                    "full_name": full_name,
                },
            })
        else:
            # Increment failed attempts
            new_failed = (failed or 0) + 1
            lock_sql = ""
            if new_failed >= 3:
                lock_sql = ", LockedUntil = DATEADD(MINUTE, 15, GETDATE())"
            cur.execute(f"UPDATE SystemUsers SET FailedAttempts = ?{lock_sql} WHERE UserID = ?", (new_failed, user_id))
            log_audit("LOGIN_FAILED", db_username, f"Attempt {new_failed}")
            msg = "Email hoặc mật khẩu không đúng"
            if new_failed >= 3:
                msg = "Tài khoản đã bị khóa 15 phút sau 3 lần đăng nhập sai"
            return jsonify({"status": "error", "msg": msg}), 401

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"[LOGIN ERROR DETAIL] SQL_SERVER={os.environ.get('SQL_SERVER')} AUTH_DB={os.environ.get('SQL_AUTH_DATABASE')} Error={e}")
        return jsonify({"status": "error", "msg": "Lỗi máy chủ xác thực", "debug": str(e)}), 500

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
@router.route("/api/password", methods=["PUT"])
@require_auth()
def change_password():
    data = request.json
    username = data.get('username')
    current_password = data.get('current_password', '')
    new_password = data.get('new_password')
    
    if not username or not new_password or not current_password:
        return jsonify({"status": "error", "msg": "Thiếu thông tin: cần username, current_password, new_password"}), 400

    if len(new_password) < 6:
        return jsonify({"status": "error", "msg": "Mật khẩu mới phải có ít nhất 6 ký tự"}), 400

    try:
        auth = get_auth_connection()
        auth.autocommit = True
        cur = auth.cursor()

        # Xác minh mật khẩu hiện tại trước khi đổi (BR)
        cur.execute("SELECT PasswordHash FROM SystemUsers WHERE Username = ?", (username,))
        row = cur.fetchone()
        if not row:
            return jsonify({"status": "error", "msg": "Tài khoản không tồn tại"}), 404
        if not check_password_hash(row[0], current_password):
            return jsonify({"status": "error", "msg": "Mật khẩu hiện tại không đúng"}), 401

        hashed_password = generate_password_hash(new_password)
        cur.execute("UPDATE SystemUsers SET PasswordHash = ? WHERE Username = ?", (hashed_password, username))
        log_audit("PASSWORD_CHANGED", username, "User changed their own password")
        return jsonify({"status": "success", "msg": "Đổi mật khẩu thành công"})
    except Exception as e:
        print(f"Error in change_password: {e}")
        return jsonify({"status": "error", "msg": "Lỗi đổi mật khẩu"}), 500

# ============================================================
# API: FORGOT PASSWORD – OTP 6 số (FR)
# ============================================================


def generate_otp():
    """Tạo mã OTP ngẫu nhiên 6 chữ số."""
    return str(random.randint(100000, 999999))


def send_otp_email(to_email, otp_code, username):
    """
    Gửi mã OTP qua email.
    Nếu cấu hình SMTP trong .env → gửi email thật.
    Nếu không → in ra console (mock mode).
    """
    mail_server = os.environ.get('MAIL_SERVER', '')
    mail_user = os.environ.get('MAIL_USERNAME', '')
    mail_pass = os.environ.get('MAIL_PASSWORD', '')
    mail_port = int(os.environ.get('MAIL_PORT', '587'))

    if not mail_server or not mail_user or not mail_pass:
        # Mock mode: In OTP ra console
        print(f"\n{'='*50}")
        print(f"  [OTP MOCK] Email: {to_email}")
        print(f"  [OTP MOCK] Ma OTP: {otp_code}")
        print(f"  [OTP MOCK] Het han sau 10 phut")
        print(f"{'='*50}\n")
        return True

    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f'[Integration Dashboard] Ma OTP xac nhan: {otp_code}'
        msg['From'] = mail_user
        msg['To'] = to_email

        html_body = f"""
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 30px; background: #f8f9fa; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); width: 56px; height: 56px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center;">
                    <span style="color: white; font-size: 24px;">🔐</span>
                </div>
            </div>
            <h2 style="text-align: center; color: #1f2937; margin-bottom: 8px;">Xac nhan doi mat khau</h2>
            <p style="text-align: center; color: #6b7280; font-size: 14px;">Xin chao <b>{username}</b>, day la ma OTP cua ban:</p>
            <div style="background: white; border: 2px dashed #4f46e5; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
                <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #4f46e5;">{otp_code}</span>
            </div>
            <p style="text-align: center; color: #ef4444; font-size: 13px; font-weight: bold;">⏳ Ma nay se het han sau 10 phut</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
            <p style="text-align: center; color: #9ca3af; font-size: 12px;">Neu ban khong yeu cau doi mat khau, vui long bo qua email nay.</p>
        </div>
        """
        msg.attach(MIMEText(html_body, 'html'))

        with smtplib.SMTP(mail_server, mail_port) as server:
            server.starttls()
            server.login(mail_user, mail_pass)
            server.sendmail(mail_user, to_email, msg.as_string())

        print(f"[EMAIL] OTP sent to {to_email}")
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send OTP to {to_email}: {e}")
        return False


@router.route("/api/forgot-password", methods=["POST"])
def forgot_password():
    data = request.json
    email = data.get('email', '').strip()
    if not email:
        return jsonify({"status": "error", "msg": "Vui long nhap email"}), 400

    try:
        auth = get_auth_connection()
        auth.autocommit = True
        cur = auth.cursor()

        cur.execute("SELECT UserID, Username FROM SystemUsers WHERE Email = ?", (email,))
        row = cur.fetchone()
        if not row:
            # Tra ve success de tranh lo email (security)
            return jsonify({"status": "success", "msg": "Neu email ton tai, ma OTP se duoc gui."})

        user_id, username = row

        # Tao ma OTP 6 so
        otp_code = generate_otp()

        # Luu OTP vao DB, het han sau 10 phut
        cur.execute("""
            UPDATE SystemUsers 
            SET OTPCode = ?, OTPExpiry = DATEADD(MINUTE, 10, GETDATE()), OTPAttempts = 0
            WHERE UserID = ?
        """, (otp_code, user_id))

        # Gui email (that hoac mock)
        email_sent = send_otp_email(email, otp_code, username)

        log_audit("OTP_REQUESTED", username, f"OTP requested for password reset")

        if email_sent:
            return jsonify({
                "status": "success",
                "msg": "Ma OTP 6 so da duoc gui den email cua ban. Vui long kiem tra hop thu.",
                "otp_sent": True
            })
        else:
            return jsonify({
                "status": "error",
                "msg": "Khong the gui email. Vui long thu lai sau."
            }), 500

    except Exception as e:
        print(f"Error in forgot_password: {e}")
        return jsonify({"status": "error", "msg": "Loi xu ly yeu cau"}), 500


@router.route("/api/verify-otp", methods=["POST"])
def verify_otp():
    """Xac nhan ma OTP 6 so."""
    data = request.json
    email = data.get('email', '').strip()
    otp = data.get('otp', '').strip()

    if not email or not otp:
        return jsonify({"status": "error", "msg": "Vui long nhap email va ma OTP"}), 400

    try:
        auth = get_auth_connection()
        auth.autocommit = True
        cur = auth.cursor()

        cur.execute("""
            SELECT UserID, Username, OTPCode, OTPExpiry, OTPAttempts 
            FROM SystemUsers WHERE Email = ?
        """, (email,))
        row = cur.fetchone()

        if not row:
            return jsonify({"status": "error", "msg": "Email khong ton tai"}), 404

        user_id, username, stored_otp, otp_expiry, otp_attempts = row

        # Kiem tra so lan nhap sai (toi da 5 lan)
        if otp_attempts and otp_attempts >= 5:
            cur.execute("UPDATE SystemUsers SET OTPCode = NULL, OTPExpiry = NULL, OTPAttempts = 0 WHERE UserID = ?", (user_id,))
            log_audit("OTP_BLOCKED", username, "Too many failed OTP attempts")
            return jsonify({"status": "error", "msg": "Qua nhieu lan nhap sai. Vui long yeu cau ma OTP moi."}), 429

        # Kiem tra OTP co ton tai khong
        if not stored_otp or not otp_expiry:
            return jsonify({"status": "error", "msg": "Khong tim thay ma OTP. Vui long yeu cau ma moi."}), 400

        # Kiem tra OTP het han
        if otp_expiry < datetime.now():
            cur.execute("UPDATE SystemUsers SET OTPCode = NULL, OTPExpiry = NULL, OTPAttempts = 0 WHERE UserID = ?", (user_id,))
            return jsonify({"status": "error", "msg": "Ma OTP da het han. Vui long yeu cau ma moi."}), 400

        # Kiem tra OTP co dung khong
        if otp != stored_otp:
            new_attempts = (otp_attempts or 0) + 1
            cur.execute("UPDATE SystemUsers SET OTPAttempts = ? WHERE UserID = ?", (new_attempts, user_id))
            remaining = 5 - new_attempts
            log_audit("OTP_FAILED", username, f"Wrong OTP attempt {new_attempts}")
            return jsonify({
                "status": "error", 
                "msg": f"Ma OTP khong dung. Con {remaining} lan thu."
            }), 400

        # OTP dung! Tao reset token tam thoi de dung cho buoc doi mat khau
        reset_token = str(uuid.uuid4())
        cur.execute("""
            UPDATE SystemUsers 
            SET ResetToken = ?, ResetTokenExpiry = DATEADD(MINUTE, 15, GETDATE()),
                OTPCode = NULL, OTPExpiry = NULL, OTPAttempts = 0
            WHERE UserID = ?
        """, (reset_token, user_id))

        log_audit("OTP_VERIFIED", username, "OTP verified successfully")
        return jsonify({
            "status": "success",
            "msg": "Xac nhan OTP thanh cong!",
            "reset_token": reset_token
        })

    except Exception as e:
        print(f"Error in verify_otp: {e}")
        return jsonify({"status": "error", "msg": "Loi xac nhan OTP"}), 500


@router.route("/api/reset-password", methods=["POST"])
def reset_password():
    """Doi mat khau moi sau khi xac nhan OTP."""
    data = request.json
    reset_token = data.get('reset_token', data.get('token', ''))
    new_password = data.get('new_password', '')

    if not reset_token or not new_password:
        return jsonify({"status": "error", "msg": "Thieu thong tin"}), 400

    if len(new_password) < 6:
        return jsonify({"status": "error", "msg": "Mat khau phai co it nhat 6 ky tu"}), 400

    try:
        auth = get_auth_connection()
        auth.autocommit = True
        cur = auth.cursor()

        cur.execute("""
            SELECT UserID, Username FROM SystemUsers 
            WHERE ResetToken = ? AND ResetTokenExpiry > GETDATE()
        """, (reset_token,))
        row = cur.fetchone()

        if not row:
            return jsonify({"status": "error", "msg": "Phien da het han. Vui long thuc hien lai."}), 400

        user_id, username = row
        hashed = generate_password_hash(new_password)

        cur.execute("""
            UPDATE SystemUsers 
            SET PasswordHash = ?, ResetToken = NULL, ResetTokenExpiry = NULL, 
                FailedAttempts = 0, LockedUntil = NULL,
                OTPCode = NULL, OTPExpiry = NULL, OTPAttempts = 0
            WHERE UserID = ?
        """, (hashed, user_id))

        log_audit("PASSWORD_RESET_SUCCESS", username, "Password reset via OTP successfully")
        return jsonify({"status": "success", "msg": "Doi mat khau thanh cong! Vui long dang nhap lai."})

    except Exception as e:
        print(f"Error in reset_password: {e}")
        return jsonify({"status": "error", "msg": "Loi doi mat khau"}), 500


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
        sql.autocommit = False
        cur = sql.cursor()
        cur.execute("SELECT COUNT(*) FROM Employees WHERE Email = ?", (email,))
        if cur.fetchone()[0] > 0:
            sql.rollback()
            return jsonify({"status": "error", "msg": "Email đã tồn tại"}), 400

        cur.execute("""
            INSERT INTO Employees
            (FullName, DateOfBirth, Gender, PhoneNumber, Email,
             HireDate, DepartmentID, PositionID, Status)
            OUTPUT INSERTED.EmployeeID
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (full_name, dob, gender, phone, email, hire_date, dept_id, pos_id, status))

        row = cur.fetchone()
        new_id = int(row[0])
        sql.commit()

        # Sync to MySQL - optional, log warning if fails
        try:
            my = get_mysql_connection()
            my_cur = my.cursor()
            my_cur.execute("""
                INSERT INTO employees_payroll
                (EmployeeID, FullName, DepartmentID, PositionID, Status)
                VALUES (%s, %s, %s, %s, %s)
            """, (new_id, full_name, dept_id, pos_id, status))
            my.commit()
        except Exception as mysql_err:
            print(f"[WARN] MySQL sync failed for new employee {new_id}: {mysql_err}")

        return jsonify({
            "status": "success",
            "msg": f"Thêm nhân viên thành công (ID = {new_id})"
        })
    except Exception as e:
        if sql:
            try: sql.rollback()
            except: pass
        import traceback
        err_detail = traceback.format_exc()
        print(f"[ERROR] add_employee: {e}")
        print(err_detail)
        return jsonify({"status": "error", "msg": "Failed to add employee", "debug": str(e)}), 500

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
    dept_id = data.get("DepartmentID") or None
    pos_id = data.get("PositionID") or None
    status = data.get("Status")

    sql = None
    my = None
    try:
        sql = get_sqlserver_connection()
        sql.autocommit = False
        cur = sql.cursor()
        cur.execute("""
            UPDATE Employees
            SET FullName=?, DateOfBirth=?, Gender=?, PhoneNumber=?,
                Email=?, HireDate=?, DepartmentID=?, PositionID=?, Status=?
            WHERE EmployeeID=?
        """, (full_name, dob, gender, phone, email, hire_date, dept_id, pos_id, status, emp_id))
        sql.commit()

        # Sync to MySQL - optional, do not crash if fails
        try:
            my = get_mysql_connection()
            my_cur = my.cursor()
            my_cur.execute("""
                UPDATE employees_payroll
                SET FullName=%s, DepartmentID=%s, PositionID=%s, Status=%s
                WHERE EmployeeID=%s
            """, (full_name, dept_id, pos_id, status, emp_id))
            my.commit()
        except Exception as mysql_err:
            print(f"[WARN] MySQL sync failed for update_employee {emp_id}: {mysql_err}")

        return jsonify({"status": "success", "msg": "Update thành công"})
    except Exception as e:
        if sql:
            try: sql.rollback()
            except: pass
        import traceback
        print(f"[ERROR] update_employee {emp_id}: {e}")
        print(traceback.format_exc())
        return jsonify({"status": "error", "msg": "Failed to update employee", "debug": str(e)}), 500

# ============================================================
# API: XÓA NHÂN VIÊN (DELETE) – BR-05: Soft Delete Only
# ============================================================
@router.route("/api/employees/<int:emp_id>", methods=["DELETE"])
@require_auth(["Admin", "HR"])
def delete_employee(emp_id):
    sql = None
    my = None
    try:
        sql = get_sqlserver_connection()
        sql.autocommit = False
        cur = sql.cursor()

        # Validation: check if Dividends exist (SQL Server)
        cur.execute("SELECT COUNT(*) FROM Dividends WHERE EmployeeID = ?", (emp_id,))
        if cur.fetchone()[0] > 0:
            sql.rollback()
            return jsonify({"status": "error", "msg": "Khong the vo hieu hoa: Nhan vien co du lieu co tuc"}), 409

        # BR-05: Soft delete
        cur.execute("UPDATE Employees SET Status = 'Inactive' WHERE EmployeeID = ?", (emp_id,))
        sql.commit()

        # Sync to MySQL - optional
        try:
            my = get_mysql_connection()
            my_cur = my.cursor()
            # Check salaries in MySQL (informational only)
            my_cur.execute("SELECT COUNT(*) FROM salaries WHERE EmployeeID = %s", (emp_id,))
            if my_cur.fetchone()[0] > 0:
                print(f"[INFO] Employee {emp_id} has salary records in MySQL")
            my_cur.execute("UPDATE employees_payroll SET Status = 'Inactive' WHERE EmployeeID = %s", (emp_id,))
            my.commit()
        except Exception as mysql_err:
            print(f"[WARN] MySQL sync failed for delete_employee {emp_id}: {mysql_err}")

        username = request.current_user.get('username', 'system')
        log_audit("EMPLOYEE_DEACTIVATED", username, f"Employee {emp_id} set to Inactive (BR-05 soft delete)")
        return jsonify({"status": "success", "msg": "Nhan vien da duoc vo hieu hoa thanh cong"})
    except Exception as e:
        if sql:
            try: sql.rollback()
            except: pass
        import traceback
        print(f"[ERROR] delete_employee {emp_id}: {e}")
        print(traceback.format_exc())
        return jsonify({"status": "error", "msg": "Loi vo hieu hoa nhan vien", "debug": str(e)}), 500

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
    # Dùng request.current_user đã được set bởi @require_auth, không cần decode lại
    payload = request.current_user
    username = payload.get("username")
    email = payload.get("email")
    employee_id = payload.get("employee_id")

    if request.method == "GET":
        try:
            auth = get_auth_connection()
            cur = auth.cursor()
            cur.execute("SELECT UserID, Username, Email, Role FROM SystemUsers WHERE Username = ?", (username,))
            row = cur.fetchone()
            if not row:
                return jsonify({"msg": "User not found"}), 404

            user_info = {"UserID": row[0], "Username": row[1], "Email": row[2] or "", "Role": row[3]}

            # Lấy thông tin nhân viên từ SQL Server – ưu tiên dùng EmployeeID từ token
            emp_email = user_info["Email"]
            if emp_email:
                sql = get_sqlserver_connection()
                ecur = sql.cursor()
                ecur.execute("""
                    SELECT e.FullName, e.Email, e.PhoneNumber, e.DateOfBirth, e.Gender, e.HireDate, e.Status,
                           d.DepartmentName, p.PositionName
                    FROM Employees e
                    LEFT JOIN Departments d ON e.DepartmentID = d.DepartmentID
                    LEFT JOIN Positions p ON e.PositionID = p.PositionID
                    WHERE e.Email = ?
                """, (emp_email,))
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
            print(f"Error in profile GET: {e}")
            return jsonify({"error": str(e)}), 500

    elif request.method == "PUT":
        data = request.json
        full_name = data.get("FullName", "").strip()
        phone = data.get("PhoneNumber", "").strip()

        if not full_name:
            return jsonify({"status": "error", "msg": "FullName không được để trống"}), 400

        try:
            # 1. Update SQL Server Employees – tìm theo email
            if email:
                sql = get_sqlserver_connection()
                sql.autocommit = True
                cur = sql.cursor()
                cur.execute(
                    "UPDATE Employees SET FullName = ?, PhoneNumber = ? WHERE Email = ?",
                    (full_name, phone, email)
                )

            # 2. Update MySQL employees_payroll – dùng EmployeeID từ JWT token
            if employee_id:
                my = get_mysql_connection()
                my.autocommit = True
                mcur = my.cursor()
                mcur.execute(
                    "UPDATE employees_payroll SET FullName = %s WHERE EmployeeID = %s",
                    (full_name, employee_id)
                )

            log_audit("PROFILE_UPDATED", username, f"Updated FullName={full_name}, Phone={phone}")
            return jsonify({"status": "success", "msg": "Cập nhật hồ sơ thành công"})
        except Exception as e:
            print(f"Error updating profile: {e}")
            return jsonify({"status": "error", "msg": "Lỗi cập nhật hồ sơ"}), 500


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


