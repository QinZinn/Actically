"use client";

import { AlertTriangle, TrendingUp, CheckCircle2, CircleDashed, LayoutGrid, FilePenLine } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { TopicProgress } from "@/contracts/dto";
import AttemptObservationRow, { relativeDateVietnamese } from "./AttemptObservationRow";

interface TopicProgressCardProps {
  topic: TopicProgress;
}

type ProgressStatus = TopicProgress["status"];
type ReviewRating = TopicProgress["reviewEvidence"][number]["rating"];

const STATUS_CONFIG: Record<
  ProgressStatus,
  { label: string; icon: typeof AlertTriangle; variant: "weak" | "growing" | "solid" | "nodata" }
> = {
  weak: { label: "Cần củng cố", icon: AlertTriangle, variant: "weak" },
  growing: { label: "Đang tiến bộ", icon: TrendingUp, variant: "growing" },
  solid: { label: "Vững", icon: CheckCircle2, variant: "solid" },
  nodata: { label: "Chưa đủ dữ liệu", icon: CircleDashed, variant: "nodata" },
};

const RATING_VARIANT: Record<ReviewRating, "destructive" | "weak" | "growing" | "solid"> = {
  again: "destructive",
  hard: "weak",
  good: "growing",
  easy: "solid",
};

const RATING_LABEL: Record<ReviewRating, string> = {
  again: "Again",
  hard: "Hard",
  good: "Good",
  easy: "Easy",
};

export default function TopicProgressCard({ topic }: TopicProgressCardProps) {
  const cfg = STATUS_CONFIG[topic.status];
  const StatusIcon = cfg.icon;
  const topEvidence = topic.reviewEvidence.slice(0, 5);

  return (
    <Card className="shadow hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold text-base truncate flex-1 min-w-0">
            {topic.title}
          </h3>
          <Badge variant={cfg.variant} className="shrink-0 h-7 px-3">
            <StatusIcon className="w-4 h-4" />
            {cfg.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-4">
          <span>
            Số thẻ đủ điều kiện:{" "}
            <span className="text-foreground font-medium">
              {topic.eligibleCardCount}/{topic.totalCardCount}
            </span>
          </span>
          <span>
            Lần đã ôn:{" "}
            <span className="text-foreground font-medium">
              {topic.reviewCount}
            </span>
          </span>
          <span>
            Đánh giá cuối:{" "}
            <span className="text-foreground font-medium">
              {topic.latestAssessmentAt
                ? relativeDateVietnamese(topic.latestAssessmentAt)
                : "Chưa đánh giá lần nào"}
            </span>
          </span>
        </div>

        <div className="flex flex-col gap-3">
          <details className="group">
            <summary className="flex items-center gap-1 text-sm cursor-pointer list-none hover:text-foreground text-muted-foreground transition-colors">
              <LayoutGrid className="w-4 h-4" />
              Bằng chứng ôn tập ({topic.reviewEvidence.length})
              <span className="ml-auto text-xs opacity-60 group-open:rotate-90 transition-transform">›</span>
            </summary>
            <ul className="mt-3 space-y-2 pl-5">
              {topEvidence.length === 0 ? (
                <li className="text-xs text-muted-foreground italic">
                  Chưa có bằng chứng ôn tập.
                </li>
              ) : (
                topEvidence.map((ev) => (
                  <li
                    key={ev.id}
                    className="flex items-center gap-2 text-xs py-1 border-b border-border/50 last:border-0"
                  >
                    <Badge variant={RATING_VARIANT[ev.rating]} size="sm" className="shrink-0">
                      {RATING_LABEL[ev.rating]}
                    </Badge>
                    <span className="text-muted-foreground">
                      {relativeDateVietnamese(ev.reviewedAt)}
                    </span>
                    <Link href={`/review?eventId=${encodeURIComponent(ev.id)}`} className="text-primary underline ml-auto">Xem lượt ôn</Link>
                  </li>
                ))
              )}
            </ul>
          </details>

          <details className="group">
            <summary className="flex items-center gap-1 text-sm cursor-pointer list-none hover:text-foreground text-muted-foreground transition-colors">
              <FilePenLine className="w-4 h-4" />
              Quan sát phân tích ({topic.assessmentObservations.length})
              <span className="ml-auto text-xs opacity-60 group-open:rotate-90 transition-transform">›</span>
            </summary>
            <ul className="mt-3 space-y-2 pl-5">
              {topic.assessmentObservations.length === 0 ? (
                <li className="text-xs text-muted-foreground italic">
                  Chưa có quan sát phân tích.
                </li>
              ) : (
                topic.assessmentObservations.map((obs) => (
                  <AttemptObservationRow
                    key={obs.attemptId}
                    attemptId={obs.attemptId}
                    kind={obs.kind}
                    summary={obs.summary}
                    sufficientEvidence={obs.sufficientEvidence}
                    createdAt={obs.createdAt}
                  />
                ))
              )}
            </ul>
          </details>
        </div>
      </CardContent>
    </Card>
  );
}
