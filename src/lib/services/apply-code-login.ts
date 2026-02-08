import { encryptPassword } from "@/lib/utils/rsa-encrypt";

export async function performApplyCodeLogin(): Promise<string | null> {
  const baseUrl = process.env.LOGIN_BASE_URL;
  const email = process.env.LOGIN_EMAIL;
  const password = process.env.LOGIN_PASSWORD;

  if (!baseUrl || !email || !password) {
    console.log("[apply-code-login] Missing env vars (LOGIN_BASE_URL, LOGIN_EMAIL, LOGIN_PASSWORD)");
    return null;
  }

  try {
    // Step 1: Apply code
    console.log("[apply-code-login] Step 1: Calling apply-code...");
    const applyRes = await fetch(`${baseUrl}/auth/common/apply-code`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "",
    });

    if (!applyRes.ok) {
      console.log(`[apply-code-login] apply-code failed: HTTP ${applyRes.status}`);
      return null;
    }

    const applyData = await applyRes.json();
    const code = applyData?.data?.code;
    if (!code) {
      console.log("[apply-code-login] No code in apply-code response:", JSON.stringify(applyData));
      return null;
    }
    console.log("[apply-code-login] Step 1 complete, got code");

    // Step 2: Encrypt password
    console.log("[apply-code-login] Step 2: Encrypting password...");
    const encryptedPassword = encryptPassword(password, code);
    console.log("[apply-code-login] Step 2 complete");

    // Step 3: Login
    console.log("[apply-code-login] Step 3: Calling login...");
    const loginBody = new URLSearchParams({
      registerAccount: email,
      registerType: "1",
      registerPassword: encryptedPassword,
    });

    const loginRes = await fetch(`${baseUrl}/auth/login/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: loginBody.toString(),
    });

    if (!loginRes.ok) {
      console.log(`[apply-code-login] login failed: HTTP ${loginRes.status}`);
      return null;
    }

    const loginData = await loginRes.json();
    const accessToken = loginData?.data?.accessToken;
    if (!accessToken) {
      console.log("[apply-code-login] No accessToken in login response:", JSON.stringify(loginData));
      return null;
    }

    console.log("[apply-code-login] Step 3 complete, got accessToken");
    return accessToken;
  } catch (error) {
    console.error("[apply-code-login] Error:", error);
    return null;
  }
}
