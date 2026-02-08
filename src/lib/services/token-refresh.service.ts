import { prisma } from "@/lib/db";
import { performHealthCheck, HealthCheckOutcome } from "./health-check.service";
import { detectTokenExpiration } from "@/lib/utils/token-detection";
import { extractTokenFromResponse } from "@/lib/utils/jsonpath";

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
  tokenRefreshedAt: Date | null;
}): Promise<TokenRefreshOutcome> {
  // Merge cached token into headers
  const headersObj: Record<string, string> = JSON.parse(endpoint.headers || "{}");
  if (endpoint.cachedToken && !headersObj["Authorization"]) {
    headersObj["Authorization"] = `Bearer ${endpoint.cachedToken}`;
  }
  const endpointWithToken = { ...endpoint, headers: JSON.stringify(headersObj) };

  const outcome = await performHealthCheck(endpointWithToken);
  const isTokenExpired = detectTokenExpiration(outcome.responseBody, outcome.statusCode);

  if (!isTokenExpired || !endpoint.loginEndpointId || !endpoint.tokenJsonPath) {
    return { ...outcome, isTokenExpired, wasTokenRefreshed: false };
  }

  // Cooldown check
  if (endpoint.tokenRefreshedAt) {
    const elapsed = Date.now() - endpoint.tokenRefreshedAt.getTime();
    if (elapsed < REFRESH_COOLDOWN_MS) {
      return { ...outcome, isTokenExpired, wasTokenRefreshed: false };
    }
  }

  // Fetch login endpoint and execute it
  const loginEndpoint = await prisma.aPIEndpoint.findUnique({
    where: { id: endpoint.loginEndpointId },
  });
  if (!loginEndpoint) {
    return { ...outcome, isTokenExpired, wasTokenRefreshed: false };
  }

  const loginOutcome = await performHealthCheck(loginEndpoint);
  if (!loginOutcome.isSuccess || !loginOutcome.responseBody) {
    return { ...outcome, isTokenExpired, wasTokenRefreshed: false };
  }

  const newToken = extractTokenFromResponse(loginOutcome.responseBody, endpoint.tokenJsonPath);
  if (!newToken) {
    return { ...outcome, isTokenExpired, wasTokenRefreshed: false };
  }

  // Save new token
  await prisma.aPIEndpoint.update({
    where: { id: endpoint.id },
    data: { cachedToken: newToken, tokenRefreshedAt: new Date() },
  });

  // Retry original request with new token
  headersObj["Authorization"] = `Bearer ${newToken}`;
  const retryEndpoint = { ...endpoint, headers: JSON.stringify(headersObj) };
  const retryOutcome = await performHealthCheck(retryEndpoint);

  return { ...retryOutcome, isTokenExpired: false, wasTokenRefreshed: true };
}
