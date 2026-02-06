"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Play, Trash2, ToggleLeft, ToggleRight, Loader2 } from "lucide-react";
import type { EndpointWithStatus } from "@/lib/types";

interface EndpointActionsProps {
  endpoint: EndpointWithStatus;
  isChecking: boolean;
  onCheck: () => void;
  onRefetch: () => void;
}

export function EndpointActions({ endpoint, isChecking, onCheck, onRefetch }: EndpointActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const toggleEnabled = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/endpoints/${endpoint.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled: !endpoint.isEnabled }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast({
        title: endpoint.isEnabled ? "Endpoint disabled" : "Endpoint enabled",
        description: endpoint.name,
      });
      onRefetch();
    } catch {
      toast({ title: "Error", description: "Failed to update endpoint", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${endpoint.name}"? This cannot be undone.`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/endpoints/${endpoint.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast({ title: "Endpoint deleted", description: endpoint.name });
      router.push("/");
    } catch {
      toast({ title: "Error", description: "Failed to delete endpoint", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={onCheck} disabled={isChecking} size="sm">
        {isChecking ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
        Check Now
      </Button>
      <Button onClick={toggleEnabled} variant="outline" size="sm" disabled={loading}>
        {endpoint.isEnabled ? (
          <><ToggleLeft className="h-4 w-4 mr-1" /> Disable</>
        ) : (
          <><ToggleRight className="h-4 w-4 mr-1" /> Enable</>
        )}
      </Button>
      <Button onClick={handleDelete} variant="destructive" size="sm" disabled={loading}>
        <Trash2 className="h-4 w-4 mr-1" /> Delete
      </Button>
    </div>
  );
}
