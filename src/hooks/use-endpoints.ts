"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { EndpointWithStatus } from "@/lib/types";

const POLL_INTERVAL = 5000;

export function useEndpoints() {
  const [endpoints, setEndpoints] = useState<EndpointWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const previousRef = useRef<Map<string, string>>(new Map());

  const fetchEndpoints = useCallback(async () => {
    try {
      const res = await fetch("/api/endpoints");
      if (!res.ok) throw new Error("Failed to fetch endpoints");
      const data: EndpointWithStatus[] = await res.json();

      // Detect status transitions for notifications
      const transitions: Array<{ name: string; from: string; to: string }> = [];
      const prev = previousRef.current;
      for (const ep of data) {
        const oldStatus = prev.get(ep.id);
        if (oldStatus && oldStatus !== ep.status && ep.status !== "unknown") {
          transitions.push({ name: ep.name, from: oldStatus, to: ep.status });
        }
      }

      // Update previous status map
      const newMap = new Map<string, string>();
      for (const ep of data) {
        newMap.set(ep.id, ep.status);
      }
      previousRef.current = newMap;

      setEndpoints(data);
      setError(null);

      // Fire notifications for transitions
      if (transitions.length > 0 && typeof window !== "undefined" && Notification.permission === "granted") {
        for (const t of transitions) {
          if (t.to === "failing") {
            new Notification(`${t.name} is down`, {
              body: "Endpoint health check failed",
              icon: "/favicon.ico",
            });
          } else if (t.to === "healthy" && t.from === "failing") {
            new Notification(`${t.name} recovered`, {
              body: "Endpoint is healthy again",
              icon: "/favicon.ico",
            });
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEndpoints();
    const interval = setInterval(fetchEndpoints, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchEndpoints]);

  return { endpoints, loading, error, refetch: fetchEndpoints };
}
