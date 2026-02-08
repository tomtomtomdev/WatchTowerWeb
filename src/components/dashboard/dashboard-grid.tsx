"use client";

import { useState } from "react";
import { StatusCard } from "./status-card";
import { StatusSummary, type StatusFilter } from "./status-summary";
import { Radio, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { EndpointWithStatus } from "@/lib/types";

interface DashboardGridProps {
  endpoints: EndpointWithStatus[];
}

export function DashboardGrid({ endpoints }: DashboardGridProps) {
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = endpoints
    .filter((e) => filter === "all" || e.status === filter)
    .filter((e) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return e.name.toLowerCase().includes(q) || e.url.toLowerCase().includes(q);
    });

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
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or URL..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((ep) => (
          <StatusCard key={ep.id} endpoint={ep} allIds={allIds} />
        ))}
      </div>
    </div>
  );
}
