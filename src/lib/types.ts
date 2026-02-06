export const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];

export const POLLING_INTERVALS = [
  { label: "5 minutes", value: 300 },
  { label: "15 minutes", value: 900 },
  { label: "1 hour", value: 3600 },
  { label: "12 hours", value: 43200 },
  { label: "24 hours", value: 86400 },
] as const;

export type EndpointStatus = "healthy" | "failing" | "unknown" | "checking";

export interface EndpointWithStatus {
  id: string;
  name: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  pollingInterval: number;
  isEnabled: boolean;
  lastCheckedAt: string | null;
  createdAt: string;
  updatedAt: string;
  status: EndpointStatus;
  lastResponseTime: number | null;
  lastStatusCode: number | null;
}

export interface HealthCheckResultData {
  id: string;
  endpointId: string;
  timestamp: string;
  isSuccess: boolean;
  statusCode: number | null;
  responseTime: number;
  errorMessage: string | null;
}

export interface ParsedCurlCommand {
  url: string;
  method: HttpMethod;
  headers: Record<string, string>;
  body: string | null;
  name: string;
}

export interface ParsedPostmanRequest {
  name: string;
  url: string;
  method: HttpMethod;
  headers: Record<string, string>;
  body: string | null;
}

export type BulkAction = "check" | "enable" | "disable" | "delete";
