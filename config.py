import pyodbc
import mysql.connector
import os

# Manual .env loader if python-dotenv is not available
def load_env():
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                if line.strip() and not line.startswith("#"):
                    key, value = line.strip().split("=", 1)
                    if key not in os.environ:
                        os.environ[key] = value

load_env()

def get_sqlserver_connection():
    """Kết nối SQL Server bằng pyodbc"""
    try:
        conn = pyodbc.connect(
            f"DRIVER={{ODBC Driver 18 for SQL Server}};"
            f"SERVER={os.environ.get('SQL_SERVER')};"
            f"DATABASE={os.environ.get('SQL_DATABASE')};"
            f"UID={os.environ.get('SQL_USER')};"
            f"PWD={os.environ.get('SQL_PASSWORD')};"
            "TrustServerCertificate=yes;",
            timeout=5,
        )
        return conn
    except Exception as e:
        print("Lỗi kết nối SQL Server:", str(e))
        raise

def get_mysql_connection():
    """Kết nối MySQL - autocommit=False cho 2-phase-commit"""
    try:
        conn = mysql.connector.connect(
            host=os.environ.get('MYSQL_HOST'),
            port=int(os.environ.get('MYSQL_PORT', 3306)),
            user=os.environ.get('MYSQL_USER'),
            password=os.environ.get('MYSQL_PASSWORD'),
            database=os.environ.get('MYSQL_DATABASE'),
            autocommit=False,
        )
        return conn
    except Exception as e:
        print("Lỗi kết nối MySQL:", str(e))
        raise

def get_auth_connection():
    """Kết nối SQL Server (Auth) cho phân quyền"""
    try:
        conn = pyodbc.connect(
            f"DRIVER={{ODBC Driver 18 for SQL Server}};"
            f"SERVER={os.environ.get('SQL_SERVER')};"
            f"DATABASE={os.environ.get('SQL_AUTH_DATABASE')};"
            f"UID={os.environ.get('SQL_USER')};"
            f"PWD={os.environ.get('SQL_PASSWORD')};"
            "TrustServerCertificate=yes;",
            timeout=5,
        )
        return conn
    except Exception as e:
        print("Lỗi kết nối SQL Server (Auth):", str(e))
        raise
