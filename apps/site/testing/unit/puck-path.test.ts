import { describe, expect, it } from "vitest";
import { puckPathToKey } from "@/lib/puck-path";

describe("puckPathToKey", () => {
  it("maps an empty catch-all segment to the root key", () => {
    expect(puckPathToKey([])).toBe("/");
    expect(puckPathToKey(undefined)).toBe("/");
  });

  it("prefixes a single segment with a leading slash", () => {
    expect(puckPathToKey(["about"])).toBe("/about");
  });

  it("joins multiple segments with slashes", () => {
    expect(puckPathToKey(["groups", "pio", "latest"])).toBe("/groups/pio/latest");
  });

  it("does not strip, escape, or re-encode segments", () => {
    // Next.js already URL-decodes params before handing them to the route,
    // so the helper deliberately passes them through verbatim.
    expect(puckPathToKey(["über-uns"])).toBe("/über-uns");
  });
});
