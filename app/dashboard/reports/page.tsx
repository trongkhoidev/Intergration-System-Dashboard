"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { StatusChart } from "@/components/dashboard/status-chart";
import { CardSkeleton, ChartSkeleton } from "@/components/ui/skeleton";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  FileText,
  Download,
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
} from "lucide-react";
import {
  getDashboardStats,
  getStatusOverview,
  getPerformanceData,
  getPayrollSummary,
} from "@/lib/api";
import { formatCurrency, formatPercent } from "@/lib/utils";

const MONTHS = [
  { value: "All Months", label: "All Months" },
  { value: "January 2025", label: "January 2025" },
  { value: "February 2025", label: "February 2025" },
  { value: "March 2025", label: "March 2025" },
];

const DEPARTMENT_COLORS = [
  "hsl(166, 76%, 47%)",
  "hsl(217, 91%, 60%)",
  "hsl(38, 92%, 50%)",
  "hsl(280, 65%, 60%)",
  "hsl(0, 84%, 60%)",
];

export default function ReportsPage() {
  const [selectedMonth, setSelectedMonth] = useState("All Months");

  const { data: stats, isLoading: statsLoading } = useSWR(
    ["dashboard-stats", selectedMonth],
    () => getDashboardStats(selectedMonth)
  );

  const { data: statusData, isLoading: statusLoading } = useSWR(
    "status-overview",
    getStatusOverview
  );

  const { data: performanceData, isLoading: performanceLoading } = useSWR(
    "performance",
    getPerformanceData
  );

  const { data: payrollSummary, isLoading: payrollLoading } = useSWR(
    ["payroll-summary", selectedMonth],
    () => getPayrollSummary(selectedMonth)
  );

  // Department breakdown data
  const departmentData =
    payrollSummary?.Breakdown?.map((item, index) => ({
      name: `Dept ${item.DepartmentID}`,
      amount: item.Amount,
      fill: DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length],
    })) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground">
            Analytics and insights for your workforce
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            options={MONTHS}
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-40"
          />
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : (
          <>
            <MetricCard
              title="Total Employees"
              value={stats?.totalEmployees?.toString() || "0"}
              icon={<Users className="h-6 w-6" />}
              trend="up"
              change={5.2}
            />
            <MetricCard
              title="Total Payroll"
              value={formatCurrency(stats?.payrollTotal || 0)}
              icon={<DollarSign className="h-6 w-6" />}
              trend="neutral"
            />
            <MetricCard
              title="Attendance Rate"
              value={formatPercent(stats?.attendanceRate || 0)}
              icon={<Calendar className="h-6 w-6" />}
              trend="up"
              change={1.8}
            />
            <MetricCard
              title="Reports Generated"
              value="24"
              icon={<FileText className="h-6 w-6" />}
              trend="up"
              change={12}
            />
          </>
        )}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Performance Chart */}
        {performanceLoading ? (
          <ChartSkeleton />
        ) : (
          performanceData && <PerformanceChart data={performanceData} />
        )}

        {/* Status Distribution */}
        {statusLoading ? (
          <ChartSkeleton />
        ) : (
          statusData && <StatusChart data={statusData} />
        )}
      </div>

      {/* Department Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">
              Payroll by Department
            </CardTitle>
          </CardHeader>
          <CardContent>
            {payrollLoading ? (
              <div className="h-64 skeleton rounded-lg" />
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentData} layout="vertical">
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(0, 0%, 15%)"
                      horizontal={true}
                      vertical={false}
                    />
                    <XAxis
                      type="number"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "hsl(0, 0%, 64%)", fontSize: 12 }}
                      tickFormatter={(value) => `$${value / 1000}k`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "hsl(0, 0%, 64%)", fontSize: 12 }}
                      width={60}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(0, 0%, 7%)",
                        border: "1px solid hsl(0, 0%, 15%)",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [formatCurrency(value), "Amount"]}
                    />
                    <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                      {departmentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">
              Available Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                {
                  title: "Monthly Payroll Summary",
                  description: "Complete breakdown of salaries and deductions",
                  icon: DollarSign,
                },
                {
                  title: "Attendance Report",
                  description: "Employee attendance tracking and analysis",
                  icon: Calendar,
                },
                {
                  title: "Employee Directory",
                  description: "Full list of all employees with details",
                  icon: Users,
                },
                {
                  title: "Performance Analytics",
                  description: "Revenue and expense trends over time",
                  icon: TrendingUp,
                },
              ].map((report, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <report.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{report.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {report.description}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
