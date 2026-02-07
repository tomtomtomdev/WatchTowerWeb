"use client";

import { useState } from "react";
import { StatusCard } from "./status-card";
import { StatusSummary, type StatusFilter } from "./status-summary";
import { Radio } from "lucide-react";
import type { EndpointWithStatus } from "@/lib/types";

interface DashboardGridProps {
  endpoints: EndpointWithStatus[];
}

export function DashboardGrid({ endpoints }: DashboardGridProps) {
  const [filter, setFilter] = useState<StatusFilter>("all");

  const filtered = filter === "all"
    ? endpoints
    : endpoints.filter((e) => e.status === filter);

  const allIds = filtered.map((e) => e.id);

  if (endpoints.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Radio className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold mb-2">No endpoints yet</h2>
        <p className="text-muted-foreground max-w-md">
          Add your first API endpoint to start monitoring. You can add endpoints manually,
          import from cURL commands, or upload a Postman collection.
        </p>
      </div>
    );
  }

  return (
    <div>
      <StatusSummary endpoints={endpoints} activeFilter={filter} onFilterChange={setFilter} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((ep) => (
          <StatusCard key={ep.id} endpoint={ep} allIds={allIds} />
        ))}
      </div>
    </div>
  );
}
