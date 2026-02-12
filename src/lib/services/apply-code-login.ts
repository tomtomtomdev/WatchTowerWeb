import { encryptPassword } from "@/lib/utils/rsa-encrypt";
import { prisma } from "@/lib/db";

const SETTINGS_ID = "singleton";

interface LoginCredentials {
  baseUrl: string;
  account: string;
  password: string;
  loginType: "email" | "phone";
}

async function getLoginCredentials(): Promise<LoginCredentials | null> {
  // Try to get credentials from database first
  try {
    const settings = await prisma.settings.findUnique({
      where: { id: SETTINGS_ID },
    });

    if (settings?.loginBaseUrl && settings?.loginPassword) {
      const loginType = (settings.loginType as "email" | "phone") || "email";
      const account = loginType === "phone" ? settings.loginPhone : settings.loginEmail;
      if (account) {
        return {
          baseUrl: settings.loginBaseUrl,
          account,
          password: settings.loginPassword,
          loginType,
        };
      }
    }
  } catch (error) {
    console.log("[apply-code-login] Could not read from database, falling back to env vars");
  }

  // Fall back to environment variables
  const baseUrl = process.env.LOGIN_BASE_URL;
  const email = process.env.LOGIN_EMAIL;
  const password = process.env.LOGIN_PASSWORD;

  if (baseUrl && email && password) {
    return { baseUrl, account: email, password, loginType: "email" };
  }

  return null;
}

async function saveTokenToSettings(accessToken: string, userId: string): Promise<void> {
  try {
    await prisma.settings.upsert({
      where: { id: SETTINGS_ID },
      update: {
        cachedAccessToken: accessToken,
        cachedUserId: userId || null,
        tokenRefreshedAt: new Date(),
      },
      create: {
        id: SETTINGS_ID,
        cachedAccessToken: accessToken,
        cachedUserId: userId || null,
        tokenRefreshedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("[apply-code-login] Failed to save token to settings:", error);
  }
}

export interface LoginDebugInfo {
  requestBody: Record<string, unknown>;
  responseBody: Record<string, unknown>;
  responseStatus: number;
}

export async function performApplyCodeLogin(): Promise<{ accessToken: string; userId: string; debug: LoginDebugInfo } | null> {
  const credentials = await getLoginCredentials();

  if (!credentials) {
    console.log("[apply-code-login] Missing credentials (configure in Settings or set LOGIN_BASE_URL, LOGIN_EMAIL, LOGIN_PASSWORD env vars)");
    return null;
  }

  const { baseUrl, account, password, loginType } = credentials;

  try {
    // Step 1: Apply code
    const applyCodeUrl = `${baseUrl}/auth/common/apply-code`;
    const applyCodeFormBody = new URLSearchParams({
      accessToken: "",
      cVersion: "1.9.0",
      channel: "jenkins",
      dark: "1",
      deviceId: "2E418112-A18D-437B-9101-F593EF07E015",
      deviceType: "iPhone 17 Pro Max",
      h: "956.0",
      isRelease: "0",
      language: "en",
      platform: "iOS",
      sVersion: "26.1",
      statusHeight: "54.0",
      token: "",
      userId: "",
      w: "440.0",
    }).toString();
    console.log(`[apply-code-login] Step 1: POST ${applyCodeUrl}`);
    console.log("[apply-code-login] Apply-code request body:", applyCodeFormBody);
    const requestId = crypto.randomUUID().toUpperCase();
    const timestamp = new Date().toISOString().replace("T", " ").replace(/\.\d+Z$/, "Z");
    const applyRes = await fetch(applyCodeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
        "Accept": "application/json",
        "User-Agent": "TTCore/1.9.0 (iPhone 17 Pro Max; iOS 26.1)",
        "x-request-id": requestId,
        "x-timestamp": timestamp,
        "x-user-id": "",
      },
      body: applyCodeFormBody,
    });

    if (!applyRes.ok) {
      console.log(`[apply-code-login] apply-code failed: HTTP ${applyRes.status}`);
      return null;
    }

    const applyData = await applyRes.json();
    if (applyData?.errorCode) {
      console.log(`[apply-code-login] apply-code failed with errorCode: ${applyData.errorCode}`, JSON.stringify(applyData));
      return null;
    }
    const code = applyData?.data?.code;
    if (!code) {
      console.log("[apply-code-login] No code in apply-code response:", JSON.stringify(applyData));
      return null;
    }
    console.log("[apply-code-login] Step 1 complete, got code");

    // Step 2: Encrypt password
    console.log("[apply-code-login] Step 2: Encrypting password...");
    const encryptedPassword = encryptPassword(password, code);
    // Percent-encode like iOS: encode everything except /
    const encodedPassword = encodeURIComponent(encryptedPassword).replace(/%2F/g, "/");
    console.log("[apply-code-login] Step 2 complete");

    // Step 3: Login
    const loginUrl = `${baseUrl}/auth/login/login`;
    console.log(`[apply-code-login] Step 3: POST ${loginUrl}`);
    const loginBody = {
      accessToken: "",
      cVersion: "1.9.0",
      channel: "jenkins",
      dark: "1",
      deviceId: "2E418112-A18D-437B-9101-F593EF07E015",
      deviceType: "iPhone 17 Pro Max",
      h: "956.0",
      isRelease: "0",
      language: "en",
      password: encodedPassword,
      platform: "iOS",
      registerAccount: account,
      registerType: loginType === "phone" ? "0" : "1",
      sVersion: "26.1",
      statusHeight: "54.0",
      token: "",
      userId: "",
      w: "440.0",
    };
    // Build form body manually so that '/' in password stays literal (not %2F).
    // URLSearchParams would re-encode '/' to '%2F'.
    const loginFormBody = Object.entries(loginBody)
      .map(([k, v]) => k === "password"
        ? `${k}=${encodedPassword}`
        : `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");
    console.log("[apply-code-login] Login request body:", loginFormBody);

    const loginRes = await fetch(loginUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
        "Accept": "application/json",
        "User-Agent": "TTCore/1.9.0 (iPhone 17 Pro Max; iOS 26.1)",
        "x-request-id": requestId,
        "x-timestamp": timestamp,
        "x-user-id": "",
      },
      body: loginFormBody,
    });

    const loginData = await loginRes.json();
    const debug: LoginDebugInfo = {
      requestBody: loginBody,
      responseBody: loginData,
      responseStatus: loginRes.status,
    };

    if (loginData?.errorCode) {
      console.log(`[apply-code-login] login failed with errorCode: ${loginData.errorCode}`, JSON.stringify(loginData));
      return { accessToken: "", userId: "", debug };
    }

    if (!loginRes.ok) {
      console.log(`[apply-code-login] login failed: HTTP ${loginRes.status}`);
      return { accessToken: "", userId: "", debug };
    }

    const accessToken = loginData?.data?.accessToken;
    const userId = loginData?.data?.userId ?? "";
    if (!accessToken) {
      console.log("[apply-code-login] No accessToken in login response:", JSON.stringify(loginData));
      return { accessToken: "", userId: "", debug };
    }

    console.log("[apply-code-login] Step 3 complete, got accessToken" + (userId ? " and userId" : ""));

    // Save token to settings for display in UI
    await saveTokenToSettings(accessToken, userId);

    return { accessToken, userId, debug };
  } catch (error) {
    console.error("[apply-code-login] Error:", error);
    return null;
  }
}
