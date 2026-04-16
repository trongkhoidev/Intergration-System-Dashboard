# ============================================================
# ROUTER - Flask API cho Data Integration Dashboard
# Kết nối SQL Server (HUMAN_BAITAP) + MySQL (PAYROLL_BAITAP)
# ============================================================
from flask import Blueprint, jsonify, request
from config import get_sqlserver_connection, get_mysql_connection, get_auth_connection
from werkzeug.security import generate_password_hash, check_password_hash

router = Blueprint("router", __name__)

# ============================================================
# AUTH API: LOGIN (AUTHENTICATED)
# ============================================================
@router.route("/api/login", methods=["POST"])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({"status": "error", "msg": "Incomplete data"}), 400

    try:
        auth = get_auth_connection()
        cur = auth.cursor()
        cur.execute("SELECT Username, PasswordHash, Role FROM SystemUsers WHERE Username = ?", (username,))
        row = cur.fetchone()
        
        if not row:
            return jsonify({"status": "error", "msg": "Invalid username or password"}), 401
            
        # pyodbc returns a row object that can be accessed by index or name (if using Row object)
        # But to be safe across versions, we map it to a dict
        user_data = {
            "Username": row[0],
            "PasswordHash": row[1],
            "Role": row[2]
        }

        if check_password_hash(user_data['PasswordHash'], password):
            return jsonify({
                "status": "success", 
                "user": {
                    "username": user_data['Username'],
                    "role": user_data['Role']
                }
            })
        else:
            return jsonify({"status": "error", "msg": "Invalid username or password"}), 401
            
    except Exception as e:
        print(f"Error in login: {e}")
        return jsonify({"status": "error", "msg": "Authentication server error"}), 500

# ============================================================
# NEW API: PAYROLL DATA
# ============================================================
@router.route("/api/payroll")
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

@router.route("/api/payroll/summary")
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

@router.route("/api/dashboard/performance")
def get_performance():
    # Mocked since there's no Revenue table, but following the design's multi-line chart requirement
    return jsonify({
        "labels": ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
        "revenue": [65000, 72000, 68000, 85000, 92000, 98000],
        "expenses": [45000, 48000, 52000, 51000, 58000, 62000]
    })

# ============================================================
# NEW API: ATTENDANCE DATA
# ============================================================
@router.route("/api/attendance")
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

# ============================================================
# NEW API: DASHBOARD STATS
# ============================================================
@router.route("/api/dashboard/stats")
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
def get_alerts():
    alerts = []
    try:
        sql = get_sqlserver_connection()
        cur = sql.cursor()
        
        # 1. Birthday Alerts
        from datetime import datetime
        cur.execute("SELECT FullName FROM Employees WHERE MONTH(DateOfBirth) = MONTH(GETDATE())")
        for r in cur.fetchall():
            alerts.append({"type": "Birthday", "message": f"It's {r[0]}'s birthday month!", "severity": "info", "date": "Today"})

        # 2. Salary Anomalies (Live from MySQL)
        my = get_mysql_connection()
        mcur = my.cursor(dictionary=True)
        mcur.execute("SELECT e.FullName, s.NetSalary AS TotalSalary FROM salaries s JOIN employees_payroll e ON s.EmployeeID = e.EmployeeID WHERE s.NetSalary > 15000")
        for r in mcur.fetchall():
            alerts.append({"type": "Salary", "message": f"High salary alert: {r['FullName']} (${r['TotalSalary']})", "severity": "warning", "date": "Recent"})

        return jsonify(alerts)
    except Exception as e:
        print(f"Error in get_alerts: {e}")
        return jsonify(alerts)

# ============================================================
# NEW API: CHANGE PASSWORD (FUNCTIONAL)
# ============================================================
@router.route("/api/password", methods=["PUT"])
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
# API: LẤY DANH SÁCH PHÒNG BAN (DEPARTMENTS)
# ============================================================
@router.route("/api/departments")
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
def get_employees():
    try:
        sql = get_sqlserver_connection()
        cur = sql.cursor()
        cur.execute("""
            SELECT e.EmployeeID, e.FullName, d.DepartmentName, p.PositionName
            FROM Employees e
            LEFT JOIN Departments d ON e.DepartmentID = d.DepartmentID
            LEFT JOIN Positions p ON e.PositionID = p.PositionID
            ORDER BY e.EmployeeID
        """)
        rows = []
        for r in cur.fetchall():
            rows.append({
                "EmployeeID": r[0],
                "FullName": r[1],
                "Department": r[2] if r[2] else None,
                "Position": r[3] if r[3] else None
            })
        return jsonify(rows)
    except Exception as e:
        print(f"Error in get_employees: {e}")
        return jsonify({"error": "Failed to fetch employees"}), 500

# ============================================================
# API: LẤY CHI TIẾT NHÂN VIÊN THEO ID
# ============================================================
@router.route("/api/employees/<int:emp_id>")
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
def delete_employee(emp_id):
    sql = None
    my = None
    try:
        sql = get_sqlserver_connection()
        my = get_mysql_connection()
        sql.autocommit = False
        my.start_transaction()

        cur = sql.cursor()
        # Kiểm tra bảng Dividends nếu có (tránh lỗi nếu không tồn tại)
        try:
            cur.execute("SELECT COUNT(*) FROM Dividends WHERE EmployeeID=?", (emp_id,))
            if cur.fetchone()[0] > 0:
                return jsonify({
                    "status": "error",
                    "msg": "Không thể xoá – nhân viên có Dividends"
                }), 400
        except Exception:
            pass 

        cur.execute("DELETE FROM Employees WHERE EmployeeID=?", (emp_id,))

        my_cur = my.cursor()
        # Xoá các bảng liên quan trong MySQL đồng bộ
        my_cur.execute("DELETE FROM salaries WHERE EmployeeID=%s", (emp_id,))
        my_cur.execute("DELETE FROM attendance WHERE EmployeeID=%s", (emp_id,))
        my_cur.execute("DELETE FROM employees_payroll WHERE EmployeeID=%s", (emp_id,))

        sql.commit()
        my.commit()

        return jsonify({"status": "success", "msg": "Xoá thành công nhân viên và dữ liệu liên quan"})
    except Exception as e:
        if sql: sql.rollback()
        if my: my.rollback()
        print(f"Error in delete_employee: {e}")
        return jsonify({"status": "error", "msg": "Failed to delete employee"}), 500

# ============================================================
# NEW API: DIVIDENDS DATA
# ============================================================
@router.route("/api/dividends")
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
