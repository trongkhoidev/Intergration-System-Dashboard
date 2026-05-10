# HR Module - Employee Management Diagrams

Tài liệu này chứa các sơ đồ (Sequence, Activity, DFD Level 2) cho các chức năng **Employee Directory** và **Employee CRUD** thuộc phân hệ Quản lý Nhân sự (HR). Các sơ đồ được thiết kế tuân thủ nghiêm ngặt theo chuẩn `ruleDiagram.md`.

---

## 1. Chức năng: Employee Directory (Danh sách Nhân viên)

Chức năng này cho phép người dùng (Admin, HR, Payroll) xem danh sách toàn bộ nhân viên trong công ty.

### 1.1. Sequence Diagram
**Tuân thủ Rule:** Boundary -> Control -> Entity. Các message trả về dùng nét đứt (`-->>`).

```mermaid
sequenceDiagram
    participant User as "Admin / HR / Payroll"
    participant UI as "EmployeeDirectoryUI<br><<Boundary>>"
    participant Controller as "EmployeeController<br><<Control>>"
    participant DB as "SQLServerDB<br><<Entity>>"

    User->>UI: "1. Request to view employees"
    UI->>Controller: "1.1 GET /api/employees"
    Controller->>Controller: "1.1.1 Verify Authentication & Role"
    
    alt Unauthorized
        Controller-->>UI: "1.1.2 Return 'Access Denied' error"
        UI-->>User: "1.1.3 Display error message"
    else Authorized
        Controller->>DB: "1.1.4 SELECT e.*, d.DepartmentName, p.PositionName"
        DB-->>Controller: "1.1.5 Return raw employee records"
        Controller->>Controller: "1.1.6 Normalize Gender & Format Data"
        Controller-->>UI: "1.1.7 Return JSON array of employees"
        UI-->>User: "1.1.8 Render employee list on screen"
    end
```

### 1.2. Activity Diagram
**Tuân thủ Rule:** Phân làn rõ ràng. Điểm kết thúc (Finish) phải nằm ở phía User sau khi nhận kết quả từ hệ thống.

```mermaid
graph TD
    %% Nodes for User
    subgraph "User (Admin / HR / Payroll)"
        start(( ))
        U1("Click 'Employee Directory' menu")
        U2("View employee list")
        U3("View error message")
        finish((( )))
    end

    %% Nodes for System
    subgraph "System"
        S1{"Check Auth & Role?"}
        S2("Connect to Database")
        S3{"DB Connection OK?"}
        S4("Fetch & Normalize Data")
        S5("Return Error 'Access Denied'")
        S6("Return Error 'Failed to fetch'")
        S7("Display output to UI")
    end

    %% Flow logic
    start --> U1
    U1 --> S1
    S1 -- "Invalid" --> S5
    S5 --> U3
    S1 -- "Valid" --> S2
    S2 --> S3
    S3 -- "Failed / Timeout" --> S6
    S6 --> U3
    S3 -- "Success" --> S4
    S4 --> S7
    S7 --> U2
    
    U2 --> finish
    U3 --> finish
```

### 1.3. DFD Level 2 (Data Flow Diagram)
**Tuân thủ Rule:** Đánh số phân cấp, hiển thị External Entity (Admin/HR/Payroll) và Data Store để map luồng dữ liệu chi tiết.

```mermaid
graph LR
    %% Entities and Stores
    Actor["Admin / HR / Payroll"]
    DB_Employees[("Employees DB <br/> SQL Server")]

    %% Processes
    P1_1("1.1 Receive Fetch Request")
    P1_2("1.2 Validate Permissions")
    P1_3("1.3 Execute Query")
    P1_4("1.4 Format Employee Data")

    %% Flows
    Actor -- "View Request" --> P1_1
    P1_1 -- "Token/Role" --> P1_2
    P1_2 -- "Auth Failed" --> Actor
    P1_2 -- "Valid Auth" --> P1_3
    P1_3 -- "SQL Query" --> DB_Employees
    DB_Employees -- "Raw Records" --> P1_3
    P1_3 -- "Raw Data" --> P1_4
    P1_4 -- "Normalized JSON" --> Actor
```

---

## 2. Chức năng: Employee CRUD (Thêm, Sửa, Xóa Nhân viên)

Chức năng này cho phép Admin và HR quản lý thông tin nhân viên.

### 2.1. Sequence Diagram (Employee Delete)
*Quy trình Delete Employee với các validation rule và cơ chế đồng bộ CSDL.*

