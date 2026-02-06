"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { X, Play, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import type { BulkAction } from "@/lib/types";

interface BulkActionBarProps {
  selectedCount: number;
  selectedIds: string[];
  onComplete: () => void;
}

export function BulkActionBar({ selectedCount, selectedIds, onComplete }: BulkActionBarProps) {
  const [loading, setLoading] = useState(false);

  const executeBulk = async (action: BulkAction) => {
    if (action === "delete" && !confirm(`Delete ${selectedCount} endpoint(s)?`)) return;

    setLoading(true);
    try {
      const res = await fetch("/api/endpoints/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids: selectedIds }),
      });
      if (!res.ok) throw new Error("Bulk action failed");
      toast({ title: "Bulk action completed", description: `${action} applied to ${selectedCount} endpoint(s)` });
      onComplete();
    } catch {
      toast({ title: "Error", description: "Bulk action failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-lg border bg-background p-3 shadow-lg">
      <span className="text-sm font-medium px-2">{selectedCount} selected</span>
      <Button size="sm" variant="outline" onClick={() => executeBulk("check")} disabled={loading}>
        <Play className="h-4 w-4 mr-1" /> Check
      </Button>
      <Button size="sm" variant="outline" onClick={() => executeBulk("enable")} disabled={loading}>
        <ToggleRight className="h-4 w-4 mr-1" /> Enable
      </Button>
      <Button size="sm" variant="outline" onClick={() => executeBulk("disable")} disabled={loading}>
        <ToggleLeft className="h-4 w-4 mr-1" /> Disable
      </Button>
      <Button size="sm" variant="destructive" onClick={() => executeBulk("delete")} disabled={loading}>
        <Trash2 className="h-4 w-4 mr-1" /> Delete
      </Button>
      <Button size="sm" variant="ghost" onClick={onComplete}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
