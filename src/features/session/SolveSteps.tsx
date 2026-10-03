"use client";

import * as React from "react";
import { ChevronRight, ListOrdered } from "lucide-react";
import type { SolveResult } from "@/contracts/dto";
import { Button } from "@/components/ui/button";
import MarkdownRenderer from "@/components/markdown/MarkdownRenderer";

interface SolveStepsProps {
  solve: SolveResult;
  onFollowUpStep?: (stepNumber: number) => void;
}

export default function SolveSteps({ solve, onFollowUpStep }: SolveStepsProps) {
  return (
    <div className="mt-4">
      <h4 className="font-semibold mb-3">Các bước giải</h4>
      <ol className="list-decimal space-y-4 pl-5">
        {solve.steps.map((step) => (
          <li key={step.number} className="mb-2">
            <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold inline-flex mr-3">
              {step.number}
            </span>
            <div className="mt-1 ml-10 space-y-1">
              <div className="font-medium text-primary">
                Hành động: <MarkdownRenderer>{step.action}</MarkdownRenderer>
              </div>
              <div className="text-foreground">
                Giải thích: <MarkdownRenderer>{step.explanation}</MarkdownRenderer>
              </div>
              <div className="bg-card border border-border rounded-lg p-3 text-sm">
                <span className="font-semibold">Nguyên tắc / Công thức:</span>{" "}
                <MarkdownRenderer>{step.principle}</MarkdownRenderer>
              </div>
              {onFollowUpStep && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 gap-1"
                  onClick={() => onFollowUpStep(step.number)}
                >
                  Xin giải thích rõ hơn
                  <ListOrdered className="w-4 h-4" />
                  bước {step.number}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
