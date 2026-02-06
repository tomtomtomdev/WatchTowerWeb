import { prisma } from "@/lib/db";
import { performHealthCheck } from "./health-check.service";

export async function getDueEndpoints() {
  const endpoints = await prisma.aPIEndpoint.findMany({
    where: { isEnabled: true },
  });

  const now = Date.now();
  return endpoints.filter((ep) => {
    if (!ep.lastCheckedAt) return true;
    const elapsed = (now - ep.lastCheckedAt.getTime()) / 1000;
    return elapsed >= ep.pollingInterval;
  });
}

export async function runScheduledChecks() {
  const dueEndpoints = await getDueEndpoints();
  if (dueEndpoints.length === 0) return { checked: 0 };

  const results = [];
  for (const endpoint of dueEndpoints) {
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

    results.push({ endpointId: endpoint.id, ...outcome });
  }

  return { checked: results.length, results };
}
