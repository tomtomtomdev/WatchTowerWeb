import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/endpoints/[id]/results - Get check history
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const offset = parseInt(searchParams.get("offset") || "0");

    const endpoint = await prisma.aPIEndpoint.findUnique({ where: { id } });
    if (!endpoint) {
      return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
    }

    const [results, total] = await Promise.all([
      prisma.healthCheckResult.findMany({
        where: { endpointId: id },
        orderBy: { timestamp: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.healthCheckResult.count({ where: { endpointId: id } }),
    ]);

    return NextResponse.json({
      results: results.map((r) => ({
        id: r.id,
        endpointId: r.endpointId,
        timestamp: r.timestamp.toISOString(),
        isSuccess: r.isSuccess,
        statusCode: r.statusCode,
        responseTime: r.responseTime,
        errorMessage: r.errorMessage,
        responseBody: r.responseBody,
      })),
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("GET /api/endpoints/[id]/results error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
