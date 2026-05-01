"""
Setup Auth Database – Creates/updates HUMAN_AUTH with:
- SystemUsers table (with EmployeeID, Email, OTP columns)
- AuditLogs table (FR15)
- Default admin users (4 roles)
- Auto-sync employees from HUMAN_2025 with smart role assignment:
  * Phòng Nhân sự (DeptID=1) + chức vụ chính thức → HR
  * Phòng Kế toán (DeptID=2) + chức vụ chính thức → Payroll
  * Còn lại → Employee
"""
import pyodbc
from werkzeug.security import generate_password_hash
import os
from config import load_env

load_env()

# ============================================================
# CONFIGURATION: Role assignment rules
# ============================================================
# DepartmentIDs that map to special roles
HR_DEPARTMENT_ID = 1       # Phòng Nhân sự
PAYROLL_DEPARTMENT_ID = 2  # Phòng Kế toán

# PositionIDs that are considered "chính thức" (eligible for elevated roles)
# Excludes: 8 = Nhân viên thử việc, 9 = Thực tập sinh
PROBATION_POSITION_IDS = (8, 9)  # These positions always get "Employee" role

DEFAULT_PASSWORD = "123456"


def determine_role(department_id, position_id):
    """
    Xác định Role dựa trên Phòng ban + Chức vụ.
    Logic:
      - Phòng Nhân sự (1) + Chức vụ chính thức → HR
      - Phòng Kế toán (2) + Chức vụ chính thức → Payroll  
      - Thử việc/Thực tập (PositionID 8,9) → luôn là Employee
      - Còn lại → Employee
    """
    # Thử việc và Thực tập luôn là Employee, bất kể phòng ban
    if position_id in PROBATION_POSITION_IDS:
        return "Employee"

    # Phòng Nhân sự + chức vụ chính thức → HR
    if department_id == HR_DEPARTMENT_ID:
        return "HR"

    # Phòng Kế toán + chức vụ chính thức → Payroll
    if department_id == PAYROLL_DEPARTMENT_ID:
        return "Payroll"

    # Tất cả phòng ban khác → Employee
    return "Employee"


def generate_username(full_name, existing_usernames):
    """
    Tạo username từ tên đầy đủ (bỏ dấu, viết thường, nối liền).
    Ví dụ: 'Nguyễn Văn An' → 'nguyenvanan'
    Nếu trùng, thêm số: 'nguyenvanan2'
    """
    import unicodedata
    # Bỏ dấu tiếng Việt
    nfkd = unicodedata.normalize('NFKD', full_name)
    ascii_name = ''.join(c for c in nfkd if not unicodedata.combining(c))
    # Thay thế các ký tự đặc biệt tiếng Việt
    replacements = {'đ': 'd', 'Đ': 'd', 'ð': 'd'}
    for old, new in replacements.items():
        ascii_name = ascii_name.replace(old, new)
    # Chuyển thành lowercase, loại bỏ khoảng trắng
    username = ascii_name.lower().replace(' ', '')
    # Chỉ giữ lại chữ cái và số
    username = ''.join(c for c in username if c.isalnum())

    # Xử lý trùng lặp
    base_username = username
    counter = 2
    while username in existing_usernames:
        username = f"{base_username}{counter}"
        counter += 1

    existing_usernames.add(username)
    return username


