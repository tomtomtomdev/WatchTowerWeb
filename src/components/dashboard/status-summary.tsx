"use client";

import { CheckCircle2, XCircle, HelpCircle, Activity } from "lucide-react";
import type { EndpointWithStatus } from "@/lib/types";

export type StatusFilter = "all" | "healthy" | "failing" | "unknown";

interface StatusSummaryProps {
  endpoints: EndpointWithStatus[];
  activeFilter: StatusFilter;
  onFilterChange: (filter: StatusFilter) => void;
}

export function StatusSummary({ endpoints, activeFilter, onFilterChange }: StatusSummaryProps) {
  const healthy = endpoints.filter((e) => e.status === "healthy").length;
  const failing = endpoints.filter((e) => e.status === "failing").length;
  const unknown = endpoints.filter((e) => e.status === "unknown").length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      <SummaryCard icon={Activity} label="Total" value={endpoints.length} color="text-blue-500" active={activeFilter === "all"} onClick={() => onFilterChange("all")} />
      <SummaryCard icon={CheckCircle2} label="Healthy" value={healthy} color="text-green-500" active={activeFilter === "healthy"} onClick={() => onFilterChange("healthy")} />
      <SummaryCard icon={XCircle} label="Failing" value={failing} color="text-red-500" active={activeFilter === "failing"} onClick={() => onFilterChange("failing")} />
      <SummaryCard icon={HelpCircle} label="Unknown" value={unknown} color="text-gray-400" active={activeFilter === "unknown"} onClick={() => onFilterChange("unknown")} />
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  color,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border p-4 bg-card cursor-pointer transition-all ${active ? "ring-2 ring-primary border-primary" : "hover:border-muted-foreground/40"}`}
      onClick={onClick}
    >
      <Icon className={`h-8 w-8 ${color}`} />
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
