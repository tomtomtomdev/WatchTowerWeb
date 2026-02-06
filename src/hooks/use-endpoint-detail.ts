"use client";

import { useState, useEffect, useCallback } from "react";
import type { EndpointWithStatus, HealthCheckResultData } from "@/lib/types";

const POLL_INTERVAL = 5000;

export function useEndpointDetail(id: string) {
  const [endpoint, setEndpoint] = useState<EndpointWithStatus | null>(null);
  const [results, setResults] = useState<HealthCheckResultData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const limit = 20;

  const fetchEndpoint = useCallback(async () => {
    try {
      const res = await fetch(`/api/endpoints/${id}`);
      if (!res.ok) throw new Error("Failed to fetch endpoint");
      const data = await res.json();
      setEndpoint(data);
    } catch {
      // ignore
    }
  }, [id]);

  const fetchResults = useCallback(async () => {
    try {
      const res = await fetch(`/api/endpoints/${id}/results?limit=${limit}&offset=${page * limit}`);
      if (!res.ok) throw new Error("Failed to fetch results");
      const data = await res.json();
      setResults(data.results);
      setTotal(data.total);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [id, page]);

  useEffect(() => {
    fetchEndpoint();
    fetchResults();
    const interval = setInterval(() => {
      fetchEndpoint();
      fetchResults();
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchEndpoint, fetchResults]);

  return {
    endpoint,
    results,
    total,
    loading,
    page,
    setPage,
    totalPages: Math.ceil(total / limit),
    refetch: () => {
      fetchEndpoint();
      fetchResults();
    },
  };
}
