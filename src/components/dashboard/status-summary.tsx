"use client";

import { CheckCircle2, XCircle, HelpCircle, Activity } from "lucide-react";
import type { EndpointWithStatus } from "@/lib/types";

interface StatusSummaryProps {
  endpoints: EndpointWithStatus[];
}

export function StatusSummary({ endpoints }: StatusSummaryProps) {
  const healthy = endpoints.filter((e) => e.status === "healthy").length;
  const failing = endpoints.filter((e) => e.status === "failing").length;
  const unknown = endpoints.filter((e) => e.status === "unknown").length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      <SummaryCard icon={Activity} label="Total" value={endpoints.length} color="text-blue-500" />
      <SummaryCard icon={CheckCircle2} label="Healthy" value={healthy} color="text-green-500" />
      <SummaryCard icon={XCircle} label="Failing" value={failing} color="text-red-500" />
      <SummaryCard icon={HelpCircle} label="Unknown" value={unknown} color="text-gray-400" />
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-4 bg-card">
      <Icon className={`h-8 w-8 ${color}`} />
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