def setup_auth():
    try:
        conn_str = (
            f"DRIVER={{ODBC Driver 18 for SQL Server}};"
            f"SERVER={os.environ.get('SQL_SERVER')};"
            f"UID={os.environ.get('SQL_USER')};"
            f"PWD={os.environ.get('SQL_PASSWORD')};"
            "TrustServerCertificate=yes;"
        )
        conn = pyodbc.connect(conn_str, autocommit=True)
        cur = conn.cursor()

        auth_db = os.environ.get('SQL_AUTH_DATABASE', 'HUMAN_AUTH')
        main_db = os.environ.get('SQL_DATABASE', 'HUMAN_2025')

        print(f"Creating database {auth_db} if not exists...")
        try:
            cur.execute(f"IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = '{auth_db}') CREATE DATABASE {auth_db}")
        except Exception as e:
            print(f"Skipping DB creation (likely on Somee): {e}")

        conn.close()
        conn_str_auth = conn_str + f"DATABASE={auth_db};"
        conn = pyodbc.connect(conn_str_auth, autocommit=True)
        cur = conn.cursor()

        # ---- Drop and recreate SystemUsers Table ----
        print("Creating/updating SystemUsers table...")
        cur.execute("""
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SystemUsers')
            CREATE TABLE SystemUsers (
                UserID INT PRIMARY KEY IDENTITY(1,1),
                Username NVARCHAR(50) UNIQUE NOT NULL,
                Email NVARCHAR(100) UNIQUE NULL,
                PasswordHash NVARCHAR(255) NOT NULL,
                Role NVARCHAR(20) DEFAULT 'Employee',
                EmployeeID INT NULL,
                FailedAttempts INT DEFAULT 0,
                LockedUntil DATETIME NULL,
                ResetToken NVARCHAR(255) NULL,
                ResetTokenExpiry DATETIME NULL,
                OTPCode NVARCHAR(10) NULL,
                OTPExpiry DATETIME NULL,
                OTPAttempts INT DEFAULT 0
            )
        """)

        # Add missing columns if table already exists
        new_columns = [
            ("Email", "NVARCHAR(100) NULL"),
            ("EmployeeID", "INT NULL"),
            ("FailedAttempts", "INT DEFAULT 0"),
            ("LockedUntil", "DATETIME NULL"),
            ("ResetToken", "NVARCHAR(255) NULL"),
            ("ResetTokenExpiry", "DATETIME NULL"),
            ("OTPCode", "NVARCHAR(10) NULL"),
            ("OTPExpiry", "DATETIME NULL"),
            ("OTPAttempts", "INT DEFAULT 0"),
        ]
        for col, typedef in new_columns:
            try:
                cur.execute(f"""
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('SystemUsers') AND name = '{col}')
                    ALTER TABLE SystemUsers ADD {col} {typedef}
                """)
            except Exception:
                pass

        # ---- AuditLogs Table (FR15) ----
        print("Creating AuditLogs table...")
        cur.execute("""
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AuditLogs')
            CREATE TABLE AuditLogs (
                LogID INT PRIMARY KEY IDENTITY(1,1),
                Username NVARCHAR(50),
                Action NVARCHAR(100),
                Details NVARCHAR(500),
                Timestamp DATETIME DEFAULT GETDATE()
            )
        """)

        # ---- Step 1: Default Admin Users (4 roles) ----
        print("\n=== Step 1: Creating default admin users ===")
        default_users = [
            ("admin", "admin@integration.com", DEFAULT_PASSWORD, "Admin", None),
            ("hr_manager", "hr@integration.com", DEFAULT_PASSWORD, "HR", None),
            ("payroll_manager", "payroll@integration.com", DEFAULT_PASSWORD, "Payroll", None),
            ("employee", "emp@integration.com", DEFAULT_PASSWORD, "Employee", None),
        ]

        for username, email, password, role, emp_id in default_users:
            hashed = generate_password_hash(password)
            cur.execute("SELECT COUNT(*) FROM SystemUsers WHERE Username = ?", (username,))
            if cur.fetchone()[0] == 0:
                print(f"  [+] Adding default user: {username} ({role})")
                cur.execute(
                    "INSERT INTO SystemUsers (Username, Email, PasswordHash, Role, EmployeeID) VALUES (?, ?, ?, ?, ?)",
                    (username, email, hashed, role, emp_id),
                )
            else:
                print(f"  [=] Default user exists: {username} ({role})")

        # ---- Step 2: Sync Employees from HUMAN_2025 ----
        print(f"\n=== Step 2: Syncing employees from {main_db} ===")

        # Connect to main database to read employees
        conn_main_str = (
            f"DRIVER={{ODBC Driver 18 for SQL Server}};"
            f"SERVER={os.environ.get('SQL_SERVER')};"
            f"DATABASE={main_db};"
            f"UID={os.environ.get('SQL_USER')};"
            f"PWD={os.environ.get('SQL_PASSWORD')};"
            "TrustServerCertificate=yes;"
        )
        conn_main = pyodbc.connect(conn_main_str, autocommit=True)
        cur_main = conn_main.cursor()

        cur_main.execute("""
            SELECT e.EmployeeID, e.FullName, e.Email, e.DepartmentID, e.PositionID, e.Status,
                   d.DepartmentName, p.PositionName
            FROM Employees e
            LEFT JOIN Departments d ON e.DepartmentID = d.DepartmentID
            LEFT JOIN Positions p ON e.PositionID = p.PositionID
            WHERE e.Email IS NOT NULL AND e.Email != ''
        """)
        employees = cur_main.fetchall()

        # Get existing usernames to avoid duplicates
        cur.execute("SELECT Username FROM SystemUsers")
        existing_usernames = set(row[0] for row in cur.fetchall())

        synced_count = 0
        skipped_count = 0

        for emp in employees:
            emp_id, full_name, email, dept_id, pos_id, status, dept_name, pos_name = emp

            # Skip if email already exists in SystemUsers
            cur.execute("SELECT COUNT(*) FROM SystemUsers WHERE Email = ? OR EmployeeID = ?", (email, emp_id))
            if cur.fetchone()[0] > 0:
                # Update EmployeeID if not set
                cur.execute("UPDATE SystemUsers SET EmployeeID = ? WHERE Email = ? AND EmployeeID IS NULL", (emp_id, email))
                skipped_count += 1
                continue

            # Determine role based on Department + Position
            role = determine_role(dept_id, pos_id)
            username = generate_username(full_name, existing_usernames)
            hashed = generate_password_hash(DEFAULT_PASSWORD)

            cur.execute(
                "INSERT INTO SystemUsers (Username, Email, PasswordHash, Role, EmployeeID) VALUES (?, ?, ?, ?, ?)",
                (username, email, hashed, role, emp_id),
            )
            synced_count += 1
            # In ra log đơn giản hơn để tránh lỗi Unicode terminal
            try:
                print(f"  [+] Synced: {username} ({role})")
            except:
                pass

        conn_main.close()

        print(f"\n=== Summary ===")
        print(f"  New accounts created: {synced_count}")
        print(f"  Already existed (skipped): {skipped_count}")
        print(f"  Default password for all new accounts: {DEFAULT_PASSWORD}")

        # ---- Step 3: Display all users ----
        print(f"\n=== All SystemUsers ===")
        cur.execute("SELECT UserID, Username, Email, Role, EmployeeID FROM SystemUsers ORDER BY UserID")
        print(f"  {'ID':<5} {'Username':<20} {'Email':<35} {'Role':<10} {'EmpID':<6}")
        print(f"  {'-'*5} {'-'*20} {'-'*35} {'-'*10} {'-'*6}")
        for row in cur.fetchall():
            uid, uname, email, role, eid = row
            print(f"  {uid:<5} {uname:<20} {(email or 'N/A'):<35} {role:<10} {str(eid or '-'):<6}")

        print("\n[OK] Auth setup complete!")
        conn.close()

    except Exception as e:
        print(f"[ERROR] {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    setup_auth()
