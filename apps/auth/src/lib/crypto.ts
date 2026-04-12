import { randomBytes, createHash } from "crypto";

/** Generate a cryptographically random string suitable for auth codes / tokens. */
export function generateCode(bytes: number = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** Verify a PKCE code challenge. */
export function verifyPkce(
  codeVerifier: string,
  codeChallenge: string,
  method: string = "S256"
): boolean {
  if (method === "plain") {
    return codeVerifier === codeChallenge;
  }
  // S256: BASE64URL(SHA256(code_verifier)) === code_challenge
  const hash = createHash("sha256").update(codeVerifier).digest("base64url");
  return hash === codeChallenge;
}

/** Hash a client secret for storage. Uses SHA-256 (simple, sufficient for server-side comparison). */
export function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

/** Verify a client secret against its hash. */
export function verifySecret(secret: string, hash: string): boolean {
  return hashSecret(secret) === hash;
}
