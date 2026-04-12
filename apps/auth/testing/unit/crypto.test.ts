import { describe, expect, it } from "vitest";
import {
  generateCode,
  verifyPkce,
  hashSecret,
  verifySecret,
} from "@/lib/crypto";
import { createHash } from "crypto";

describe("generateCode", () => {
  it("returns a base64url string", () => {
    const code = generateCode();
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("respects the byte length parameter", () => {
    const short = generateCode(16);
    const long = generateCode(64);
    // base64url encodes 4 chars per 3 bytes
    expect(short.length).toBeLessThan(long.length);
  });

  it("generates unique values", () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateCode()));
    expect(codes.size).toBe(50);
  });
});

describe("verifyPkce", () => {
  it("verifies plain method", () => {
    expect(verifyPkce("my-verifier", "my-verifier", "plain")).toBe(true);
    expect(verifyPkce("my-verifier", "wrong", "plain")).toBe(false);
  });

  it("verifies S256 method", () => {
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    const challenge = createHash("sha256")
      .update(verifier)
      .digest("base64url");

    expect(verifyPkce(verifier, challenge, "S256")).toBe(true);
    expect(verifyPkce("wrong-verifier", challenge, "S256")).toBe(false);
  });

  it("defaults to S256 when method is omitted", () => {
    const verifier = "test-verifier";
    const challenge = createHash("sha256")
      .update(verifier)
      .digest("base64url");

    expect(verifyPkce(verifier, challenge)).toBe(true);
  });
});

describe("hashSecret / verifySecret", () => {
  it("round-trips correctly", () => {
    const secret = "my-client-secret";
    const hash = hashSecret(secret);
    expect(verifySecret(secret, hash)).toBe(true);
  });

  it("rejects wrong secret", () => {
    const hash = hashSecret("correct-secret");
    expect(verifySecret("wrong-secret", hash)).toBe(false);
  });

  it("produces a hex string", () => {
    const hash = hashSecret("test");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});
