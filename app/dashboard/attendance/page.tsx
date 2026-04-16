"use client";

import { useState } from "react";
import useSWR from "swr";
import { DataTable } from "@/components/ui/data-table";
import { MetricCard } from "@/components/dashboard/metric-card";
import { CardSkeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Avatar } from "@/components/ui/avatar";
import { Calendar, Clock, UserCheck, AlertTriangle } from "lucide-react";
import { getAttendance, getDashboardStats } from "@/lib/api";
import { getStatusColor, formatPercent } from "@/lib/utils";

const MONTHS = [
  { value: "All Months", label: "All Months" },
  { value: "January 2025", label: "January 2025" },
  { value: "February 2025", label: "February 2025" },
  { value: "March 2025", label: "March 2025" },
  { value: "April 2025", label: "April 2025" },
  { value: "May 2025", label: "May 2025" },
  { value: "June 2025", label: "June 2025" },
];

interface AttendanceItem {
  FullName: string;
  Status: string;
  WorkDays: number;
  LeaveDays: number;
  AbsentDays: number;
}

export default function AttendancePage() {
  const [selectedMonth, setSelectedMonth] = useState("All Months");

  const { data: attendanceData, isLoading: attendanceLoading } = useSWR(
    ["attendance", selectedMonth],
    () => getAttendance(selectedMonth),
    { refreshInterval: 30000 }
  );

  const { data: stats, isLoading: statsLoading } = useSWR(
    ["dashboard-stats", selectedMonth],
    () => getDashboardStats(selectedMonth),
    { refreshInterval: 30000 }
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "success" | "warning" | "destructive" | "default"> = {
      Active: "success",
      OnLeave: "warning",
      Inactive: "destructive",
    };
    return (
      <Badge variant={variants[status] || "default"}>
        {status}
      </Badge>
    );
  };

  const columns = [
    {
      key: "FullName",
      header: "Employee",
      sortable: true,
      render: (item: AttendanceItem) => (
        <div className="flex items-center gap-3">
          <Avatar name={item.FullName} size="sm" />
          <span className="font-medium text-foreground">{item.FullName}</span>
        </div>
      ),
    },
    {
      key: "Status",
      header: "Status",
      sortable: true,
      render: (item: AttendanceItem) => getStatusBadge(item.Status),
    },
    {
      key: "WorkDays",
      header: "Work Days",
      sortable: true,
      render: (item: AttendanceItem) => (
        <div className="flex items-center gap-2">
          <div className="h-2 w-16 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-success transition-all"
              style={{ width: `${Math.min(100, (item.WorkDays / 22) * 100)}%` }}
            />
          </div>
          <span className="text-sm font-medium">{item.WorkDays}</span>
        </div>
      ),
    },
    {
      key: "LeaveDays",
      header: "Leave Days",
      sortable: true,
      render: (item: AttendanceItem) => (
        <span className="text-warning font-medium">{item.LeaveDays}</span>
      ),
    },
    {
      key: "AbsentDays",
      header: "Absent Days",
      sortable: true,
      render: (item: AttendanceItem) => (
        <span className={item.AbsentDays > 2 ? "text-destructive font-medium" : ""}>
          {item.AbsentDays}
        </span>
      ),
    },
    {
      key: "attendance",
      header: "Attendance Rate",
      render: (item: AttendanceItem) => {
        const total = item.WorkDays + item.LeaveDays + item.AbsentDays;
        const rate = total > 0 ? (item.WorkDays / total) * 100 : 0;
        return (
          <Badge variant={rate >= 90 ? "success" : rate >= 75 ? "warning" : "destructive"}>
            {formatPercent(rate)}
          </Badge>
        );
      },
    },
  ];

  const totalWorkDays = attendanceData?.reduce((sum, item) => sum + item.WorkDays, 0) || 0;
  const totalLeaveDays = attendanceData?.reduce((sum, item) => sum + item.LeaveDays, 0) || 0;
  const totalAbsentDays = attendanceData?.reduce((sum, item) => sum + item.AbsentDays, 0) || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Attendance</h1>
          <p className="text-muted-foreground">
            Track employee attendance, leaves, and absences
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
              title="Attendance Rate"
              value={formatPercent(stats?.attendanceRate || 0)}
              icon={<UserCheck className="h-6 w-6" />}
              trend="up"
              change={1.8}
            />
            <MetricCard
              title="Total Work Days"
              value={totalWorkDays.toString()}
              icon={<Calendar className="h-6 w-6" />}
              trend="neutral"
            />
            <MetricCard
              title="Leave Days"
              value={totalLeaveDays.toString()}
              icon={<Clock className="h-6 w-6" />}
              trend="neutral"
            />
            <MetricCard
              title="Absent Days"
              value={totalAbsentDays.toString()}
              icon={<AlertTriangle className="h-6 w-6" />}
              trend={totalAbsentDays > 10 ? "down" : "neutral"}
            />
          </>
        )}
      </div>

      {/* Attendance Table */}
      <DataTable
        data={attendanceData || []}
        columns={columns}
        searchKey="FullName"
        searchPlaceholder="Search employees..."
        filters={[
          {
            key: "Status",
            label: "Status",
            options: [
              { value: "Active", label: "Active" },
              { value: "OnLeave", label: "On Leave" },
              { value: "Inactive", label: "Inactive" },
            ],
          },
        ]}
        pageSize={10}
        isLoading={attendanceLoading}
        emptyState={{
          icon: "calendar",
          title: "No attendance records",
          description: "No attendance data found for the selected period",
        }}
      />
    </div>
  );
}
