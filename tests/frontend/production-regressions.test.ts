import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import MarkdownRenderer from "@/components/markdown/MarkdownRenderer";
import { ToastItem } from "@/components/ui/toast";

it("removes dismissed notifications so they cannot cover the chat send button", () => {
  const toast = { id: "t", title: "Saved", open: false };
  expect(renderToStaticMarkup(React.createElement(ToastItem, { toast }))).toBe("");
  expect(renderToStaticMarkup(React.createElement(ToastItem, { toast: { ...toast, open: true } }))).toContain("Saved");
});

it("renders provider LaTeX delimiters and preserves commands inside list items", () => {
  const content = String.raw`- Inline: \(P(A\mid B)\).

\[
P(A\mid B)=\frac{P(A\cap B)}{P(B)}\,.
\]

- Dollar math: $x_{1} \cdot y$.

` + "Code: `\\(literal\\)`.";
  const html = renderToStaticMarkup(MarkdownRenderer({ children: content }));
  expect((html.match(/class="katex"/g) ?? []).length).toBe(3);
  expect(html).toContain("katex-display");
  expect(html).toContain(String.raw`\frac{P(A\cap B)}{P(B)}\,.`);
  expect(html).toContain(String.raw`x_{1} \cdot y`);
  expect(html).toContain("literal");
  expect(html).not.toContain("katex-error");
});
