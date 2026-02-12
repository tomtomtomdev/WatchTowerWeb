import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const SETTINGS_ID = "singleton";

// GET /api/settings - Get current settings
export async function GET() {
  try {
    let settings = await prisma.settings.findUnique({
      where: { id: SETTINGS_ID },
    });

    if (!settings) {
      settings = await prisma.settings.create({
        data: { id: SETTINGS_ID },
      });
    }

    return NextResponse.json({
      loginBaseUrl: settings.loginBaseUrl || "",
      loginEmail: settings.loginEmail || "",
      loginPhone: settings.loginPhone || "",
      loginType: settings.loginType || "email",
      loginPassword: settings.loginPassword ? "••••••••" : "",
      hasPassword: !!settings.loginPassword,
      cachedAccessToken: settings.cachedAccessToken || null,
      cachedUserId: settings.cachedUserId || null,
      tokenRefreshedAt: settings.tokenRefreshedAt?.toISOString() || null,
    });
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/settings - Update settings
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.loginBaseUrl !== undefined) {
      updates.loginBaseUrl = body.loginBaseUrl || null;
    }
    if (body.loginEmail !== undefined) {
      updates.loginEmail = body.loginEmail || null;
    }
    if (body.loginPhone !== undefined) {
      updates.loginPhone = body.loginPhone || null;
    }
    if (body.loginType !== undefined) {
      updates.loginType = body.loginType || "email";
    }
    if (body.loginPassword !== undefined && body.loginPassword !== "••••••••") {
      updates.loginPassword = body.loginPassword || null;
    }

    const settings = await prisma.settings.upsert({
      where: { id: SETTINGS_ID },
      update: updates,
      create: { id: SETTINGS_ID, ...updates },
    });

    return NextResponse.json({
      loginBaseUrl: settings.loginBaseUrl || "",
      loginEmail: settings.loginEmail || "",
      loginPhone: settings.loginPhone || "",
      loginType: settings.loginType || "email",
      loginPassword: settings.loginPassword ? "••••••••" : "",
      hasPassword: !!settings.loginPassword,
      cachedAccessToken: settings.cachedAccessToken || null,
      cachedUserId: settings.cachedUserId || null,
      tokenRefreshedAt: settings.tokenRefreshedAt?.toISOString() || null,
    });
  } catch (error) {
    console.error("PUT /api/settings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
