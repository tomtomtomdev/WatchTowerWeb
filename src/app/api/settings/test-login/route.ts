import { NextResponse } from "next/server";
import { performApplyCodeLogin } from "@/lib/services/apply-code-login";

// POST /api/settings/test-login - Trigger login flow and return credentials
export async function POST() {
  try {
    const result = await performApplyCodeLogin();

    if (!result) {
      return NextResponse.json(
        { error: "Login failed. Check your credentials and RSA_PUBLIC_KEY." },
        { status: 400 }
      );
    }

    if (!result.accessToken) {
      return NextResponse.json(
        {
          error: "Login failed. Check your credentials.",
          debug: result.debug,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      accessToken: result.accessToken,
      userId: result.userId,
      debug: result.debug,
    });
  } catch (error) {
    console.error("POST /api/settings/test-login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
