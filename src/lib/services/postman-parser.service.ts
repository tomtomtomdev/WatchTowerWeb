import type { ParsedPostmanRequest, HttpMethod } from "@/lib/types";

interface PostmanHeader {
  key: string;
  value: string;
  disabled?: boolean;
}

interface PostmanUrl {
  raw?: string;
  protocol?: string;
  host?: string | string[];
  path?: string | string[];
  query?: Array<{ key: string; value: string }>;
}

interface PostmanBody {
  mode?: string;
  raw?: string;
  formdata?: Array<{ key: string; value: string }>;
  urlencoded?: Array<{ key: string; value: string }>;
}

interface PostmanRequest {
  method?: string;
  header?: PostmanHeader[] | string;
  url?: string | PostmanUrl;
  body?: PostmanBody;
}

interface PostmanItem {
  name?: string;
  request?: PostmanRequest;
  item?: PostmanItem[]; // nested folders
}

interface PostmanCollection {
  info?: { name?: string };
  item?: PostmanItem[];
}

const VALID_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);

export function parsePostmanCollection(jsonData: string): ParsedPostmanRequest[] {
  const collection: PostmanCollection = JSON.parse(jsonData);
  if (!collection.item) throw new Error("Invalid Postman collection: no items found");
  return flattenItems(collection.item);
}

function flattenItems(items: PostmanItem[], prefix = ""): ParsedPostmanRequest[] {
  const results: ParsedPostmanRequest[] = [];

  for (const item of items) {
    const name = prefix ? `${prefix} / ${item.name || "Unnamed"}` : item.name || "Unnamed";

    if (item.item && item.item.length > 0) {
      // Folder: recurse
      results.push(...flattenItems(item.item, name));
    } else if (item.request) {
      const parsed = parseRequest(item.request, name);
      if (parsed) results.push(parsed);
    }
  }

  return results;
}

function parseRequest(request: PostmanRequest, name: string): ParsedPostmanRequest | null {
  const url = resolveUrl(request.url);
  if (!url) return null;

  const methodStr = (request.method || "GET").toUpperCase();
  const method: HttpMethod = VALID_METHODS.has(methodStr) ? (methodStr as HttpMethod) : "GET";

  const headers: Record<string, string> = {};
  if (Array.isArray(request.header)) {
    for (const h of request.header) {
      if (!h.disabled && h.key && h.value) {
        headers[h.key] = h.value;
      }
    }
  }

  let body: string | null = null;
  if (request.body) {
    if (request.body.mode === "raw" && request.body.raw) {
      body = request.body.raw;
    } else if (request.body.mode === "urlencoded" && request.body.urlencoded) {
      body = request.body.urlencoded
        .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
        .join("&");
    } else if (request.body.mode === "formdata" && request.body.formdata) {
      // Convert formdata to JSON for simplicity
      const obj: Record<string, string> = {};
      for (const p of request.body.formdata) {
        obj[p.key] = p.value;
      }
      body = JSON.stringify(obj);
    }
  }

  return { name, url, method, headers, body };
}

function resolveUrl(url: string | PostmanUrl | undefined): string {
  if (!url) return "";
  if (typeof url === "string") return url;
  if (url.raw) return url.raw;

  const protocol = url.protocol || "https";
  const host = Array.isArray(url.host) ? url.host.join(".") : url.host || "";
  const path = Array.isArray(url.path) ? url.path.join("/") : url.path || "";

  if (!host) return "";
  let result = `${protocol}://${host}`;
  if (path) result += `/${path}`;

  if (url.query && url.query.length > 0) {
    const qs = url.query.map((q) => `${encodeURIComponent(q.key)}=${encodeURIComponent(q.value)}`).join("&");
    result += `?${qs}`;
  }

  return result;
}
