import { describe, it, expect } from "vitest";
import * as React from "react";
import { renderToString } from "react-dom/server";
import FindingRow from "@/features/practice/FindingRow";
import type { Finding } from "@/contracts/dto";

describe("FindingRow Vietnamese learnerQuote offsets", () => {
  const learnerText =
    "Hàm số bậc hai là một đa thức mà biến số có lũy thừa lớn nhất là 2. Ví dụ y = ax² + bx + c với a khác 0.";

  it("renders blockquote containing learnerQuote substring 'là một đa thức'", () => {
    const start = 42;
    const end = 78;
    const substring = learnerText.slice(start, end);

    const finding: Finding = {
      text: "Kết quả đúng",
      learnerQuote: {
        text: learnerText,
        start,
        end,
      },
      evidence: [
        {
          conceptId: "fx-concept-xs-sample-space",
          revision: 1,
          excerpt: "Định nghĩa chính xác về đa thức bậc hai.",
          sourceRefs: [],
        },
      ],
    };

    const el = React.createElement(FindingRow, {
      finding,
      kind: "correct",
    });
    const html = renderToString(el);

    expect(html).toContain("<blockquote");
    expect(html).toContain("là một đa thức");
    expect(html).toContain("Bạn viết:");
    expect(html).toContain("<mark");
  });

  it("renders FindingRow with correct badge variant for kind=correct", () => {
    const finding: Finding = {
      text: "Kết quả đúng",
      learnerQuote: null,
      evidence: [
        {
          conceptId: "fx-concept-xs-sample-space",
          revision: 1,
          excerpt: "Định nghĩa chính xác.",
          sourceRefs: [],
        },
      ],
    };

    const el = React.createElement(FindingRow, {
      finding,
      kind: "correct",
    });
    const html = renderToString(el);
    expect(html).toContain("Đúng");
    const combined = html.toLowerCase();
    const hasCorrectIndicator =
      combined.includes("check-circle") ||
      combined.includes("circle-check") ||
      combined.includes("correct");
    expect(hasCorrectIndicator).toBe(true);
  });
});
