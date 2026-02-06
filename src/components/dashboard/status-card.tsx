"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  cn,
  statusBorderColor,
  statusBgColor,
  statusLabel,
  formatResponseTime,
  formatRelativeTime,
  methodColor,
} from "@/lib/utils";
import type { EndpointWithStatus } from "@/lib/types";
import { useSelection } from "@/hooks/use-selection";

interface StatusCardProps {
  endpoint: EndpointWithStatus;
  allIds: string[];
}

export function StatusCard({ endpoint, allIds }: StatusCardProps) {
  const router = useRouter();
  const { isSelected, toggleWithShift } = useSelection();
  const selected = isSelected(endpoint.id);

  return (
    <Card
      className={cn(
        "relative cursor-pointer border-l-4 transition-all hover:shadow-md",
        statusBorderColor(endpoint.status),
        selected && "ring-2 ring-primary"
      )}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey) {
          e.preventDefault();
          toggleWithShift(endpoint.id, allIds, e.shiftKey);
        } else {
          router.push(`/endpoints/${endpoint.id}`);
        }
      }}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Checkbox
              checked={selected}
              onClick={(e) => e.stopPropagation()}
              onCheckedChange={() => toggleWithShift(endpoint.id, allIds, false)}
              className="shrink-0"
            />
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{endpoint.name}</p>
              <p className="text-xs text-muted-foreground truncate">{endpoint.url}</p>
            </div>
          </div>
          <Badge className={cn("text-xs shrink-0", methodColor(endpoint.method))}>
            {endpoint.method}
          </Badge>
        </div>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", statusBgColor(endpoint.status))} />
            <span className="text-xs font-medium">{statusLabel(endpoint.status)}</span>
          </div>
          <div className="text-xs text-muted-foreground text-right">
            <div>{formatResponseTime(endpoint.lastResponseTime)}</div>
            <div>{formatRelativeTime(endpoint.lastCheckedAt)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
