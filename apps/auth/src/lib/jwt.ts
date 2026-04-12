import * as jose from "jose";

type SigningKey = jose.CryptoKey | jose.KeyObject;

let privateKey: SigningKey;
let publicKey: SigningKey;
let jwk: jose.JWK;
let kid: string;

/**
 * Initialize the RS256 signing key pair.
 * If a PEM is provided via env, import it. Otherwise generate an ephemeral
 * key pair (fine for dev, but production should supply a stable key).
 */
export async function initKeys(pem?: string): Promise<void> {
  if (pem) {
    privateKey = await jose.importPKCS8(pem, "RS256");
    // Derive the public key from the private key by re-importing JWK
    const jwkPrivate = await jose.exportJWK(privateKey);
    // Remove private components to get public JWK
    const { d, p, q, dp, dq, qi, ...publicJwk } = jwkPrivate;
    publicKey = await jose.importJWK(publicJwk, "RS256") as SigningKey;
    jwk = publicJwk;
  } else {
    const pair = await jose.generateKeyPair("RS256", { modulusLength: 2048 });
    privateKey = pair.privateKey;
    publicKey = pair.publicKey;
    jwk = await jose.exportJWK(publicKey);
  }

  kid = await jose.calculateJwkThumbprint(jwk, "sha256");
  jwk.kid = kid;
  jwk.use = "sig";
  jwk.alg = "RS256";
}

/** Sign a JWT payload and return the compact token string. */
export async function signJwt(
  payload: jose.JWTPayload,
  expiresIn: string = "1h"
): Promise<string> {
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: "RS256", kid })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(privateKey);
}

/** Verify a JWT and return its payload. Throws on invalid/expired. */
export async function verifyJwt(token: string): Promise<jose.JWTPayload> {
  const { payload } = await jose.jwtVerify(token, publicKey);
  return payload;
}

/** Return the JWKS document. */
export function getJwks(): { keys: jose.JWK[] } {
  return { keys: [jwk] };
}

export function getKid(): string {
  return kid;
}
