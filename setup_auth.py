"""
Setup Auth Database – Creates/updates HUMAN_AUTH with:
- SystemUsers table (with Email, FailedAttempts, LockedUntil columns)
- AuditLogs table (FR15)
- Default users for all roles (Admin, HR, Payroll, Employee)
"""
import pyodbc
from werkzeug.security import generate_password_hash
import os
from config import load_env

load_env()


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

        print(f"Creating database {auth_db} if not exists...")
        cur.execute(f"IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = '{auth_db}') CREATE DATABASE {auth_db}")

        conn.close()
        conn_str_auth = conn_str + f"DATABASE={auth_db};"
        conn = pyodbc.connect(conn_str_auth, autocommit=True)
        cur = conn.cursor()

        # ---- SystemUsers Table ----
        print("Creating/updating SystemUsers table...")
        cur.execute("""
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SystemUsers')
            CREATE TABLE SystemUsers (
                UserID INT PRIMARY KEY IDENTITY(1,1),
                Username NVARCHAR(50) UNIQUE NOT NULL,
                Email NVARCHAR(100) NULL,
                PasswordHash NVARCHAR(255) NOT NULL,
                Role NVARCHAR(20) DEFAULT 'Employee',
                FailedAttempts INT DEFAULT 0,
                LockedUntil DATETIME NULL
            )
        """)

        # Add missing columns if table already exists
        for col, typedef in [
            ("Email", "NVARCHAR(100) NULL"),
            ("FailedAttempts", "INT DEFAULT 0"),
            ("LockedUntil", "DATETIME NULL"),
        ]:
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

        # ---- Default Users (4 roles as per SRS) ----
        default_users = [
            ("admin", "admin@integration.com", "123456", "Admin"),
            ("hr_manager", "hr@integration.com", "123456", "HR"),
            ("payroll_manager", "payroll@integration.com", "123456", "Payroll"),
            ("employee", "employee@integration.com", "123456", "Employee"),
        ]

        for username, email, password, role in default_users:
            hashed = generate_password_hash(password)
            cur.execute("SELECT COUNT(*) FROM SystemUsers WHERE Username = ?", (username,))
            if cur.fetchone()[0] == 0:
                print(f"  Adding user: {username} ({role})")
                cur.execute(
                    "INSERT INTO SystemUsers (Username, Email, PasswordHash, Role) VALUES (?, ?, ?, ?)",
                    (username, email, hashed, role),
                )
            else:
                print(f"  Updating user: {username} ({role})")
                cur.execute(
                    "UPDATE SystemUsers SET PasswordHash = ?, Role = ?, Email = ? WHERE Username = ?",
                    (hashed, role, email, username),
                )

        print("[OK] Auth setup complete. Users: admin/hr_manager/payroll_manager/employee (password: 123456)")
        conn.close()

    except Exception as e:
        print(f"[ERROR] {e}")


if __name__ == "__main__":
    setup_auth()
