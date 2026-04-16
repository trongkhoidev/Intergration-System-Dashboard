"use client";

import { cn } from "@/lib/utils";
import { FileX, Users, DollarSign, Calendar } from "lucide-react";
import { Button } from "./button";

interface EmptyStateProps {
  icon?: "file" | "users" | "payroll" | "calendar";
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const icons = {
  file: FileX,
  users: Users,
  payroll: DollarSign,
  calendar: Calendar,
};

export function EmptyState({
  icon = "file",
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const Icon = icons[icon];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">
        {description}
      </p>
      {action && (
        <Button onClick={action.onClick} variant="default" size="sm">
          {action.label}
        </Button>
      )}
    </div>
  );
}
