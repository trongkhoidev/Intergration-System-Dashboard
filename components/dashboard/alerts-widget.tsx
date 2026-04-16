"use client";

import { cn } from "@/lib/utils";
import { Cake, AlertTriangle, Info, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Alert {
  type: string;
  message: string;
  severity: "info" | "warning" | "error";
  date: string;
}

interface AlertsWidgetProps {
  alerts: Alert[];
  className?: string;
}

const severityConfig = {
  info: {
    icon: Cake,
    badge: "info" as const,
    bg: "bg-primary/5",
    border: "border-primary/20",
  },
  warning: {
    icon: AlertTriangle,
    badge: "warning" as const,
    bg: "bg-warning/5",
    border: "border-warning/20",
  },
  error: {
    icon: AlertTriangle,
    badge: "destructive" as const,
    bg: "bg-destructive/5",
    border: "border-destructive/20",
  },
};

export function AlertsWidget({ alerts, className }: AlertsWidgetProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-6",
        className
      )}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Live Alerts
          </h3>
          <p className="text-sm text-muted-foreground">
            Important notifications and events
          </p>
        </div>
        {alerts.length > 0 && (
          <Badge variant="info">{alerts.length} new</Badge>
        )}
      </div>

      <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-muted p-3 mb-3">
              <Bell className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No alerts at this time</p>
          </div>
        ) : (
          alerts.map((alert, index) => {
            const config = severityConfig[alert.severity] || severityConfig.info;
            const Icon = config.icon;

            return (
              <div
                key={index}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3 transition-all duration-200 hover:border-primary/30",
                  config.bg,
                  config.border
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    alert.severity === "info" && "bg-primary/20 text-primary",
                    alert.severity === "warning" && "bg-warning/20 text-warning",
                    alert.severity === "error" && "bg-destructive/20 text-destructive"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={config.badge} className="text-xs">
                      {alert.type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {alert.date}
                    </span>
                  </div>
                  <p className="text-sm text-foreground line-clamp-2">
                    {alert.message}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
