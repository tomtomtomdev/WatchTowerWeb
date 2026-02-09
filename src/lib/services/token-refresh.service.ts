import { prisma } from "@/lib/db";
import { performHealthCheck, HealthCheckOutcome } from "./health-check.service";
import { detectTokenExpiration } from "@/lib/utils/token-detection";
import { extractTokenFromResponse } from "@/lib/utils/jsonpath";
import { performApplyCodeLogin } from "./apply-code-login";

const REFRESH_COOLDOWN_MS = 60_000;

export interface TokenRefreshOutcome extends HealthCheckOutcome {
  isTokenExpired: boolean;
  wasTokenRefreshed: boolean;
}

export async function performHealthCheckWithRefresh(endpoint: {
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
}): Promise<TokenRefreshOutcome> {
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

  // Save new token (and userId if available from apply-code login)
  await prisma.aPIEndpoint.update({
    where: { id: endpoint.id },
    data: {
      cachedToken: newToken,
      ...(newUserId ? { cachedUserId: newUserId } : {}),
      tokenRefreshedAt: new Date()
    },
  });

  console.log(`[token-refresh] Saved accessToken: ${newToken.slice(0, 20)}...`);
  if (newUserId) {
    console.log(`[token-refresh] Saved userId: ${newUserId}`);
  }

  // Retry original request with new token
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
