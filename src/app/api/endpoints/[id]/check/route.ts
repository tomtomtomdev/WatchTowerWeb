import { NextResponse } from "next/server";
import { executeHealthCheck } from "@/lib/services/health-check.service";

// POST /api/endpoints/[id]/check - Trigger immediate health check
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await executeHealthCheck(id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "Endpoint not found") {
      return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
    }
    console.error("POST /api/endpoints/[id]/check error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
