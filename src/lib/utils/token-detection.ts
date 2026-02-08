const TOKEN_EXPIRED_PATTERNS = [
  /token.*expir/i,
  /expir.*token/i,
  /access.*expir/i,
  /unauthorized.*expir/i,
  /token.*invalid/i,
  /jwt.*expir/i,
];

export function detectTokenExpiration(responseBody: string | null, statusCode: number | null): boolean {
  if (statusCode !== 401 && statusCode !== 403) return false;
  if (!responseBody) return false;

  const bodyLower = responseBody.toLowerCase();

  // Check raw text against patterns
  for (const pattern of TOKEN_EXPIRED_PATTERNS) {
    if (pattern.test(bodyLower)) return true;
  }

  // Try parsing JSON and checking common fields
  try {
    const json = JSON.parse(responseBody);
    const fieldsToCheck = [json.error, json.message, json.code, json.detail, json.msg];
    for (const field of fieldsToCheck) {
      if (typeof field === "string") {
        for (const pattern of TOKEN_EXPIRED_PATTERNS) {
          if (pattern.test(field)) return true;
        }
      }
    }
  } catch {
    // not JSON, already checked raw text
  }

  return false;
}
