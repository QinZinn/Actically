"use client";

import { CheckCircle2, CircleDashed, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { PracticeEvaluation, BlurtingResult } from "@/contracts/dto";
import FindingRow from "./FindingRow";
import { cn } from "@/lib/client/utils";

interface BlurtingResultsProps {
  evaluation: PracticeEvaluation;
}

export default function BlurtingResults({ evaluation }: BlurtingResultsProps) {
  const result = evaluation.result;
  if (result.kind !== "blurting") return null;

  const blurting = result as BlurtingResult;
  const { correct, missing, incorrect } = blurting;

  return (
    <div className="flex flex-col gap-4">
      {blurting.summary && (
        <div className="rounded-lg border border-border/60 bg-popover p-4">
          <div className="text-xs font-medium text-muted-foreground mb-1">
            Tóm tắt
          </div>
          <div className="text-sm text-foreground leading-6">
            {blurting.summary}
          </div>
        </div>
      )}

      <div className="concept-grid">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 px-1">
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
            <h3 className="font-semibold text-foreground">Nhớ đúng</h3>
            <Badge variant="correct" size="sm">
              {correct.length}
            </Badge>
          </div>
          <div className="space-y-2 min-h-[100px]">
            {correct.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center border border-dashed border-border rounded-lg">
                Không có nội dung nào nhớ đúng.
              </div>
            ) : (
              correct.map((f, idx) => (
                <FindingRow key={idx} finding={f} kind="correct" />
              ))
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 px-1">
            <CircleDashed className="h-5 w-5 text-warn shrink-0" />
            <h3 className={cn("font-semibold", "text-warn")}>Còn thiếu</h3>
            <Badge variant="missing" size="sm">
              {missing.length}
            </Badge>
          </div>
          <div className="space-y-2 min-h-[100px]">
            {missing.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center border border-dashed border-border rounded-lg">
                Tuyệt vời! Không thiếu gì.
              </div>
            ) : (
              missing.map((f, idx) => (
                <FindingRow key={idx} finding={f} kind="missing" />
              ))
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 px-1">
            <XCircle className="h-5 w-5 text-error shrink-0" />
            <h3 className="font-semibold text-error">Cần sửa</h3>
            <Badge variant="incorrect" size="sm">
              {incorrect.length}
            </Badge>
          </div>
          <div className="space-y-2 min-h-[100px]">
            {incorrect.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center border border-dashed border-border rounded-lg">
                Không có lỗi nào!
              </div>
            ) : (
              incorrect.map((f, idx) => (
                <FindingRow key={idx} finding={f} kind="incorrect" />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
