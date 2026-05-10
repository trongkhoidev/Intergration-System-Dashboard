import os
import pyodbc
from config import load_env

def init_databases():
    load_env()
    print("==================================================")
    print("🚀 INITIALIZING CORE DATABASE (SQL Server)")
    print("==================================================")
    
    try:
        # Connect to Master to create DBs
        sql_conn_str = (
            f"DRIVER={{ODBC Driver 18 for SQL Server}};"
            f"SERVER={os.environ.get('SQL_SERVER')};"
            f"UID={os.environ.get('SQL_USER')};"
            f"PWD={os.environ.get('SQL_PASSWORD')};"
            "TrustServerCertificate=yes;"
        )
        conn = pyodbc.connect(sql_conn_str, autocommit=True)
        cur = conn.cursor()
        
        with open("MASTER_DATABASE_SCHEMA.sql", "r", encoding="utf-8") as f:
            sql_content = f.read()
            
        # Strip out the MySQL portion (after SECTION 3)
        sql_server_part = sql_content.split("-- # SECTION 3: MYSQL")[0]
        
        batches = sql_server_part.split("GO")
        for batch in batches:
            batch = batch.strip()
            if batch:
                try:
                    cur.execute(batch)
                except Exception as e:
                    # Ignore harmless errors like 'Database already exists'
                    if "already exists" not in str(e):
                        pass
        print("✅ SQL Server Main Database setup completed.")
        conn.close()
    except Exception as e:
        print(f"❌ Error configuring SQL Server: {e}")
        
    try:
        import mysql.connector
        print("\n⏳ Connecting to MySQL for Payroll DB...")
        mysql_conn = mysql.connector.connect(
            host=os.environ.get('MYSQL_HOST', 'localhost'),
            user=os.environ.get('MYSQL_USER', 'root'),
            password=os.environ.get('MYSQL_PASSWORD', '')
        )
        my_cur = mysql_conn.cursor()
        
        my_cur.execute(f"CREATE DATABASE IF NOT EXISTS {os.environ.get('MYSQL_DATABASE', 'PAYROLL')};")
        my_cur.execute(f"USE {os.environ.get('MYSQL_DATABASE', 'PAYROLL')};")
        
        my_cur.execute("""
        CREATE TABLE IF NOT EXISTS employees_payroll (
            EmployeeID INT PRIMARY KEY,
            FullName VARCHAR(100),
            DepartmentID INT NULL,
            PositionID INT NULL,
            Status VARCHAR(50) DEFAULT 'Active'
        );
        """)
        my_cur.execute("""
        CREATE TABLE IF NOT EXISTS attendance (
            AttendanceID INT AUTO_INCREMENT PRIMARY KEY,
            EmployeeID INT NOT NULL,
            AttendanceMonth DATE,
            WorkDays INT DEFAULT 0,
            LeaveDays INT DEFAULT 0,
            AbsentDays INT DEFAULT 0
        );
        """)
        my_cur.execute("""
        CREATE TABLE IF NOT EXISTS salaries (
            SalaryID INT AUTO_INCREMENT PRIMARY KEY,
            EmployeeID INT NOT NULL,
            SalaryMonth DATE,
            BaseSalary DECIMAL(18,2),
            Bonus DECIMAL(18,2) DEFAULT 0.00,
            Deductions DECIMAL(18,2) DEFAULT 0.00,
            NetSalary DECIMAL(18,2)
        );
        """)
        mysql_conn.commit()
        print("✅ MySQL Database 'PAYROLL' setup completed.")
        mysql_conn.close()
    except Exception as e:
        print(f"❌ Error configuring MySQL (Make sure XAMPP/MySQL is running): {e}")

if __name__ == "__main__":
    init_databases()
