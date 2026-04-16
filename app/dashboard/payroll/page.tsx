"use client";

import { useState } from "react";
import useSWR from "swr";
import { DataTable } from "@/components/ui/data-table";
import { MetricCard } from "@/components/dashboard/metric-card";
import { CardSkeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { DollarSign, TrendingUp, Users, Percent } from "lucide-react";
import { getPayroll, getPayrollSummary } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

const MONTHS = [
  { value: "All Months", label: "All Months" },
  { value: "January 2025", label: "January 2025" },
  { value: "February 2025", label: "February 2025" },
  { value: "March 2025", label: "March 2025" },
  { value: "April 2025", label: "April 2025" },
  { value: "May 2025", label: "May 2025" },
  { value: "June 2025", label: "June 2025" },
];

interface PayrollItem {
  MonthYear: string;
  FullName: string;
  BaseSalary: number;
  Bonus: number;
  Deductions: number;
  TotalSalary: number;
}

export default function PayrollPage() {
  const [selectedMonth, setSelectedMonth] = useState("All Months");

  const { data: payrollData, isLoading: payrollLoading } = useSWR(
    ["payroll", selectedMonth],
    () => getPayroll(selectedMonth),
    { refreshInterval: 30000 }
  );

  const { data: summary, isLoading: summaryLoading } = useSWR(
    ["payroll-summary", selectedMonth],
    () => getPayrollSummary(selectedMonth),
    { refreshInterval: 30000 }
  );

  const columns = [
    {
      key: "FullName",
      header: "Employee",
      sortable: true,
      render: (item: PayrollItem) => (
        <div className="font-medium text-foreground">{item.FullName}</div>
      ),
    },
    {
      key: "MonthYear",
      header: "Period",
      sortable: true,
      render: (item: PayrollItem) => (
        <Badge variant="default">{item.MonthYear}</Badge>
      ),
    },
    {
      key: "BaseSalary",
      header: "Base Salary",
      sortable: true,
      render: (item: PayrollItem) => (
        <span className="font-mono">{formatCurrency(item.BaseSalary)}</span>
      ),
    },
    {
      key: "Bonus",
      header: "Bonus",
      sortable: true,
      render: (item: PayrollItem) => (
        <span className="font-mono text-success">
          +{formatCurrency(item.Bonus)}
        </span>
      ),
    },
    {
      key: "Deductions",
      header: "Deductions",
      sortable: true,
      render: (item: PayrollItem) => (
        <span className="font-mono text-destructive">
          -{formatCurrency(item.Deductions)}
        </span>
      ),
    },
    {
      key: "TotalSalary",
      header: "Net Salary",
      sortable: true,
      render: (item: PayrollItem) => (
        <span className="font-mono font-semibold text-primary">
          {formatCurrency(item.TotalSalary)}
        </span>
      ),
    },
  ];

  const employeeCount = payrollData?.length || 0;
  const avgSalary = summary?.AvgSalary || (summary?.TotalPayroll && employeeCount ? summary.TotalPayroll / employeeCount : 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payroll</h1>
          <p className="text-muted-foreground">
            Manage employee salaries, bonuses, and deductions
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
        {summaryLoading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : (
          <>
            <MetricCard
              title="Total Payroll"
              value={formatCurrency(summary?.TotalPayroll || 0)}
              icon={<DollarSign className="h-6 w-6" />}
              trend="neutral"
            />
            <MetricCard
              title="Average Salary"
              value={formatCurrency(avgSalary)}
              icon={<TrendingUp className="h-6 w-6" />}
              trend="up"
              change={3.2}
            />
            <MetricCard
              title="Employees Paid"
              value={employeeCount.toString()}
              icon={<Users className="h-6 w-6" />}
              trend="neutral"
            />
            <MetricCard
              title="Bonus Rate"
              value="12.5%"
              icon={<Percent className="h-6 w-6" />}
              trend="up"
              change={1.5}
            />
          </>
        )}
      </div>

      {/* Payroll Table */}
      <DataTable
        data={payrollData || []}
        columns={columns}
        searchKey="FullName"
        searchPlaceholder="Search employees..."
        pageSize={10}
        isLoading={payrollLoading}
        emptyState={{
          icon: "payroll",
          title: "No payroll records",
          description: "No payroll data found for the selected period",
        }}
      />
    </div>
  );
}