```mermaid
sequenceDiagram
    participant AdminHR as "Admin / HR"
    participant UI as "EmployeeManagementUI<br><<Boundary>>"
    participant Ctrl as "EmployeeController<br><<Control>>"
    participant SQLDB as "SQLServerDB<br><<Entity>>"
    participant MySQL as "MySQLDB<br><<Entity>>"

    AdminHR->>UI: "1. Click Delete Employee"
    UI->>Ctrl: "1.1 DELETE /api/employees/{emp_id}"
    Ctrl->>Ctrl: "1.1.1 Verify Auth & Role (Admin / HR)"
    
    Ctrl->>SQLDB: "1.1.2 Check existing Dividends"
    SQLDB-->>Ctrl: "1.1.3 Return Dividend count"
    
    alt Has Dividends
        Ctrl-->>UI: "1.1.4 Return 'Cannot deactivate' Error"
        UI-->>AdminHR: "1.1.5 Display Error"
    else No Dividends (Safe to Delete)
        Ctrl->>SQLDB: "1.1.6 UPDATE Status = 'Inactive' (Soft Delete)"
        SQLDB-->>Ctrl: "1.1.7 Confirm SQL Update"
        
        Ctrl->>MySQL: "1.1.8 UPDATE employees_payroll SET Status = 'Inactive'"
        MySQL-->>Ctrl: "1.1.9 Confirm MySQL Sync"
        
        Ctrl->>Ctrl: "1.1.10 Log Audit Action"
        Ctrl-->>UI: "1.1.11 Return Success JSON"
        UI-->>AdminHR: "1.1.12 Display Success Notification"
    end
```

### 2.2. Activity Diagram (Employee CRUD - General Flow)
**Tuân thủ Rule:** Phân làn, điểm kết thúc (Finish) phải nằm ở phía User sau khi xem thông báo kết quả.

```mermaid
graph TD
    %% Nodes for User
    subgraph "User (Admin / HR)"
        start_crud(( ))
        U_Action("Select Add / Update / Delete action")
        U_Submit("Submit Form Data / Confirm ID")
        U_Success("View Success Notification")
        U_Error("View Error Notification")
        finish_crud((( )))
    end

    %% Nodes for System
    subgraph "System Logic"
        S_Auth{"Verify Permissions?"}
        S_Type{"Determine Action Type"}
        
        %% Create / Update Branch
        S_Validate{"Validate Input Data<br/>(Email Exists?)"}
        S_SQL_Write("Insert / Update in SQL Server")
        S_MySQL_Sync("Sync Data to MySQL")
        
        %% Delete Branch
        S_Check_Div{"Check Dividends?"}
        S_Soft_Delete("Soft Delete 'Inactive' in SQL Server")
        S_MySQL_Soft("Sync 'Inactive' Status to MySQL")
        S_Audit("Log Audit Event")
    end

    %% Flow logic
    start_crud --> U_Action
    U_Action --> U_Submit
    U_Submit --> S_Auth
    
    S_Auth -- "Invalid Auth" --> U_Error
    S_Auth -- "Valid Auth" --> S_Type
    
    S_Type -- "Create / Update" --> S_Validate
    S_Validate -- "Invalid Input" --> U_Error
    S_Validate -- "Valid Input" --> S_SQL_Write
    S_SQL_Write --> S_MySQL_Sync
    S_MySQL_Sync --> U_Success
    
    S_Type -- "Delete" --> S_Check_Div
    S_Check_Div -- "Has Dividends" --> U_Error
    S_Check_Div -- "No Dividends" --> S_Soft_Delete
    S_Soft_Delete --> S_MySQL_Soft
    S_MySQL_Soft --> S_Audit
    S_Audit --> U_Success
    
    U_Success --> finish_crud
    U_Error --> finish_crud
```

### 2.3. DFD Level 2 (Data Flow Diagram cho Employee CRUD)
**Tuân thủ Rule:** Số hóa chi tiết luồng CRUD (2.x), hiển thị các Data Store.

```mermaid
graph LR
    %% External Entity
    Actor["Admin / HR"]
    
    %% Data Stores
    DB_SQL[("Employees DB <br/> SQL Server")]
    DB_MySQL[("Payroll DB <br/> MySQL")]
    DB_Audit[("Audit Logs DB")]

    %% Processes
    P2_1("2.1 Submit CRUD Request")
    P2_2("2.2 Verify Authorization")
    P2_3("2.3 Validate Business Rules")
    P2_4("2.4 Execute Primary Action")
    P2_5("2.5 Sync Payroll Data")
    P2_6("2.6 Write Audit Log")

    %% Flow Mapping
    Actor -- "Employee Data / ID" --> P2_1
    P2_1 -- "Request Payload" --> P2_2
    P2_2 -- "Auth Failed" --> Actor
    P2_2 -- "Authorized Request" --> P2_3
    
    P2_3 -- "Validation Query" --> DB_SQL
    DB_SQL -- "Results" --> P2_3
    P2_3 -- "Validation Failed" --> Actor
    
    P2_3 -- "Validated Payload" --> P2_4
    P2_4 -- "DB Update" --> DB_SQL
    DB_SQL -- "Success" --> P2_4
    
    P2_4 -- "Sync Data" --> P2_5
    P2_5 -- "MySQL Update" --> DB_MySQL
    DB_MySQL -- "Done" --> P2_5
    
    P2_5 -- "Event" --> P2_6
    P2_6 -- "Audit Entry" --> DB_Audit
    
    P2_6 -- "Success Response" --> Actor
```
