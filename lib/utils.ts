import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US").format(num);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function getStatusColor(status: string): string {
  const statusMap: Record<string, string> = {
    Active: "bg-success/20 text-success",
    Inactive: "bg-muted text-muted-foreground",
    OnLeave: "bg-warning/20 text-warning",
    Terminated: "bg-destructive/20 text-destructive",
    Present: "bg-success/20 text-success",
    Absent: "bg-destructive/20 text-destructive",
    Late: "bg-warning/20 text-warning",
  };
  return statusMap[status] || "bg-muted text-muted-foreground";
}
