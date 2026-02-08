/**
 * Lightweight JSONPath evaluator supporting $.a.b[0].c syntax.
 */
export function evaluateJsonPath(obj: unknown, path: string): unknown {
  if (!path.startsWith("$.")) return undefined;

  const segments = path
    .slice(2)
    .split(/\.|\[(\d+)\]/)
    .filter((s) => s !== "" && s !== undefined);

  let current: unknown = obj;
  for (const segment of segments) {
    if (current == null || typeof current !== "object") return undefined;
    const index = /^\d+$/.test(segment) ? Number(segment) : segment;
    current = (current as Record<string, unknown>)[index as string];
  }
  return current;
}

export function extractTokenFromResponse(body: string, jsonPath: string): string | null {
  try {
    const json = JSON.parse(body);
    const value = evaluateJsonPath(json, jsonPath);
    return typeof value === "string" ? value : null;
  } catch {
    return null;
  }
}
