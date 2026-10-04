"use client";

import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { PracticeEvaluation, FeynmanResult } from "@/contracts/dto";
import FindingRow from "./FindingRow";
import { cn } from "@/lib/client/utils";

interface FeynmanFeedbackProps {
  evaluation: PracticeEvaluation;
}

interface ScoreCardProps {
  label: string;
  score: number | null;
  insufficient: boolean;
}

function ScoreCard({ label, score, insufficient }: ScoreCardProps) {
  return (
    <div className="min-w-0 rounded-lg border border-border/70 bg-sidebar p-3 sm:p-4">
      <h4 className="text-xs font-medium text-muted-foreground">{label}</h4>
      <p className={cn("mt-2 text-2xl font-semibold tabular-nums", insufficient ? "text-muted-foreground" : "text-foreground")}>
        {insufficient || score === null ? "—" : <>{score}<span className="ml-1 text-xs font-normal text-muted-foreground">/10</span></>}
      </p>
    </div>
  );
}

export default function FeynmanFeedback({ evaluation }: FeynmanFeedbackProps) {
  const result = evaluation.result;
  if (result.kind !== "feynman") return null;

  const feynman = result as FeynmanResult;
  const insufficient = !feynman.sufficientEvidence;

  return (
    <div className="flex flex-col gap-5">
      {insufficient && (
        <div className="rounded-lg border border-border/60 bg-popover p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-warn shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <div className="font-semibold text-foreground">
              Không đủ bằng chứng để chấm điểm
            </div>
            <div className="text-muted-foreground mt-1">
              Xem nhận xét chi tiết bên dưới để biết thêm.
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <ScoreCard
          label="Rõ ràng"
          score={feynman.scores.clarity}
          insufficient={insufficient}
        />
        <ScoreCard
          label="Đầy đủ"
          score={feynman.scores.completeness}
          insufficient={insufficient}
        />
        <ScoreCard
          label="Chính xác"
          score={feynman.scores.accuracy}
          insufficient={insufficient}
        />
      </div>

      {feynman.summary && (
        <Card className="p-4">
          <div className="text-xs font-medium text-muted-foreground mb-1">
            Tóm tắt nhận xét
          </div>
          <div className="text-sm text-foreground leading-6">
            {feynman.summary}
          </div>
        </Card>
      )}

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-semibold text-foreground">Nhận xét chi tiết</h3>
          <Badge variant="secondary" size="sm">
            {feynman.observations.length} mục
          </Badge>
        </div>
        <div className="space-y-2 mt-1">
          {feynman.observations.length === 0 && (
            <div className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
              Không có nhận xét nào.
            </div>
          )}
          {feynman.observations.map((f, idx) => (
            <FindingRow key={idx} finding={f} kind="observation" />
          ))}
        </div>
      </div>
    </div>
  );
}
