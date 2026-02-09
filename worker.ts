import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { detectTokenExpiration } from "./src/lib/utils/token-detection";
import { extractTokenFromResponse } from "./src/lib/utils/jsonpath";
import { performApplyCodeLogin } from "./src/lib/services/apply-code-login";

const prisma = new PrismaClient();
const CHECK_INTERVAL = 60_000; // 60 seconds
const TIMEOUT_MS = 30_000;
const REFRESH_COOLDOWN_MS = 60_000;

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

async function performHealthCheckWithRefresh(endpoint: {
  id: string;
  url: string;
  method: string;
  headers: string;
  body: string | null;
  loginEndpointId: string | null;
  tokenJsonPath: string | null;
  cachedToken: string | null;
  cachedUserId: string | null;
  tokenRefreshedAt: Date | null;
  useApplyCodeLogin: boolean;
}) {
  // Merge cached token into headers
  const headersObj: Record<string, string> = JSON.parse(endpoint.headers || "{}");
  if (endpoint.cachedToken && !headersObj["Authorization"]) {
    headersObj["Authorization"] = `Bearer ${endpoint.cachedToken}`;
  }

  // Substitute {{accessToken}} and {{userId}} in body
  let body = endpoint.body;
  if (body && endpoint.cachedToken) {
    body = body.replace(/\{\{accessToken\}\}/g, endpoint.cachedToken);
  }
  if (body && endpoint.cachedUserId) {
    body = body.replace(/\{\{userId\}\}/g, endpoint.cachedUserId);
  }

  const endpointWithToken = { ...endpoint, headers: JSON.stringify(headersObj), body };

  const outcome = await performHealthCheck(endpointWithToken);
  const isTokenExpired = detectTokenExpiration(outcome.responseBody, outcome.statusCode);

  if (!isTokenExpired) {
    return { ...outcome, isTokenExpired, wasTokenRefreshed: false };
  }

  // Must have either loginEndpointId+tokenJsonPath or useApplyCodeLogin
  if (!endpoint.useApplyCodeLogin && (!endpoint.loginEndpointId || !endpoint.tokenJsonPath)) {
    return { ...outcome, isTokenExpired, wasTokenRefreshed: false };
  }

  // Cooldown check
  if (endpoint.tokenRefreshedAt) {
    const elapsed = Date.now() - endpoint.tokenRefreshedAt.getTime();
    if (elapsed < REFRESH_COOLDOWN_MS) {
      return { ...outcome, isTokenExpired, wasTokenRefreshed: false };
    }
  }

  let newToken: string | null = null;

  let newUserId: string | null = null;

  if (endpoint.useApplyCodeLogin) {
    // Apply-code login flow
    const loginResult = await performApplyCodeLogin();
    if (loginResult) {
      newToken = loginResult.accessToken;
      newUserId = loginResult.userId || null;
    }
  } else {
    // Existing login endpoint flow
    const loginEndpoint = await prisma.aPIEndpoint.findUnique({
      where: { id: endpoint.loginEndpointId! },
    });
    if (!loginEndpoint) {
      return { ...outcome, isTokenExpired, wasTokenRefreshed: false };
    }

    const loginOutcome = await performHealthCheck(loginEndpoint);
    if (!loginOutcome.isSuccess || !loginOutcome.responseBody) {
      return { ...outcome, isTokenExpired, wasTokenRefreshed: false };
    }

    newToken = extractTokenFromResponse(loginOutcome.responseBody, endpoint.tokenJsonPath!);
  }

  if (!newToken) {
    return { ...outcome, isTokenExpired, wasTokenRefreshed: false };
  }

  await prisma.aPIEndpoint.update({
    where: { id: endpoint.id },
    data: { cachedToken: newToken, ...(newUserId ? { cachedUserId: newUserId } : {}), tokenRefreshedAt: new Date() },
  });

  headersObj["Authorization"] = `Bearer ${newToken}`;
  let retryBody = endpoint.body;
  if (retryBody && newToken) {
    retryBody = retryBody.replace(/\{\{accessToken\}\}/g, newToken);
  }
  const resolvedUserId = newUserId || endpoint.cachedUserId;
  if (retryBody && resolvedUserId) {
    retryBody = retryBody.replace(/\{\{userId\}\}/g, resolvedUserId);
  }
  const retryEndpoint = { ...endpoint, headers: JSON.stringify(headersObj), body: retryBody };
  const retryOutcome = await performHealthCheck(retryEndpoint);

  return { ...retryOutcome, isTokenExpired: false, wasTokenRefreshed: true };
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
      const outcome = await performHealthCheckWithRefresh(endpoint);

      await prisma.healthCheckResult.create({
        data: {
          endpointId: endpoint.id,
          isSuccess: outcome.isSuccess,
          isTokenExpired: outcome.isTokenExpired,
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
      const refreshFlag = outcome.wasTokenRefreshed ? " [token-refreshed]" : "";
      console.log(
        `[worker] ${status} ${endpoint.name} - ${outcome.statusCode ?? "ERR"} (${Math.round(outcome.responseTime)}ms)${refreshFlag}`
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
