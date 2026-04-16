const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.msg || error.error || "API request failed");
  }

  return response.json();
}

// Auth APIs
export async function login(username: string, password: string) {
  return fetchAPI<{ status: string; user?: { username: string; role: string }; msg?: string }>(
    "/api/login",
    {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }
  );
}

export async function changePassword(username: string, newPassword: string) {
  return fetchAPI<{ status: string; msg: string }>("/api/password", {
    method: "PUT",
    body: JSON.stringify({ username, new_password: newPassword }),
  });
}

// Dashboard APIs
export async function getDashboardStats(month?: string) {
  const params = month && month !== "All Months" ? `?month=${encodeURIComponent(month)}` : "";
  return fetchAPI<{
    totalEmployees: number;
    payrollTotal: number;
    attendanceRate: number;
  }>(`/api/dashboard/stats${params}`);
}

export async function getStatusOverview() {
  return fetchAPI<Record<string, number>>("/api/dashboard/status-overview");
}

export async function getPerformanceData() {
  return fetchAPI<{
    labels: string[];
    revenue: number[];
    expenses: number[];
  }>("/api/dashboard/performance");
}

export async function getAlerts() {
  return fetchAPI<
    Array<{
      type: string;
      message: string;
      severity: "info" | "warning" | "error";
      date: string;
    }>
  >("/api/alerts");
}

// Payroll APIs
export async function getPayroll(month?: string) {
  const params = month && month !== "All Months" ? `?month=${encodeURIComponent(month)}` : "";
  return fetchAPI<
    Array<{
      MonthYear: string;
      FullName: string;
      BaseSalary: number;
      Bonus: number;
      Deductions: number;
      TotalSalary: number;
    }>
  >(`/api/payroll${params}`);
}

export async function getPayrollSummary(month?: string) {
  const params = month && month !== "All Months" ? `?month=${encodeURIComponent(month)}` : "";
  return fetchAPI<{
    TotalPayroll: number;
    AvgSalary: number;
    Breakdown: Array<{ DepartmentID: number; Amount: number }>;
  }>(`/api/payroll/summary${params}`);
}

// Attendance APIs
export async function getAttendance(month?: string) {
  const params = month && month !== "All Months" ? `?month=${encodeURIComponent(month)}` : "";
  return fetchAPI<
    Array<{
      FullName: string;
      Status: string;
      WorkDays: number;
      LeaveDays: number;
      AbsentDays: number;
    }>
  >(`/api/attendance${params}`);
}

// Employee APIs
export async function getEmployees() {
  return fetchAPI<
    Array<{
      EmployeeID: number;
      FullName: string;
      Department: string | null;
      Position: string | null;
    }>
  >("/api/employees");
}

export async function getEmployeeDetail(id: number) {
  return fetchAPI<{
    EmployeeID: number;
    FullName: string;
    Email: string;
    DateOfBirth: string | null;
    Gender: string;
    PhoneNumber: string;
    HireDate: string | null;
    Status: string;
    DepartmentID: number | null;
    DepartmentName: string | null;
    PositionID: number | null;
    PositionName: string | null;
  }>(`/api/employees/${id}`);
}

export async function addEmployee(data: {
  FullName: string;
  DateOfBirth?: string;
  Gender?: string;
  PhoneNumber?: string;
  Email: string;
  HireDate?: string;
  DepartmentID?: number;
  PositionID?: number;
  Status?: string;
}) {
  return fetchAPI<{ status: string; msg: string }>("/api/employees", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateEmployee(
  id: number,
  data: {
    FullName?: string;
    DateOfBirth?: string;
    Gender?: string;
    PhoneNumber?: string;
    Email?: string;
    HireDate?: string;
    DepartmentID?: number;
    PositionID?: number;
    Status?: string;
  }
) {
  return fetchAPI<{ status: string; msg: string }>(`/api/employees/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteEmployee(id: number) {
  return fetchAPI<{ status: string; msg: string }>(`/api/employees/${id}`, {
    method: "DELETE",
  });
}

// Lookup APIs
export async function getDepartments() {
  return fetchAPI<Array<{ DepartmentID: number; DepartmentName: string }>>("/api/departments");
}

export async function getPositions() {
  return fetchAPI<Array<{ PositionID: number; PositionName: string }>>("/api/positions");
}
