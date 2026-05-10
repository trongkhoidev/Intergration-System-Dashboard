from flask import Blueprint, jsonify, request
from config import get_sqlserver_connection, get_mysql_connection, get_auth_connection
from utils.jwt_utils import create_token, require_auth, normalize_role, decode_token
from utils.helpers import log_audit, normalize_gender, generate_otp, send_otp_email
from datetime import datetime, date, timezone
import os, uuid
from werkzeug.security import generate_password_hash, check_password_hash

WORKING_DAYS_PER_MONTH = 22

router = Blueprint('auth', __name__)

@router.route("/api/login", methods=["POST"])
def login():
    data = request.json
    email_or_username = data.get('email', data.get('username', '')).strip()
    password = data.get('password', '')

    if not email_or_username or not password:
        return jsonify({"status": "error", "msg": "Please enter email and password"}), 400

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
            return jsonify({"status": "error", "msg": "Invalid email or password"}), 401

        user_id, db_username, email, pw_hash, role, failed, locked_until, employee_id = row

        # BR-21: Check account lock
        if locked_until and locked_until > datetime.now():
            return jsonify({"status": "error", "msg": "Account locked. Please try again later."}), 423

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
                msg = "Account locked for 15 minutes after 3 failed login attempts"
            return jsonify({"status": "error", "msg": msg}), 401

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"[LOGIN ERROR DETAIL] SQL_SERVER={os.environ.get('SQL_SERVER')} AUTH_DB={os.environ.get('SQL_AUTH_DATABASE')} Error={e}")
        return jsonify({"status": "error", "msg": "Authentication server error", "debug": str(e)}), 500

# ============================================================
# NEW API: PAYROLL DATA
# ============================================================

@router.route("/api/password", methods=["PUT"])
@require_auth()
def change_password():
    data = request.json
    username = data.get('username')
    current_password = data.get('current_password', '')
    new_password = data.get('new_password')
    
    if not username or not new_password or not current_password:
        return jsonify({"status": "error", "msg": "Missing information: username, current_password, and new_password are required"}), 400

    if len(new_password) < 6:
        return jsonify({"status": "error", "msg": "New password must be at least 6 characters"}), 400

    try:
        auth = get_auth_connection()
        auth.autocommit = True
        cur = auth.cursor()

        # Xác minh mật khẩu hiện tại trước khi đổi (BR)
        cur.execute("SELECT PasswordHash FROM SystemUsers WHERE Username = ?", (username,))
        row = cur.fetchone()
        if not row:
            return jsonify({"status": "error", "msg": "Account not found"}), 404
        if not check_password_hash(row[0], current_password):
            return jsonify({"status": "error", "msg": "Incorrect current password"}), 401

        hashed_password = generate_password_hash(new_password)
        cur.execute("UPDATE SystemUsers SET PasswordHash = ? WHERE Username = ?", (hashed_password, username))
        log_audit("PASSWORD_CHANGED", username, "User changed their own password")
        return jsonify({"status": "success", "msg": "Password changed successfully"})
    except Exception as e:
        print(f"Error in change_password: {e}")
        return jsonify({"status": "error", "msg": "Error changing password"}), 500

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
        return jsonify({"status": "error", "msg": "Please enter your email"}), 400

    try:
        auth = get_auth_connection()
        auth.autocommit = True
        cur = auth.cursor()

        cur.execute("SELECT UserID, Username FROM SystemUsers WHERE Email = ?", (email,))
        row = cur.fetchone()
        if not row:
            # Tra ve success de tranh lo email (security)
            return jsonify({"status": "success", "msg": "If the email exists, an OTP will be sent."})

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
                "msg": "A 6-digit OTP has been sent to your email. Please check your inbox.",
                "otp_sent": True
            })
        else:
            return jsonify({
                "status": "error",
                "msg": "Could not send email. Please try again later."
            }), 500

    except Exception as e:
        print(f"Error in forgot_password: {e}")
        return jsonify({"status": "error", "msg": "Error processing request"}), 500



@router.route("/api/verify-otp", methods=["POST"])
def verify_otp():
    """Xac nhan ma OTP 6 so."""
    data = request.json
    email = data.get('email', '').strip()
    otp = data.get('otp', '').strip()

    if not email or not otp:
        return jsonify({"status": "error", "msg": "Please enter email and OTP code"}), 400

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
            return jsonify({"status": "error", "msg": "Email not found"}), 404

        user_id, username, stored_otp, otp_expiry, otp_attempts = row

        # Kiem tra so lan nhap sai (toi da 5 lan)
        if otp_attempts and otp_attempts >= 5:
            cur.execute("UPDATE SystemUsers SET OTPCode = NULL, OTPExpiry = NULL, OTPAttempts = 0 WHERE UserID = ?", (user_id,))
            log_audit("OTP_BLOCKED", username, "Too many failed OTP attempts")
            return jsonify({"status": "error", "msg": "Too many failed attempts. Please request a new OTP."}), 429

        # Kiem tra OTP co ton tai khong
        if not stored_otp or not otp_expiry:
            return jsonify({"status": "error", "msg": "OTP not found. Please request a new one."}), 400

        # Kiem tra OTP het han
        if otp_expiry < datetime.now():
            cur.execute("UPDATE SystemUsers SET OTPCode = NULL, OTPExpiry = NULL, OTPAttempts = 0 WHERE UserID = ?", (user_id,))
            return jsonify({"status": "error", "msg": "OTP has expired. Please request a new one."}), 400

        # Kiem tra OTP co dung khong
        if otp != stored_otp:
            new_attempts = (otp_attempts or 0) + 1
            cur.execute("UPDATE SystemUsers SET OTPAttempts = ? WHERE UserID = ?", (new_attempts, user_id))
            remaining = 5 - new_attempts
            log_audit("OTP_FAILED", username, f"Wrong OTP attempt {new_attempts}")
            return jsonify({
                "status": "error", 
                "msg": f"Invalid OTP code. {remaining} attempts remaining."
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
            "msg": "OTP verified successfully!",
            "reset_token": reset_token
        })

    except Exception as e:
        print(f"Error in verify_otp: {e}")
        return jsonify({"status": "error", "msg": "Error verifying OTP"}), 500



@router.route("/api/reset-password", methods=["POST"])
def reset_password():
    """Doi mat khau moi sau khi xac nhan OTP."""
    data = request.json
    reset_token = data.get('reset_token', data.get('token', ''))
    new_password = data.get('new_password', '')

    if not reset_token or not new_password:
        return jsonify({"status": "error", "msg": "Missing information"}), 400

    if len(new_password) < 6:
        return jsonify({"status": "error", "msg": "Password must be at least 6 characters"}), 400

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
            return jsonify({"status": "error", "msg": "Session expired. Please try again."}), 400

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
        return jsonify({"status": "success", "msg": "Password reset successfully! Please login again."})

    except Exception as e:
        print(f"Error in reset_password: {e}")
        return jsonify({"status": "error", "msg": "Error resetting password"}), 500


# ============================================================
# API: DANH SÁCH PHÒNG BAN (DEPARTMENTS)
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
            return jsonify({"status": "error", "msg": "Full Name cannot be empty"}), 400

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
            return jsonify({"status": "success", "msg": "Profile updated successfully"})
        except Exception as e:
            print(f"Error updating profile: {e}")
            return jsonify({"status": "error", "msg": "Error updating profile"}), 500


# ============================================================
# API: REPORTS (FR7, FR8, FR9)
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

