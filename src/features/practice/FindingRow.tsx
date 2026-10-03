"use client";

import {
  Eye,
  CheckCircle2,
  CircleDashed,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Finding } from "@/contracts/dto";
import EvidenceQuote from "./EvidenceQuote";

type FindingKind = "observation" | "correct" | "missing" | "incorrect";

interface FindingRowProps {
  finding: Finding;
  kind?: FindingKind;
}

const kindConfig: Record<
  FindingKind,
  { label: string; variant: "default" | "correct" | "missing" | "incorrect" | "secondary"; Icon: typeof Eye }
> = {
  observation: { label: "Nhận xét", variant: "default", Icon: Eye },
  correct: { label: "Đúng", variant: "correct", Icon: CheckCircle2 },
  missing: { label: "Thiếu", variant: "missing", Icon: CircleDashed },
  incorrect: { label: "Sai", variant: "incorrect", Icon: XCircle },
};

function renderQuote(text: string, start: number | null, end: number | null) {
  if (start === null || end === null || start < 0 || end > text.length || start >= end) {
    return <span>{text}</span>;
  }
  return (
    <>
      {text.slice(0, start)}
      <mark className="bg-warn/20 rounded px-0.5 text-foreground">
        {text.slice(start, end)}
      </mark>
      {text.slice(end)}
    </>
  );
}

export default function FindingRow({ finding, kind = "observation" }: FindingRowProps) {
  const cfg = kindConfig[kind];
  const Icon = cfg.Icon;

  return (
    <Card className="flex flex-col gap-2 p-3 mb-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant={cfg.variant as "default" | "correct" | "missing" | "incorrect" | "secondary"} size="sm" className="gap-1">
          <Icon className="h-3 w-3" />
          {cfg.label}
        </Badge>
        <div className="font-medium text-sm text-foreground">
          {finding.text}
        </div>
      </div>

      {finding.learnerQuote && (
        <blockquote className="border-l-2 border-warn pl-4 italic mt-2 my-2 text-sm">
          <span className="not-italic font-medium text-muted-foreground mr-1">
            Bạn viết:
          </span>
          {renderQuote(
            finding.learnerQuote.text,
            finding.learnerQuote.start,
            finding.learnerQuote.end
          )}
        </blockquote>
      )}

      {finding.evidence && finding.evidence.length > 0 && (
        <div className="flex flex-col gap-2 mt-1">
          {finding.evidence.map((ev, idx) => (
            <EvidenceQuote
              key={idx}
              conceptId={ev.conceptId}
              revision={ev.revision}
              excerpt={ev.excerpt}
              sourceRefs={ev.sourceRefs}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
