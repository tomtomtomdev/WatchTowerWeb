"use client";

import { useRouter } from "next/navigation";
import { useEndpointDetail } from "@/hooks/use-endpoint-detail";
import { useHealthCheck } from "@/hooks/use-health-check";
import { ResponseTimeChart } from "./response-time-chart";
import { CheckHistoryTable } from "./check-history-table";
import { EndpointActions } from "./endpoint-actions";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  cn,
  statusBgColor,
  statusLabel,
  formatResponseTime,
  formatRelativeTime,
  formatPollingInterval,
  methodColor,
} from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EndpointDetailProps {
  id: string;
}

export function EndpointDetail({ id }: EndpointDetailProps) {
  const router = useRouter();
  const { endpoint, results, total, loading, page, setPage, totalPages, refetch } = useEndpointDetail(id);
  const { checking, triggerCheck } = useHealthCheck();

  if (loading && !endpoint) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!endpoint) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Endpoint not found</p>
        <Button variant="link" onClick={() => router.push("/")}>Back to dashboard</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold truncate">{endpoint.name}</h1>
            <Badge className={cn(methodColor(endpoint.method))}>{endpoint.method}</Badge>
            <div className="flex items-center gap-1.5">
              <span className={cn("h-2.5 w-2.5 rounded-full", statusBgColor(endpoint.status))} />
              <span className="text-sm font-medium">{statusLabel(endpoint.status)}</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground truncate mt-1">{endpoint.url}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <InfoCard label="Response Time" value={formatResponseTime(endpoint.lastResponseTime)} />
        <InfoCard label="Last Checked" value={formatRelativeTime(endpoint.lastCheckedAt)} />
        <InfoCard label="Polling Interval" value={formatPollingInterval(endpoint.pollingInterval)} />
        <InfoCard label="Status Code" value={endpoint.lastStatusCode?.toString() || "-"} />
      </div>

      <EndpointActions
        endpoint={endpoint}
        isChecking={checking.has(endpoint.id)}
        onCheck={() => triggerCheck(endpoint.id, endpoint.name).then(refetch)}
        onRefetch={refetch}
      />

      <Separator />

      <div>
        <h2 className="text-lg font-semibold mb-4">Response Time</h2>
        <ResponseTimeChart results={results} />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Check History ({total})</h2>
        <CheckHistoryTable
          results={results}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>

      <Separator />
      {endpoint.body && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Request Body</h2>
          <ResponseBodyViewer body={endpoint.body} />
        </div>
      )}
      <div>
        <h2 className="text-lg font-semibold mb-4">Latest Response</h2>
        {endpoint.lastResponseBody !== null ? (
          <ResponseBodyViewer body={endpoint.lastResponseBody} />
        ) : (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            <p>No response data yet.</p>
            <p className="text-sm mt-1">Click &ldquo;Check Now&rdquo; above to run a health check.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3 bg-card">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold mt-0.5">{value}</p>
    </div>
  );
}

function ResponseBodyViewer({ body }: { body: string }) {
  let formatted = body;
  let isJson = false;
  try {
    const parsed = JSON.parse(body);
    formatted = JSON.stringify(parsed, null, 2);
    isJson = true;
  } catch {
    // not JSON, show as-is
  }

  return (
    <div className="rounded-lg border bg-muted/50 overflow-hidden">
      {isJson && (
        <div className="px-4 py-2 border-b bg-muted">
          <span className="text-xs font-medium text-muted-foreground">JSON</span>
        </div>
      )}
      <pre className="p-4 text-sm overflow-x-auto max-h-96 overflow-y-auto whitespace-pre-wrap break-all">
        <code>{formatted}</code>
      </pre>
    </div>
  );
}
