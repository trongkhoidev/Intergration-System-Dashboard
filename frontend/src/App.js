import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import EmployeeEdit from './pages/EmployeeEdit';
import Login from './pages/Login';
import Payroll from './pages/Payroll';
import Attendance from './pages/Attendance';
import Reports from './pages/Reports';
import Alerts from './pages/Alerts';
import Profile from './pages/Profile';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import SystemUsers from './pages/SystemUsers';
import AuditLogs from './pages/AuditLogs';
import MyPayroll from './pages/MyPayroll';
import MyAttendance from './pages/MyAttendance';
import { normalizeRole } from './utils/auth';

function App() {
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;

  if (!user) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="*" element={<Login />} />
        </Routes>
      </BrowserRouter>
    );
  }

  const role = normalizeRole(user.role);

  // RBAC: Define accessible routes per role
  // Admin: Full access to ALL features including system management
  // HR: Employee CRUD, payroll (read-only), attendance, reports, alerts
  // Payroll: Payroll management, attendance, employee (read-only), reports
  // Employee: Own profile, own salary history, own attendance only
  const roleRoutes = {
    admin: (
      <>
        <Route path="/" element={<Dashboard />} />
        <Route path="/employees" element={<Employees />} />
        <Route path="/employees/:id" element={<EmployeeEdit />} />
        <Route path="/payroll" element={<Payroll />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/users" element={<SystemUsers />} />
        <Route path="/audit-logs" element={<AuditLogs />} />
        <Route path="*" element={<Navigate to="/" />} />
      </>
    ),
    hr: (
      <>
        <Route path="/" element={<Dashboard />} />
        <Route path="/employees" element={<Employees />} />
        <Route path="/employees/:id" element={<EmployeeEdit />} />
        <Route path="/payroll" element={<Payroll />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/" />} />
      </>
    ),
    payroll: (
      <>
        <Route path="/" element={<Dashboard />} />
        <Route path="/employees" element={<Employees />} />
        <Route path="/payroll" element={<Payroll />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/" />} />
      </>
    ),
    employee: (
      <>
        <Route path="/profile" element={<Profile />} />
        <Route path="/my-payroll" element={<MyPayroll />} />
        <Route path="/my-attendance" element={<MyAttendance />} />
        <Route path="*" element={<Navigate to="/profile" />} />
      </>
    ),
  };

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          {roleRoutes[role] || roleRoutes.employee}
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
