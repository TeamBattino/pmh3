import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "media_unlock";
const COOKIE_VALUE_PAYLOAD = "v1";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function secret(): string {
  return process.env.MEDIA_UNLOCK_SECRET || "dev-media-unlock-secret";
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

function expectedCookieValue(): string {
  return `${COOKIE_VALUE_PAYLOAD}.${sign(COOKIE_VALUE_PAYLOAD)}`;
}

/** Reads the unlock cookie from the current request. */
export async function isMediaUnlocked(): Promise<boolean> {
  const value = (await cookies()).get(COOKIE_NAME)?.value;
  if (!value) return false;
  const expected = expectedCookieValue();
  if (value.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(value), Buffer.from(expected));
  } catch {
    return false;
  }
}

/** Sets the unlock cookie on the response. Call from a server action. */
export async function setMediaUnlockCookie(): Promise<void> {
  (await cookies()).set(COOKIE_NAME, expectedCookieValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}
