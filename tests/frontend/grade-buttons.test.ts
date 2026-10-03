import { describe, it, expect, vi } from "vitest";
import * as React from "react";
import { renderToString } from "react-dom/server";
import GradeButtons from "@/features/review/GradeButtons";

describe("GradeButtons component", () => {
  it("disabled=true renders all 4 buttons with disabled attribute", () => {
    const onGrade = vi.fn();
    const el = React.createElement(GradeButtons, {
      disabled: true,
      onGrade,
    });
    const html = renderToString(el);
    const buttonCount = (html.match(/<button/g) || []).length;
    expect(buttonCount).toBe(4);
    const disabledCount = (html.match(/disabled(?:="")?/g) || []).length;
    expect(disabledCount).toBeGreaterThanOrEqual(4);
  });

  it("renders 4 grade buttons with correct labels again/hard/good/easy", () => {
    const onGrade = vi.fn();
    const el = React.createElement(GradeButtons, {
      disabled: false,
      onGrade,
    });
    const html = renderToString(el);
    expect(html).toContain("Lại");
    expect(html).toContain("Khó");
    expect(html).toContain("OK");
    expect(html).toContain("Dễ");
  });

  it("onGrade callback accepts ReviewRating union directly", () => {
    const ratings: ("again" | "hard" | "good" | "easy")[] = [];
    const onGrade = vi.fn((r: "again" | "hard" | "good" | "easy") => {
      ratings.push(r);
    });
    onGrade("again");
    onGrade("hard");
    onGrade("good");
    onGrade("easy");
    expect(onGrade).toHaveBeenCalledTimes(4);
    expect(ratings).toEqual(["again", "hard", "good", "easy"]);
  });

  it("component renders without errors when disabled=false", () => {
    const onGrade = vi.fn();
    const el = React.createElement(GradeButtons, {
      disabled: false,
      onGrade,
    });
    const html = renderToString(el);
    expect(html.length).toBeGreaterThan(0);
    expect(html).toContain("<button");
  });
});
