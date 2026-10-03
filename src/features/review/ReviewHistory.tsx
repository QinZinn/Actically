"use client";

import { RotateCcw, BrainCircuit, ThumbsUp, Sparkles, Clock } from "lucide-react";
import type { ComponentType } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { reviewRatingSchema, reviewEventSchema } from "@/contracts/dto";
import type { z } from "zod";
import { cn } from "@/lib/client/utils";

type ReviewRating = z.infer<typeof reviewRatingSchema>;
type ReviewEvent = z.infer<typeof reviewEventSchema>;

interface ReviewHistoryProps {
  events: ReviewEvent[];
  timezone?: string;
  selectedEventId?: string | null;
}

const ratingMeta: Record<
  ReviewRating,
  { label: string; variant: "default"; Icon: ComponentType<{ className?: string }> }
> = {
  again: { label: "Lại", variant: "default", Icon: RotateCcw },
  hard: { label: "Khó", variant: "default", Icon: BrainCircuit },
  good: { label: "OK", variant: "default", Icon: ThumbsUp },
  easy: { label: "Dễ", variant: "default", Icon: Sparkles },
};

function formatTime(date: string, timezone: string): string {
  try {
    return new Date(date).toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      timeZone: timezone,
    });
  } catch {
    return date;
  }
}

const ratingVariants: Record<ReviewRating, "destructive" | "weak" | "growing" | "default"> = {
  again: "destructive",
  hard: "weak",
  good: "growing",
  easy: "default",
};

export default function ReviewHistory({ events, timezone = "Asia/Ho_Chi_Minh", selectedEventId }: ReviewHistoryProps) {
  const sorted = [...events].sort(
    (a, b) => new Date(b.reviewedAt).getTime() - new Date(a.reviewedAt).getTime()
  );

  if (sorted.length === 0) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        Chưa có lịch sử ôn tập nào.
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1 mb-1">
        <h3 className="text-sm font-semibold text-foreground">
          Lịch sử ôn gần đây
        </h3>
        <Badge variant="secondary" size="sm">
          {sorted.length}
        </Badge>
      </div>
      <div className="max-h-64 overflow-y-auto border border-border rounded-lg bg-card">
        {sorted.map((ev) => {
          const meta = ratingMeta[ev.rating];
          const Icon = meta.Icon;
          return (
            <div
              key={ev.id}
              id={"review-event-" + ev.id}
              className={cn(
                "flex items-center justify-between gap-2 p-3 border-b border-border/60 last:border-b-0",
                selectedEventId === ev.id && "bg-primary/10 ring-2 ring-primary"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Badge
                  variant={ratingVariants[ev.rating]}
                  size="sm"
                  className="gap-1 shrink-0"
                >
                  <Icon className="h-3 w-3" />
                  {meta.label}
                </Badge>
                <div className="text-xs text-muted-foreground truncate">
                  Card {ev.cardId.slice(0, 8)}
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                <Clock className="h-3 w-3" />
                {formatTime(ev.reviewedAt, timezone)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
