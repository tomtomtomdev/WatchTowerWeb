import { NextResponse } from "next/server";
import { runScheduledChecks } from "@/lib/services/scheduler.service";

// POST /api/cron/check - Scheduler trigger
export async function POST() {
  try {
    const result = await runScheduledChecks();
    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/cron/check error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
