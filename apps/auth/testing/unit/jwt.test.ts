import { describe, expect, it, beforeAll } from "vitest";
import { initKeys, signJwt, verifyJwt, getJwks } from "@/lib/jwt";

describe("JWT infrastructure", () => {
  beforeAll(async () => {
    await initKeys(); // ephemeral key pair
  });

  it("signs and verifies a token", async () => {
    const token = await signJwt({ sub: "user-1", roles: ["Admin"] }, "1h");
    expect(typeof token).toBe("string");

    const payload = await verifyJwt(token);
    expect(payload.sub).toBe("user-1");
    expect(payload.roles).toEqual(["Admin"]);
  });

  it("preserves custom claims", async () => {
    const token = await signJwt({
      iss: "http://localhost:3002",
      sub: "42",
      aud: "test-client",
      name: "Test User",
      email: "test@example.com",
      roles: ["Leiter", "JungLeiter"],
      primary_group_id: 1172,
    });

    const payload = await verifyJwt(token);
    expect(payload.iss).toBe("http://localhost:3002");
    expect(payload.aud).toBe("test-client");
    expect(payload.name).toBe("Test User");
    expect(payload.primary_group_id).toBe(1172);
  });

  it("rejects a tampered token", async () => {
    const token = await signJwt({ sub: "user-1" });
    const parts = token.split(".");
    // Flip a character in the signature
    const tampered = `${parts[0]}.${parts[1]}.${parts[2]!.slice(0, -1)}X`;

    await expect(verifyJwt(tampered)).rejects.toThrow();
  });

  describe("getJwks", () => {
    it("returns a JWKS with one RS256 key", () => {
      const jwks = getJwks();
      expect(jwks.keys).toHaveLength(1);
      const key = jwks.keys[0]!;
      expect(key.alg).toBe("RS256");
      expect(key.use).toBe("sig");
      expect(key.kid).toBeTruthy();
      expect(key.kty).toBe("RSA");
      expect(key.n).toBeTruthy();
      expect(key.e).toBeTruthy();
    });
  });
});
