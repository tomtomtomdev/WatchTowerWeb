"use client";

import { useState } from "react";
import { toast } from "@/hooks/use-toast";

export function useHealthCheck() {
  const [checking, setChecking] = useState<Set<string>>(new Set());

  const triggerCheck = async (id: string, name?: string) => {
    setChecking((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/endpoints/${id}/check`, { method: "POST" });
      if (!res.ok) throw new Error("Check failed");
      const result = await res.json();
      toast({
        title: result.isSuccess ? "Health check passed" : "Health check failed",
        description: name ? `${name}: ${result.isSuccess ? "Healthy" : result.errorMessage || "Failed"}` : undefined,
        variant: result.isSuccess ? "default" : "destructive",
      });
      return result;
    } catch {
      toast({ title: "Health check error", description: "Could not reach the endpoint", variant: "destructive" });
      return null;
    } finally {
      setChecking((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  return { checking, triggerCheck };
}
