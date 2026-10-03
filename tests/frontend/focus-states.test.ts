import { describe, it, expect } from "vitest";
import * as React from "react";
import { renderToString } from "react-dom/server";
import { Button } from "@/components/ui/button";
import SidebarNavItem from "@/components/layout/SidebarNavItem";
import ModeSelector from "@/features/session/ModeSelector";
import { BookOpen } from "lucide-react";

describe("Focus/keyboard state classes", () => {
  it("Button variant=primary renders focus ring classes and is a focusable button tag", () => {
    const el = React.createElement(
      Button,
      { variant: "primary" },
      "Primary Button"
    );
    const html = renderToString(el);
    expect(html).toContain("<button");
    expect(html).toContain("class=");
    const combined = html.toLowerCase();
    const hasFocusIndicator =
      combined.includes("focus-visible") ||
      combined.includes("ring") ||
      combined.includes("focus") ||
      combined.includes("outline");
    expect(hasFocusIndicator).toBe(true);
    expect(combined).not.toContain('tabindex="-1"');
    expect(html).not.toMatch(/\sdisabled(?:=|>|\s)/);
  });

  it("SidebarNavItem renders anchor tag with href and focusable", () => {
    const el = React.createElement(SidebarNavItem, {
      href: "/practice",
      icon: BookOpen,
      label: "Tự kiểm tra",
      selected: true,
    });
    const html = renderToString(el);
    expect(html).toContain("<a");
    expect(html).toContain('href="/practice"');
    const combined = html.toLowerCase();
    expect(combined).toContain("tự kiểm tra");
    expect(combined).not.toContain('tabindex="-1"');
  });

  it("SidebarNavItem selected applies selection class bg-popover or text-foreground", () => {
    const el = React.createElement(SidebarNavItem, {
      href: "/practice",
      icon: BookOpen,
      label: "Tự kiểm tra",
      selected: true,
    });
    const html = renderToString(el);
    const combined = html.toLowerCase();
    const hasSelectionClass =
      combined.includes("bg-popover") ||
      combined.includes("text-foreground") ||
      combined.includes("text-primary");
    expect(hasSelectionClass).toBe(true);
  });

  it("ModeSelector renders 3 focusable button chips (socratic/solve/ask)", () => {
    const onChange = (_m: "socratic" | "solve" | "ask") => {};
    const el = React.createElement(ModeSelector, {
      value: "solve",
      onChange,
    });
    const html = renderToString(el);
    const buttonCount = (html.match(/<button/g) || []).length;
    expect(buttonCount).toBe(3);
    expect(html).toContain("Socratic");
    expect(html).toContain("Giải bài");
    expect(html).toContain("Hỏi nhanh");
    const combined = html.toLowerCase();
    expect(combined).not.toContain('tabindex="-1"');
  });
});
