from config import get_sqlserver_connection, get_mysql_connection, get_auth_connection
import os

def test_connections():
    print("Testing SQL Server connection...")
    try:
        conn = get_sqlserver_connection()
        print("SQL Server connected successfully!")
        conn.close()
    except Exception as e:
        print(f"SQL Server connection failed: {e}")

    print("\nTesting SQL Server (Auth) connection...")
    try:
        conn = get_auth_connection()
        print("SQL Server (Auth) connected successfully!")
        conn.close()
    except Exception as e:
        print(f"SQL Server (Auth) connection failed: {e}")

    print("\nTesting MySQL connection...")
    try:
        conn = get_mysql_connection()
        print("MySQL connected successfully!")
        conn.close()
    except Exception as e:
        print(f"MySQL connection failed: {e}")

if __name__ == "__main__":
    test_connections()
