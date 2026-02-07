import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const CHECK_INTERVAL = 60_000; // 60 seconds
const TIMEOUT_MS = 30_000;

async function performHealthCheck(endpoint: {
  id: string;
  url: string;
  method: string;
  headers: string;
  body: string | null;
}) {
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

    let responseBody: string | null = null;
    try {
      const text = await response.text();
      responseBody = text.slice(0, 50000);
    } catch {
      // ignore body read errors
    }

    return {
      isSuccess,
      statusCode: response.status,
      responseTime,
      errorMessage: isSuccess ? null : `HTTP ${response.status} ${response.statusText}`,
      responseBody,
    };
  } catch (error) {
    const responseTime = performance.now() - start;
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      isSuccess: false,
      statusCode: null,
      responseTime,
      errorMessage: message.includes("abort") ? "Request timed out" : message,
      responseBody: null,
    };
  }
}

async function runScheduledChecks() {
  const endpoints = await prisma.aPIEndpoint.findMany({
    where: { isEnabled: true },
  });

  const now = Date.now();
  const due = endpoints.filter((ep) => {
    if (!ep.lastCheckedAt) return true;
    const elapsed = (now - ep.lastCheckedAt.getTime()) / 1000;
    return elapsed >= ep.pollingInterval;
  });

  if (due.length === 0) return;

  console.log(`[worker] Checking ${due.length} endpoint(s)...`);

  for (const endpoint of due) {
    try {
      const outcome = await performHealthCheck(endpoint);

      await prisma.healthCheckResult.create({
        data: {
          endpointId: endpoint.id,
          isSuccess: outcome.isSuccess,
          statusCode: outcome.statusCode,
          responseTime: outcome.responseTime,
          errorMessage: outcome.errorMessage,
          responseBody: outcome.responseBody,
        },
      });

      await prisma.aPIEndpoint.update({
        where: { id: endpoint.id },
        data: { lastCheckedAt: new Date() },
      });

      const status = outcome.isSuccess ? "✓" : "✗";
      console.log(
        `[worker] ${status} ${endpoint.name} - ${outcome.statusCode ?? "ERR"} (${Math.round(outcome.responseTime)}ms)`
      );
    } catch (error) {
      console.error(`[worker] Error checking ${endpoint.name}:`, error);
    }
  }
}

async function main() {
  console.log("[worker] WatchTower background worker started");
  console.log(`[worker] Checking every ${CHECK_INTERVAL / 1000}s`);

  // Initial check
  await runScheduledChecks();

  // Recurring loop
  setInterval(async () => {
    try {
      await runScheduledChecks();
    } catch (error) {
      console.error("[worker] Scheduler error:", error);
    }
  }, CHECK_INTERVAL);
}

main().catch(console.error);
