"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { HealthCheckResultData } from "@/lib/types";

interface CheckHistoryTableProps {
  results: HealthCheckResultData[];
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function CheckHistoryTable({ results, page, totalPages, onPageChange }: CheckHistoryTableProps) {
  if (results.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border rounded-lg">
        No check history available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Response Time</TableHead>
              <TableHead>Error</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-sm">
                  {new Date(r.timestamp).toLocaleString()}
                </TableCell>
                <TableCell>
                  <Badge variant={r.isSuccess ? "default" : "destructive"}>
                    {r.isSuccess ? "OK" : "FAIL"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{r.statusCode ?? "-"}</TableCell>
                <TableCell className="text-sm">{Math.round(r.responseTime)}ms</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                  {r.errorMessage || "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
