from flask import Blueprint, jsonify, request
from config import get_sqlserver_connection, get_mysql_connection, get_auth_connection
from utils.jwt_utils import create_token, require_auth, normalize_role, decode_token
from utils.helpers import log_audit, normalize_gender, generate_otp, send_otp_email
from datetime import datetime, date, timezone
import os, uuid
from werkzeug.security import generate_password_hash, check_password_hash

WORKING_DAYS_PER_MONTH = 22

router = Blueprint('admin', __name__)

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


def normalize_gender(g):
    if not g: return "Male"
    g_low = str(g).lower().strip()
    if g_low in ["nam", "male"]: return "Male"
    if g_low in ["nữ", "nu", "female"]: return "Female"
    return "Other"


# ============================================================
# AUTH API: LOGIN – Returns JWT Token (FR13)
# Đăng nhập bằng Email (ưu tiên) hoặc Username
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

