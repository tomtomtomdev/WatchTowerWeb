import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { executeHealthCheck } from "@/lib/services/health-check.service";
import type { BulkAction } from "@/lib/types";

// POST /api/endpoints/bulk - Bulk operations
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, ids } = body as { action: BulkAction; ids: string[] };

    if (!action || !ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "action and ids[] are required" }, { status: 400 });
    }

    switch (action) {
      case "check": {
        const results = [];
        for (const id of ids) {
          try {
            const result = await executeHealthCheck(id);
            results.push({ id, ...result });
          } catch {
            results.push({ id, error: "Failed" });
          }
        }
        return NextResponse.json({ action, results });
      }

      case "enable": {
        await prisma.aPIEndpoint.updateMany({
          where: { id: { in: ids } },
          data: { isEnabled: true },
        });
        return NextResponse.json({ action, updated: ids.length });
      }

      case "disable": {
        await prisma.aPIEndpoint.updateMany({
          where: { id: { in: ids } },
          data: { isEnabled: false },
        });
        return NextResponse.json({ action, updated: ids.length });
      }

      case "delete": {
        await prisma.aPIEndpoint.deleteMany({
          where: { id: { in: ids } },
        });
        return NextResponse.json({ action, deleted: ids.length });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("POST /api/endpoints/bulk error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
