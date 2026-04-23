export const normalizeRole = (rawRole) => {
  const role = (rawRole || "").toString().trim().toLowerCase();

  if (["admin", "administrator", "system administrator"].includes(role)) return "admin";
  if (["hr", "hr manager", "human resources", "human resource manager"].includes(role)) return "hr";
  if (["payroll", "payroll manager", "finance payroll"].includes(role)) return "payroll";
  if (["employee", "user", "staff"].includes(role)) return "employee";
  return "employee";
};

export const getCurrentUser = () => {
  const userString = localStorage.getItem("user");
  const user = userString ? JSON.parse(userString) : { username: "Guest", role: "Employee" };
  const normalizedRole = normalizeRole(user.role);
  return { ...user, normalizedRole };
};

export const hasAnyRole = (user, roles = []) => {
  const normalizedRole = normalizeRole(user?.role);
  return roles.includes(normalizedRole);
};
