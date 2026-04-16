"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { Users, DollarSign, Calendar, TrendingUp } from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { StatusChart } from "@/components/dashboard/status-chart";
import { AlertsWidget } from "@/components/dashboard/alerts-widget";
import { CardSkeleton, ChartSkeleton } from "@/components/ui/skeleton";
import { Select } from "@/components/ui/select";
import { formatCurrency, formatPercent } from "@/lib/utils";
import {
  getDashboardStats,
  getStatusOverview,
  getPerformanceData,
  getAlerts,
} from "@/lib/api";

const MONTHS = [
  { value: "All Months", label: "All Months" },
  { value: "January 2025", label: "January 2025" },
  { value: "February 2025", label: "February 2025" },
  { value: "March 2025", label: "March 2025" },
  { value: "April 2025", label: "April 2025" },
  { value: "May 2025", label: "May 2025" },
  { value: "June 2025", label: "June 2025" },
];

export default function DashboardPage() {
  const [selectedMonth, setSelectedMonth] = useState("All Months");

  // Fetch dashboard data
  const { data: stats, isLoading: statsLoading } = useSWR(
    ["dashboard-stats", selectedMonth],
    () => getDashboardStats(selectedMonth),
    { refreshInterval: 30000 }
  );

  const { data: statusData, isLoading: statusLoading } = useSWR(
    "status-overview",
    getStatusOverview,
    { refreshInterval: 30000 }
  );

  const { data: performanceData, isLoading: performanceLoading } = useSWR(
    "performance",
    getPerformanceData,
    { refreshInterval: 60000 }
  );

  const { data: alerts, isLoading: alertsLoading } = useSWR(
    "alerts",
    getAlerts,
    { refreshInterval: 30000 }
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here&apos;s an overview of your workforce.
          </p>
        </div>
        <div className="w-48">
          <Select
            options={MONTHS}
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
        </div>
      </div>

      {/* Metric Cards */}
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
              change={5.2}
              changeLabel="from last month"
              icon={<Users className="h-6 w-6" />}
              trend="up"
            />
            <MetricCard
              title="Monthly Payroll"
              value={formatCurrency(stats?.payrollTotal || 0)}
              change={-2.1}
              changeLabel="from last month"
              icon={<DollarSign className="h-6 w-6" />}
              trend="down"
            />
            <MetricCard
              title="Attendance Rate"
              value={formatPercent(stats?.attendanceRate || 0)}
              change={1.8}
              changeLabel="from last month"
              icon={<Calendar className="h-6 w-6" />}
              trend="up"
            />
            <MetricCard
              title="Avg. Salary"
              value={formatCurrency(
                stats?.totalEmployees
                  ? (stats.payrollTotal || 0) / stats.totalEmployees
                  : 0
              )}
              icon={<TrendingUp className="h-6 w-6" />}
              trend="neutral"
            />
          </>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Performance Chart - Takes 2 columns */}
        <div className="lg:col-span-2">
          {performanceLoading ? (
            <ChartSkeleton />
          ) : (
            performanceData && <PerformanceChart data={performanceData} />
          )}
        </div>

        {/* Status Chart */}
        {statusLoading ? (
          <ChartSkeleton />
        ) : (
          statusData && <StatusChart data={statusData} />
        )}
      </div>

      {/* Alerts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {alertsLoading ? (
          <ChartSkeleton />
        ) : (
          <AlertsWidget alerts={alerts || []} />
        )}

        {/* Quick Stats */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-6">
            Quick Actions
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <a
              href="/dashboard/employees"
              className="flex items-center gap-3 rounded-lg border border-border p-4 transition-all hover:border-primary/50 hover:bg-primary/5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-foreground">Manage Employees</p>
                <p className="text-sm text-muted-foreground">View all staff</p>
              </div>
            </a>
            <a
              href="/dashboard/payroll"
              className="flex items-center gap-3 rounded-lg border border-border p-4 transition-all hover:border-primary/50 hover:bg-primary/5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-foreground">View Payroll</p>
                <p className="text-sm text-muted-foreground">Salary reports</p>
              </div>
            </a>
            <a
              href="/dashboard/attendance"
              className="flex items-center gap-3 rounded-lg border border-border p-4 transition-all hover:border-primary/50 hover:bg-primary/5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-foreground">Attendance</p>
                <p className="text-sm text-muted-foreground">Track time</p>
              </div>
            </a>
            <a
              href="/dashboard/reports"
              className="flex items-center gap-3 rounded-lg border border-border p-4 transition-all hover:border-primary/50 hover:bg-primary/5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-foreground">Reports</p>
                <p className="text-sm text-muted-foreground">Analytics</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
