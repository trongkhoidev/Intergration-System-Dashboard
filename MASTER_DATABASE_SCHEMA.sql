/*
================================================================================
MASTER DATABASE SCHEMA & SETUP GUIDE (CURRENT STATE - 2024 UPDATE)
================================================================================
Tài liệu này chứa TOÀN BỘ cấu trúc database hiện tại đang sử dụng cho dự án.
Phục vụ cho việc Clone dự án và Setup môi trường local nhanh chóng và chính xác.
Dự án sử dụng mô hình Mixed Database (SQL Server & MySQL).

DANH SÁCH DATABASE CẦN CÓ:
1. SQL Server - Database Chính (Mặc định: HUMAN_2025)
2. SQL Server - Database Auth (Mặc định: HUMAN_AUTH) -> [MỚI THÊM]
3. MySQL     - Database Payroll (Mặc định: PAYROLL)

--------------------------------------------------------------------------------
HƯỚNG DẪN CẤU HÌNH .env:
SQL_SERVER=your_server_name
SQL_DATABASE=HUMAN_2025
SQL_AUTH_DATABASE=HUMAN_AUTH
SQL_USER=your_username
SQL_PASSWORD=your_password
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=PAYROLL
================================================================================
*/

-- #############################################################################
-- # SECTION 1: SQL SERVER - MAIN DATABASE (HUMAN_2025)
-- # Mục đích: Quản lý thông tin nhân sự, phòng ban, chức vụ.
-- #############################################################################

-- 1. Tạo Database
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'HUMAN_2025')
CREATE DATABASE HUMAN_2025;
GO
USE HUMAN_2025;
GO

-- 2. Bảng Departments (Phòng ban)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Departments')
BEGIN
    CREATE TABLE Departments (
        DepartmentID INT IDENTITY(1,1) PRIMARY KEY,
        DepartmentName NVARCHAR(100) NOT NULL
    );
    INSERT INTO Departments (DepartmentName) VALUES (N'IT'), (N'HR'), (N'Finance'), (N'Marketing');
END
GO

-- 3. Bảng Positions (Chức vụ)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Positions')
BEGIN
    CREATE TABLE Positions (
        PositionID INT IDENTITY(1,1) PRIMARY KEY,
        PositionName NVARCHAR(100) NOT NULL
    );
    INSERT INTO Positions (PositionName) VALUES (N'Developer'), (N'Manager'), (N'Analyst'), (N'Designer');
END
GO

-- 4. Bảng Employees (Nhân viên)
-- Chú ý: Trường 'Status' là trường mới so với bản Lab 3-3 ban đầu để quản lý trạng thái làm việc.
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Employees')
BEGIN
    CREATE TABLE Employees (
        EmployeeID INT IDENTITY(1,1) PRIMARY KEY,
        FullName NVARCHAR(100) NOT NULL,
        Email NVARCHAR(100) UNIQUE, 
        DateOfBirth DATE,
        Gender NVARCHAR(20),
        PhoneNumber NVARCHAR(20),
        HireDate DATE,
        DepartmentID INT NULL,
        PositionID INT NULL,
        Status NVARCHAR(50) DEFAULT 'Active', -- [NEW FIELD] Mặc định là Active
        FOREIGN KEY (DepartmentID) REFERENCES Departments(DepartmentID),
        FOREIGN KEY (PositionID) REFERENCES Positions(PositionID)
    );
END
GO

-- 5. Bảng Dividends (Cổ tức/Khen thưởng)
-- Dùng cho màn hình báo cáo tài chính/thưởng trong Dashboard.
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Dividends')
BEGIN
    CREATE TABLE Dividends (
        DividendID INT IDENTITY(1,1) PRIMARY KEY,
        EmployeeID INT NOT NULL,
        Amount DECIMAL(18,2),
        FOREIGN KEY (EmployeeID) REFERENCES Employees(EmployeeID)
    );
END
GO


