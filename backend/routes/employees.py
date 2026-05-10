from flask import Blueprint, jsonify, request
from config import get_sqlserver_connection, get_mysql_connection, get_auth_connection
from utils.jwt_utils import create_token, require_auth, normalize_role, decode_token
from utils.helpers import log_audit, normalize_gender, generate_otp, send_otp_email
from datetime import datetime, date, timezone
import os, uuid
from werkzeug.security import generate_password_hash, check_password_hash

WORKING_DAYS_PER_MONTH = 22

router = Blueprint('employees', __name__)

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
                "Gender": normalize_gender(r[3]),
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
            "Gender": normalize_gender(r[4]), "PhoneNumber": r[5],
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
            return jsonify({"status": "error", "msg": "Email already exists"}), 400

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
            "msg": f"Employee added successfully (ID = {new_id})"
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

        return jsonify({"status": "success", "msg": "Updated successfully"})
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
            return jsonify({"status": "error", "msg": "Cannot deactivate: Employee has dividend records"}), 409

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
        return jsonify({"status": "success", "msg": "Employee deactivated successfully"})
    except Exception as e:
        if sql:
            try: sql.rollback()
            except: pass
        import traceback
        print(f"[ERROR] delete_employee {emp_id}: {e}")
        print(traceback.format_exc())
        return jsonify({"status": "error", "msg": "Error deactivating employee", "debug": str(e)}), 500

# Deleted report_dividends since it's consolidated into get_dividends below


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



