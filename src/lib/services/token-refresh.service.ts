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

/**
 * Load the global accessToken/userId from Settings as fallback.
 * Per-endpoint cachedToken takes priority; Settings values are used when
 * the endpoint has no token of its own.
 */
async function getGlobalToken(): Promise<{ accessToken: string | null; userId: string | null }> {
  try {
    const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
    return {
      accessToken: settings?.cachedAccessToken ?? null,
      userId: settings?.cachedUserId ?? null,
    };
  } catch {
    return { accessToken: null, userId: null };
  }
}

/**
 * Replace known auth-related keys in a JSON body string with fresh values.
 * Handles both `"accessToken":"<old>"` and `"userId":"<old>"` patterns,
 * as well as `{{accessToken}}` / `{{userId}}` placeholders.
 */
function injectTokenIntoBody(body: string | null, token: string | null, userId: string | null): string | null {
  if (!body) return body;

  let result = body;

  if (token) {
    // Replace {{accessToken}} placeholder
    result = result.replace(/\{\{accessToken\}\}/g, token);
    // Replace JSON value: "accessToken":"<anything>"
    result = result.replace(/("accessToken"\s*:\s*)"[^"]*"/g, `$1"${token}"`);
    // Replace form-urlencoded: accessToken=<value>
    result = result.replace(/(^|&)(accessToken)=([^&]*)/, `$1$2=${encodeURIComponent(token)}`);
  }
  if (userId) {
    // Replace {{userId}} placeholder
    result = result.replace(/\{\{userId\}\}/g, userId);
    // Replace JSON value: "userId":"<anything>"
    result = result.replace(/("userId"\s*:\s*)"[^"]*"/g, `$1"${userId}"`);
    // Replace form-urlencoded: userId=<value>
    result = result.replace(/(^|&)(userId)=([^&]*)/, `$1$2=${encodeURIComponent(userId)}`);
  }

  return result;
}

/**
 * Replace accessToken/userId in URL query parameters.
 */
function injectTokenIntoUrl(url: string, token: string | null, userId: string | null): string {
  try {
    const parsed = new URL(url);
    let changed = false;
    if (token && parsed.searchParams.has("accessToken")) {
      parsed.searchParams.set("accessToken", token);
      changed = true;
    }
    if (userId && parsed.searchParams.has("userId")) {
      parsed.searchParams.set("userId", userId);
      changed = true;
    }
    return changed ? parsed.toString() : url;
  } catch {
    return url;
  }
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
  // Resolve token: per-endpoint first, then global Settings
  const global = await getGlobalToken();
  const resolvedToken = endpoint.cachedToken || global.accessToken;
  const resolvedUserId = endpoint.cachedUserId || global.userId;

  // Merge token into Authorization header
  const headersObj: Record<string, string> = JSON.parse(endpoint.headers || "{}");
  if (resolvedToken && !headersObj["Authorization"]) {
    headersObj["Authorization"] = `Bearer ${resolvedToken}`;
  }

  // Inject token/userId into body (placeholders + JSON values)
  const body = injectTokenIntoBody(endpoint.body, resolvedToken, resolvedUserId);

  // Inject token/userId into URL query params
  const url = injectTokenIntoUrl(endpoint.url, resolvedToken, resolvedUserId);

  const endpointWithToken = { ...endpoint, url, headers: JSON.stringify(headersObj), body };

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
  const retryUserId = newUserId || endpoint.cachedUserId || global.userId;
  const retryBody = injectTokenIntoBody(endpoint.body, newToken, retryUserId);
  const retryUrl = injectTokenIntoUrl(endpoint.url, newToken, retryUserId);
  const retryEndpoint = { ...endpoint, url: retryUrl, headers: JSON.stringify(headersObj), body: retryBody };
  const retryOutcome = await performHealthCheck(retryEndpoint);

  return { ...retryOutcome, isTokenExpired: false, wasTokenRefreshed: true };
}
