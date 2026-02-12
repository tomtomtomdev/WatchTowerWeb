import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseCurlCommand } from "@/lib/services/curl-parser.service";
import { parsePostmanCollection } from "@/lib/services/postman-parser.service";

function shouldDisableByDefault(url: string): boolean {
  return url.includes("/apply-code") || url.includes("/login/login");
}

async function upsertEndpoint(data: { name: string; url: string; method: string; headers: string; body: string | null }) {
  const isEnabled = !shouldDisableByDefault(data.url);
  const existing = await prisma.aPIEndpoint.findFirst({ where: { url: data.url } });
  if (existing) {
    return prisma.aPIEndpoint.update({ where: { id: existing.id }, data: { ...data, isEnabled } });
  }
  return prisma.aPIEndpoint.create({ data: { ...data, isEnabled } });
}

// POST /api/endpoints/import - Import from cURL or Postman
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, data } = body as { type: "curl" | "postman"; data: string };

    if (!type || !data) {
      return NextResponse.json({ error: "type and data are required" }, { status: 400 });
    }

    if (type === "curl") {
      try {
        const parsed = parseCurlCommand(data);
        const endpoint = await upsertEndpoint({
          name: parsed.name,
          url: parsed.url,
          method: parsed.method,
          headers: JSON.stringify(parsed.headers),
          body: parsed.body,
        });
        return NextResponse.json({ imported: 1, endpoints: [endpoint] }, { status: 201 });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to parse cURL command";
        return NextResponse.json({ error: message }, { status: 400 });
      }
    }

    if (type === "postman") {
      try {
        const parsed = parsePostmanCollection(data);
        if (parsed.length === 0) {
          return NextResponse.json({ error: "No requests found in collection" }, { status: 400 });
        }

        const endpoints = [];
        for (const req of parsed) {
          const endpoint = await upsertEndpoint({
            name: req.name,
            url: req.url,
            method: req.method,
            headers: JSON.stringify(req.headers),
            body: req.body,
          });
          endpoints.push(endpoint);
        }

        return NextResponse.json({ imported: endpoints.length, endpoints }, { status: 201 });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to parse Postman collection";
        return NextResponse.json({ error: message }, { status: 400 });
      }
    }

    return NextResponse.json({ error: 'type must be "curl" or "postman"' }, { status: 400 });
  } catch (error) {
    console.error("POST /api/endpoints/import error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
