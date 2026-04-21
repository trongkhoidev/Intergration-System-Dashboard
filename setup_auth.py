import pyodbc
from werkzeug.security import generate_password_hash
import os
from config import load_env

load_env()

def setup_auth():
    try:
        # Connect to master to create DB
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
        
        # Connect to the Auth DB
        conn.close()
        conn_str_auth = conn_str + f"DATABASE={auth_db};"
        conn = pyodbc.connect(conn_str_auth, autocommit=True)
        cur = conn.cursor()
        
        print("Creating SystemUsers table...")
        cur.execute("""
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SystemUsers')
            CREATE TABLE SystemUsers (
                UserID INT PRIMARY KEY IDENTITY(1,1),
                Username NVARCHAR(50) UNIQUE NOT NULL,
                PasswordHash NVARCHAR(255) NOT NULL,
                Role NVARCHAR(20) DEFAULT 'User'
            )
        """)
        
        # Add default admin user
        username = "admin"
        password = "123456"
        hashed = generate_password_hash(password)
        
        cur.execute("SELECT COUNT(*) FROM SystemUsers WHERE Username = ?", (username,))
        if cur.fetchone()[0] == 0:
            print(f"Adding user: {username}")
            cur.execute("INSERT INTO SystemUsers (Username, PasswordHash, Role) VALUES (?, ?, ?)", 
                       (username, hashed, "Admin"))
            print("User added successfully!")
        else:
            print(f"Updating password for user: {username}")
            cur.execute("UPDATE SystemUsers SET PasswordHash = ?, Role = ? WHERE Username = ?", 
                       (hashed, "Admin", username))
            print("Password updated successfully.")
            
        print("✅ Auth setup complete.")
        conn.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    setup_auth()
