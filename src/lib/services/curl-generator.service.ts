import type { EndpointWithStatus } from "@/lib/types";

export function generateCurl(endpoint: EndpointWithStatus): string {
  const parts: string[] = ["curl"];

  if (endpoint.method !== "GET") {
    parts.push(`-X ${endpoint.method}`);
  }

  for (const [key, value] of Object.entries(endpoint.headers ?? {})) {
    parts.push(`-H '${key}: ${value}'`);
  }

  if (endpoint.body) {
    parts.push(`-d '${endpoint.body}'`);
  }

  parts.push(`'${endpoint.url}'`);

  return parts.join(" \\\n  ");
}
