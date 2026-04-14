import type { PageData } from "../config/page.config";
import { applySectionTheming } from "../lib/section-theming";
import { describe, expect, test } from "vitest";

describe("applySectionTheming", () => {
  test("alternate sun/mud themes divided by SectionDivider", () => {
    const data = {
      content: [
        { type: "TextBlock", props: { id: "", heading: "", body: "" } },
        { type: "SectionDivider", props: { id: "" } },
        { type: "TextBlock", props: { id: "", heading: "", body: "" } },
        { type: "SectionDivider", props: { id: "" } },
        { type: "TextBlock", props: { id: "", heading: "", body: "" } },
      ],
      root: { props: { title: "Test Page" } },
    } as PageData;

    const result = applySectionTheming(data);

    expect(result.data.content.map(item => item.props)).toEqual([
      expect.objectContaining({ theme: "mud" }),
      expect.objectContaining({ theme: "sun" }),
      expect.objectContaining({ theme: "sun" }),
      expect.objectContaining({ theme: "mud" }),
      expect.objectContaining({ theme: "mud" }),
    ]);
  });
});
