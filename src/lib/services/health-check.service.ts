import { prisma } from "@/lib/db";

const TIMEOUT_MS = 30000;

export interface HealthCheckOutcome {
  isSuccess: boolean;
  statusCode: number | null;
  responseTime: number;
  errorMessage: string | null;
}

export async function performHealthCheck(endpoint: {
  id: string;
  url: string;
  method: string;
  headers: string;
  body: string | null;
}): Promise<HealthCheckOutcome> {
  const start = performance.now();
  try {
    const headers: Record<string, string> = JSON.parse(endpoint.headers || "{}");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const init: RequestInit = {
      method: endpoint.method,
      headers,
      signal: controller.signal,
    };

    if (endpoint.body && !["GET", "HEAD"].includes(endpoint.method.toUpperCase())) {
      init.body = endpoint.body;
    }

    const response = await fetch(endpoint.url, init);
    clearTimeout(timeoutId);

    const responseTime = performance.now() - start;
    const isSuccess = response.status >= 200 && response.status < 400;

    return {
      isSuccess,
      statusCode: response.status,
      responseTime,
      errorMessage: isSuccess ? null : `HTTP ${response.status} ${response.statusText}`,
    };
  } catch (error) {
    const responseTime = performance.now() - start;
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      isSuccess: false,
      statusCode: null,
      responseTime,
      errorMessage: message.includes("abort") ? "Request timed out" : message,
    };
  }
}

export async function executeHealthCheck(endpointId: string): Promise<HealthCheckOutcome> {
  const endpoint = await prisma.aPIEndpoint.findUnique({ where: { id: endpointId } });
  if (!endpoint) throw new Error("Endpoint not found");

  const outcome = await performHealthCheck(endpoint);

  await prisma.healthCheckResult.create({
    data: {
      endpointId: endpoint.id,
      isSuccess: outcome.isSuccess,
      statusCode: outcome.statusCode,
      responseTime: outcome.responseTime,
      errorMessage: outcome.errorMessage,
    },
  });

  await prisma.aPIEndpoint.update({
    where: { id: endpoint.id },
    data: { lastCheckedAt: new Date() },
  });

  return outcome;
}
