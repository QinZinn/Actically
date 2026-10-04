"use client";

import * as React from "react";
import { MessageCircleQuestion } from "lucide-react";
import type { SolveResult } from "@/contracts/dto";
import { Button } from "@/components/ui/button";
import MarkdownRenderer from "@/components/markdown/MarkdownRenderer";

interface SolveStepsProps {
  solve: SolveResult;
  onFollowUpStep?: (stepNumber: number) => void;
}

export default function SolveSteps({ solve, onFollowUpStep }: SolveStepsProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Các bước giải</h3>
      <ol className="space-y-4">
        {solve.steps.map((step) => (
          <li key={step.number} className="flex min-w-0 gap-3 rounded-xl border border-border/70 bg-card p-4 sm:p-5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-sm font-semibold text-primary">
              {step.number}
            </span>
            <div className="min-w-0 flex-1 space-y-3">
              <div className="font-medium text-foreground">
                <MarkdownRenderer>{step.action}</MarkdownRenderer>
              </div>
              <div className="text-foreground">
                <MarkdownRenderer>{step.explanation}</MarkdownRenderer>
              </div>
              <div className="rounded-lg border-l-2 border-primary/60 bg-sidebar p-3 text-sm">
                <p className="mb-1 text-xs font-medium text-muted-foreground">Nguyên tắc / Công thức</p>
                <MarkdownRenderer>{step.principle}</MarkdownRenderer>
              </div>
              {onFollowUpStep && (
                <Button
                  size="sm"
                  variant="outline"
                  className="max-w-full gap-2 whitespace-normal text-left"
                  onClick={() => onFollowUpStep(step.number)}
                >
                  <MessageCircleQuestion className="size-4" />
                  Giải thích thêm bước {step.number}
                </Button>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
