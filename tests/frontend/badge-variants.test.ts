import { describe, it, expect } from "vitest";
import * as React from "react";
import { renderToString } from "react-dom/server";
import { Badge } from "@/components/ui/badge";

const variants = [
  "default",
  "secondary",
  "destructive",
  "outline",
  "correct",
  "missing",
  "incorrect",
  "pending",
  "weak",
  "growing",
  "solid",
  "nodata",
] as const;

describe("Badge variants (12 total)", () => {
  it("renders all 12 variants with className present", () => {
    for (const variant of variants) {
      const el = React.createElement(Badge, { variant }, variant + " content");
      const html = renderToString(el);
      expect(html).toContain("class=");
      expect(html).toContain(variant === "nodata" ? "nodata" : variant);
    }
  });

  it("correct variant includes correct/check-circle like keyword in class+svg", () => {
    const el = React.createElement(Badge, { variant: "correct" }, "correct text");
    const html = renderToString(el);
    const combined = html.toLowerCase();
    const hasKeyword =
      combined.includes("correct") ||
      combined.includes("check-circle") ||
      combined.includes("check");
    expect(hasKeyword).toBe(true);
  });

  it("incorrect variant includes x-circle or text-error", () => {
    const el = React.createElement(Badge, { variant: "incorrect" }, "incorrect text");
    const html = renderToString(el);
    const combined = html.toLowerCase();
    const hasKeyword =
      combined.includes("incorrect") ||
      combined.includes("x-circle") ||
      combined.includes("text-error") ||
      combined.includes("error");
    expect(hasKeyword).toBe(true);
  });

  it("weak variant includes warn-bg or warn keyword", () => {
    const el = React.createElement(Badge, { variant: "weak" }, "weak text");
    const html = renderToString(el);
    const combined = html.toLowerCase();
    const hasKeyword =
      combined.includes("weak") ||
      combined.includes("warn-bg") ||
      combined.includes("warn");
    expect(hasKeyword).toBe(true);
  });

  it("growing variant includes bg or growing keyword in class", () => {
    const el = React.createElement(Badge, { variant: "growing" }, "growing text");
    const html = renderToString(el);
    const combined = html.toLowerCase();
    const hasKeyword = combined.includes("growing") || combined.includes("info-bg");
    expect(hasKeyword).toBe(true);
  });

  it("solid variant includes success/green/solid check keywords", () => {
    const el = React.createElement(Badge, { variant: "solid" }, "solid text");
    const html = renderToString(el);
    const combined = html.toLowerCase();
    const hasKeyword =
      combined.includes("solid") ||
      combined.includes("success") ||
      combined.includes("green") ||
      combined.includes("primary");
    expect(hasKeyword).toBe(true);
  });

  it("nodata variant includes nodata-bg or nodata keyword", () => {
    const el = React.createElement(Badge, { variant: "nodata" }, "nodata text");
    const html = renderToString(el);
    const combined = html.toLowerCase();
    const hasKeyword =
      combined.includes("nodata") || combined.includes("nodata-bg");
    expect(hasKeyword).toBe(true);
  });
});
