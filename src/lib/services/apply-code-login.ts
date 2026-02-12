import { encryptPassword } from "@/lib/utils/rsa-encrypt";
import { prisma } from "@/lib/db";

const SETTINGS_ID = "singleton";

async function getLoginCredentials(): Promise<{ baseUrl: string; email: string; password: string } | null> {
  // Try to get credentials from database first
  try {
    const settings = await prisma.settings.findUnique({
      where: { id: SETTINGS_ID },
    });

    if (settings?.loginBaseUrl && settings?.loginEmail && settings?.loginPassword) {
      return {
        baseUrl: settings.loginBaseUrl,
        email: settings.loginEmail,
        password: settings.loginPassword,
      };
    }
  } catch (error) {
    console.log("[apply-code-login] Could not read from database, falling back to env vars");
  }

  // Fall back to environment variables
  const baseUrl = process.env.LOGIN_BASE_URL;
  const email = process.env.LOGIN_EMAIL;
  const password = process.env.LOGIN_PASSWORD;

  if (baseUrl && email && password) {
    return { baseUrl, email, password };
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

  const { baseUrl, email, password } = credentials;

  try {
    // Step 1: Apply code
    const applyCodeParams = new URLSearchParams({
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
    });
    const applyCodeUrl = `${baseUrl}/auth/common/apply-code`;
    const applyCodeBody = Object.fromEntries(applyCodeParams.entries());
    console.log(`[apply-code-login] Step 1: POST ${applyCodeUrl}`);
    console.log("[apply-code-login] Apply-code request body:", JSON.stringify(applyCodeBody));
    const applyRes = await fetch(applyCodeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(applyCodeBody),
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
    const encryptedPassword = encodeURIComponent(encryptPassword(password, code));
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
      password: encryptedPassword,
      platform: "iOS",
      registerAccount: email,
      registerType: "0",
      sVersion: "26.1",
      statusHeight: "54.0",
      token: "",
      userId: "",
      w: "440.0",
    };
    console.log("[apply-code-login] Login request body:", JSON.stringify(loginBody));

    const loginRes = await fetch(loginUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(loginBody),
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
