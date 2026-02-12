import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { performHealthCheckWithRefresh } from "./src/lib/services/token-refresh.service";

const prisma = new PrismaClient();
const CHECK_INTERVAL = 60_000; // 60 seconds

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