-- #############################################################################
-- # SECTION 2: SQL SERVER - AUTH DATABASE (HUMAN_AUTH) - [DATABASE MỚI]
-- # Mục đích: Quản lý tài khoản đăng nhập và phân quyền (RBAC).
-- #############################################################################

-- 1. Tạo Database Auth
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'HUMAN_AUTH')
CREATE DATABASE HUMAN_AUTH;
GO
USE HUMAN_AUTH;
GO

-- 2. Bảng SystemUsers (Người dùng hệ thống)
-- Chế độ bảo mật: PasswordHash lưu trữ mã băm (dùng Werkzeug Security trong Python)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SystemUsers')
BEGIN
    CREATE TABLE SystemUsers (
        UserID INT PRIMARY KEY IDENTITY(1,1),
        Username NVARCHAR(50) UNIQUE NOT NULL,
        PasswordHash NVARCHAR(255) NOT NULL,
        Role NVARCHAR(20) DEFAULT 'User' -- 'Admin' hoặc 'User'
    );
    
    -- NOTE: Để khởi tạo User Admin đầu tiên, vui lòng chạy file 'python setup_auth.py' 
    -- sau khi đã tạo xong các Database này. File script Python sẽ lo việc băm pass 123456.
END
GO


-- #############################################################################
-- # SECTION 3: MYSQL - PAYROLL DATABASE (PAYROLL)
-- # Mục đích: Quản lý lương, chuyên cần và dữ liệu chấm công.
-- #############################################################################

/* 
LƯU Ý: Phần này chạy trên MySQL (Workbench hoặc Command Line). 
Chuyển đổi cú pháp sang MySQL bên dưới.
*/

-- CREATE DATABASE IF NOT EXISTS PAYROLL;
-- USE PAYROLL;

-- 1. Bảng employees_payroll (Bảng đồng bộ từ SQL Server)
/*
CREATE TABLE IF NOT EXISTS employees_payroll (
    EmployeeID INT PRIMARY KEY,
    FullName VARCHAR(100),
    DepartmentID INT NULL,
    PositionID INT NULL,
    Status VARCHAR(50) DEFAULT 'Active'
);
*/

-- 2. Bảng attendance (Chấm công)
/*
CREATE TABLE IF NOT EXISTS attendance (
    AttendanceID INT AUTO_INCREMENT PRIMARY KEY,
    EmployeeID INT NOT NULL,
    AttendanceMonth DATE,
    WorkDays INT DEFAULT 0,
    LeaveDays INT DEFAULT 0,
    AbsentDays INT DEFAULT 0
);
*/

-- 3. Bảng salaries (Lương chi tiết)
/*
CREATE TABLE IF NOT EXISTS salaries (
    SalaryID INT AUTO_INCREMENT PRIMARY KEY,
    EmployeeID INT NOT NULL,
    SalaryMonth DATE,
    BaseSalary DECIMAL(18,2),
    Bonus DECIMAL(18,2) DEFAULT 0.00,
    Deductions DECIMAL(18,2) DEFAULT 0.00,
    NetSalary DECIMAL(18,2)
);
*/

-- ================================================================================
-- TỔNG KẾT CÁC THAY ĐỔI QUAN TRỌNG:
-- 1. Thêm mới DATABASE [HUMAN_AUTH] để tách biệt quản lý User truy cập Dashboard.
-- 2. Thêm mới BẢNG [SystemUsers] chứa tài khoản Login.
-- 3. Cập nhật BẢNG [Employees] trong SQL Server thêm field [Status] (Active/Inactive).
-- 4. BỔ SUNG CƠ CHẾ ĐỒNG BỘ: Mọi thao tác Thêm/Sửa/Xóa Nhân viên đều được 
--    thực hiện song song trên [HUMAN_2025.Employees] và [PAYROLL.employees_payroll] 
--    thông qua API (2-Phase Commit giả lập trong router.py).
-- ================================================================================
