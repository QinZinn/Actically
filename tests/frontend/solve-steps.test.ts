import { describe, it, expect, vi } from "vitest";
import * as React from "react";
import { renderToString } from "react-dom/server";
import type { SolveResult } from "@/contracts/dto";
import SolveSteps from "@/features/session/SolveSteps";

const stubSolve: SolveResult = {
  steps: [
    {
      number: 1,
      action: "Đặt ký hiệu các biến cố",
      explanation: "Gọi A, B là các biến cố tương ứng.",
      principle: "Mô hình hóa bài toán.",
    },
    {
      number: 2,
      action: "Nhận dạng yêu cầu",
      explanation: "Xác định đây là xác suất có điều kiện.",
      principle: "Định nghĩa P(A|B).",
    },
    {
      number: 3,
      action: "Tính toán và kết luận",
      explanation: "Thay số vào công thức và rút gọn.",
      principle: "Công thức nhân.",
    },
  ],
  comprehensionCheck: "Kiểm tra lại ví dụ.",
  sourceRefs: [],
};

describe("SolveSteps component", () => {
  function stripHtmlComments(s: string): string {
    return s.replace(/<!--[\s\S]*?-->/g, "");
  }

  it("renders heading Các bước giải and 3 steps", () => {
    const el = React.createElement(SolveSteps, { solve: stubSolve });
    const rawHtml = renderToString(el);
    const html = stripHtmlComments(rawHtml);
    expect(html).toContain("Các bước giải");
    expect(html).toContain(">1<");
    expect(html).toContain(">2<");
    expect(html).toContain(">3<");
    expect(html).toContain("Đặt ký hiệu các biến cố");
    expect(html).toContain("Nhận dạng yêu cầu");
    expect(html).toContain("Tính toán và kết luận");
  });

  it("onFollowUpStep passed as function renders step 2 follow-up button", () => {
    const onFollowUpStep = vi.fn();
    const el = React.createElement(SolveSteps, {
      solve: stubSolve,
      onFollowUpStep,
    });
    const rawHtml = renderToString(el);
    const html = stripHtmlComments(rawHtml);
    expect(html).toContain("Xin giải thích rõ hơn");
    expect(html).toContain("bước 2");
    expect(html).toContain("bước 1");
    expect(html).toContain("bước 3");
    expect(typeof onFollowUpStep).toBe("function");
  });
});
