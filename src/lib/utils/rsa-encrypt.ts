import crypto from "crypto";

export function encryptPassword(password: string, code: string): string {
  const publicKeyPem = process.env.RSA_PUBLIC_KEY;
  if (!publicKeyPem) {
    throw new Error("RSA_PUBLIC_KEY environment variable is not set");
  }

  const keyBody = publicKeyPem.match(/.{1,64}/g)?.join("\n") ?? publicKeyPem;
  const pem = `-----BEGIN PUBLIC KEY-----\n${keyBody}\n-----END PUBLIC KEY-----`;

  const sha1Hash = crypto.createHash("sha1").update(password, "utf8").digest("hex");
  const plaintext = code + sha1Hash;
  const encrypted = crypto.publicEncrypt(
    { key: pem, padding: crypto.constants.RSA_PKCS1_PADDING },
    Buffer.from(plaintext, "utf-8")
  );

  return encrypted.toString("base64");
}
