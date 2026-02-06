import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isValidUrl } from "@/lib/utils";
import { HTTP_METHODS } from "@/lib/types";

// GET /api/endpoints/[id]
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const endpoint = await prisma.aPIEndpoint.findUnique({
      where: { id },
      include: {
        healthCheckResults: {
          orderBy: { timestamp: "desc" },
          take: 1,
        },
      },
    });

    if (!endpoint) {
      return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
    }

    const lastResult = endpoint.healthCheckResults[0] || null;
    let status = "unknown";
    if (endpoint.isEnabled && lastResult) {
      status = lastResult.isSuccess ? "healthy" : "failing";
    }

    return NextResponse.json({
      id: endpoint.id,
      name: endpoint.name,
      url: endpoint.url,
      method: endpoint.method,
      headers: JSON.parse(endpoint.headers),
      body: endpoint.body,
      pollingInterval: endpoint.pollingInterval,
      isEnabled: endpoint.isEnabled,
      lastCheckedAt: endpoint.lastCheckedAt?.toISOString() || null,
      createdAt: endpoint.createdAt.toISOString(),
      updatedAt: endpoint.updatedAt.toISOString(),
      status,
      lastResponseTime: lastResult?.responseTime ?? null,
      lastStatusCode: lastResult?.statusCode ?? null,
    });
  } catch (error) {
    console.error("GET /api/endpoints/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/endpoints/[id]
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existing = await prisma.aPIEndpoint.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.url !== undefined) {
      if (!isValidUrl(body.url)) {
        return NextResponse.json({ error: "Valid URL is required" }, { status: 400 });
      }
      updates.url = body.url.trim();
    }
    if (body.method !== undefined) {
      if (!HTTP_METHODS.includes(body.method)) {
        return NextResponse.json({ error: "Invalid HTTP method" }, { status: 400 });
      }
      updates.method = body.method;
    }
    if (body.headers !== undefined) updates.headers = JSON.stringify(body.headers);
    if (body.body !== undefined) updates.body = body.body;
    if (body.pollingInterval !== undefined) updates.pollingInterval = body.pollingInterval;
    if (body.isEnabled !== undefined) updates.isEnabled = body.isEnabled;

    const endpoint = await prisma.aPIEndpoint.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json({
      ...endpoint,
      headers: JSON.parse(endpoint.headers),
      lastCheckedAt: endpoint.lastCheckedAt?.toISOString() || null,
      createdAt: endpoint.createdAt.toISOString(),
      updatedAt: endpoint.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("PUT /api/endpoints/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/endpoints/[id]
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existing = await prisma.aPIEndpoint.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
    }

    await prisma.aPIEndpoint.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/endpoints/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
