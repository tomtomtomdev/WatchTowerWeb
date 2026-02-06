import type { ParsedCurlCommand, HttpMethod, HTTP_METHODS } from "@/lib/types";

const VALID_METHODS = new Set<string>(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);

export function parseCurlCommand(curlCommand: string): ParsedCurlCommand {
  // Normalize: join continuation lines, trim
  let cmd = curlCommand
    .replace(/\\\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Remove leading 'curl' if present
  if (cmd.toLowerCase().startsWith("curl ")) {
    cmd = cmd.slice(5).trim();
  } else if (cmd.toLowerCase() === "curl") {
    throw new Error("Empty cURL command");
  }

  let url = "";
  let method: HttpMethod = "GET";
  const headers: Record<string, string> = {};
  let body: string | null = null;
  let methodExplicit = false;

  const tokens = tokenize(cmd);
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];

    if (token === "-X" || token === "--request") {
      i++;
      const m = tokens[i]?.toUpperCase();
      if (m && VALID_METHODS.has(m)) {
        method = m as HttpMethod;
        methodExplicit = true;
      }
    } else if (token === "-H" || token === "--header") {
      i++;
      const headerStr = tokens[i];
      if (headerStr) {
        const colonIndex = headerStr.indexOf(":");
        if (colonIndex > 0) {
          const key = headerStr.slice(0, colonIndex).trim();
          const value = headerStr.slice(colonIndex + 1).trim();
          headers[key] = value;
        }
      }
    } else if (token === "-d" || token === "--data" || token === "--data-raw" || token === "--data-binary") {
      i++;
      body = tokens[i] || null;
      if (!methodExplicit) method = "POST";
    } else if (token === "--json") {
      i++;
      body = tokens[i] || null;
      if (!methodExplicit) method = "POST";
      headers["Content-Type"] = "application/json";
      headers["Accept"] = "application/json";
    } else if (token === "--url") {
      i++;
      url = tokens[i] || "";
    } else if (token === "-L" || token === "--location" || token === "-s" || token === "--silent" || token === "-k" || token === "--insecure" || token === "-v" || token === "--verbose" || token === "--compressed") {
      // Skip known flags that don't take values
    } else if (token === "-o" || token === "--output" || token === "-u" || token === "--user" || token === "--connect-timeout" || token === "-m" || token === "--max-time") {
      // Skip flags that take a value
      i++;
    } else if (!token.startsWith("-") && !url) {
      url = token;
    }
    i++;
  }

  if (!url) throw new Error("No URL found in cURL command");

  // Strip quotes from URL
  url = url.replace(/^['"]|['"]$/g, "");

  // Derive a name from the URL
  let name = "";
  try {
    const parsed = new URL(url);
    name = parsed.pathname === "/" ? parsed.hostname : `${parsed.hostname}${parsed.pathname}`;
  } catch {
    name = url.slice(0, 50);
  }

  return { url, method, headers, body, name };
}

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let i = 0;

  while (i < input.length) {
    // Skip whitespace
    while (i < input.length && input[i] === " ") i++;
    if (i >= input.length) break;

    const char = input[i];
    if (char === '"' || char === "'") {
      // Quoted string
      const quote = char;
      i++;
      let token = "";
      while (i < input.length && input[i] !== quote) {
        if (input[i] === "\\" && i + 1 < input.length) {
          i++;
          token += input[i];
        } else {
          token += input[i];
        }
        i++;
      }
      if (i < input.length) i++; // skip closing quote
      tokens.push(token);
    } else {
      // Unquoted token
      let token = "";
      while (i < input.length && input[i] !== " ") {
        token += input[i];
        i++;
      }
      tokens.push(token);
    }
  }

  return tokens;
}
