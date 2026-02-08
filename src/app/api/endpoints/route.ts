import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isValidUrl } from "@/lib/utils";
import { HTTP_METHODS } from "@/lib/types";

// GET /api/endpoints - List all endpoints with computed status
export async function GET() {
  try {
    const endpoints = await prisma.aPIEndpoint.findMany({
      include: {
        healthCheckResults: {
          orderBy: { timestamp: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const data = endpoints.map((ep) => {
      const lastResult = ep.healthCheckResults[0] || null;
      let status: string = "unknown";
      if (!ep.isEnabled) status = "unknown";
      else if (lastResult) {
        if (lastResult.isTokenExpired) status = "expired";
        else status = lastResult.isSuccess ? "healthy" : "failing";
      }

      return {
        id: ep.id,
        name: ep.name,
        url: ep.url,
        method: ep.method,
        headers: JSON.parse(ep.headers),
        body: ep.body,
        pollingInterval: ep.pollingInterval,
        isEnabled: ep.isEnabled,
        lastCheckedAt: ep.lastCheckedAt?.toISOString() || null,
        createdAt: ep.createdAt.toISOString(),
        updatedAt: ep.updatedAt.toISOString(),
        status,
        lastResponseTime: lastResult?.responseTime ?? null,
        lastStatusCode: lastResult?.statusCode ?? null,
        loginEndpointId: ep.loginEndpointId,
        tokenJsonPath: ep.tokenJsonPath,
        cachedToken: ep.cachedToken,
        cachedUserId: ep.cachedUserId,
        tokenRefreshedAt: ep.tokenRefreshedAt?.toISOString() || null,
        useApplyCodeLogin: ep.useApplyCodeLogin,
      };
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/endpoints error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/endpoints - Create endpoint
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, url, method, headers, body: reqBody, pollingInterval, loginEndpointId, tokenJsonPath, useApplyCodeLogin } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!url || !isValidUrl(url)) {
      return NextResponse.json({ error: "Valid URL is required" }, { status: 400 });
    }
    if (method && !HTTP_METHODS.includes(method)) {
      return NextResponse.json({ error: "Invalid HTTP method" }, { status: 400 });
    }
    if (loginEndpointId && (!tokenJsonPath || !tokenJsonPath.startsWith("$."))) {
      return NextResponse.json({ error: "tokenJsonPath starting with '$.' is required when loginEndpointId is set" }, { status: 400 });
    }

    const endpoint = await prisma.aPIEndpoint.create({
      data: {
        name: name.trim(),
        url: url.trim(),
        method: method || "GET",
        headers: headers ? JSON.stringify(headers) : "{}",
        body: reqBody || null,
        pollingInterval: pollingInterval || 900,
        loginEndpointId: loginEndpointId || null,
        tokenJsonPath: tokenJsonPath || null,
        useApplyCodeLogin: useApplyCodeLogin ?? false,
      },
    });

    return NextResponse.json(
      {
        ...endpoint,
        headers: JSON.parse(endpoint.headers),
        lastCheckedAt: endpoint.lastCheckedAt?.toISOString() || null,
        createdAt: endpoint.createdAt.toISOString(),
        updatedAt: endpoint.updatedAt.toISOString(),
        status: "unknown",
        lastResponseTime: null,
        lastStatusCode: null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/endpoints error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
