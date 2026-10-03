"use client";

import { RotateCcw, Clock, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { PracticeKind, PracticeAttempt } from "@/contracts/dto";
import { cn } from "@/lib/client/utils";

interface PracticeAttemptHistoryProps {
  kind: PracticeKind;
  attempts: PracticeAttempt[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function formatRelative(date: string): string {
  try {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "vừa xong";
    if (mins < 60) return `${mins} phút trước`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} giờ trước`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days} ngày trước`;
    return d.toLocaleDateString("vi-VN");
  } catch {
    return date;
  }
}

function StatusIcon({ status }: { status: PracticeAttempt["status"] }) {
  switch (status) {
    case "submitted":
      return <Clock className="h-4 w-4 text-info" />;
    case "evaluating":
      return <Loader2 className="h-4 w-4 text-info animate-spin" />;
    case "evaluated":
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-error" />;
  }
}

export default function PracticeAttemptHistory({
  kind,
  attempts,
  selectedId,
  onSelect,
}: PracticeAttemptHistoryProps) {
  const filtered = attempts.filter((a) => a.kind === kind);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold text-foreground">
          Lịch sử {kind === "feynman" ? "Feynman" : "Blurting"}
        </h3>
        <Badge variant="secondary" size="sm">
          {filtered.length}
        </Badge>
      </div>
      <div className="overflow-y-auto max-h-64 border border-border rounded-lg bg-card">
        {filtered.length === 0 && (
          <div className="text-sm text-muted-foreground py-6 text-center">
            Chưa có lượt luyện tập nào.
          </div>
        )}
        {filtered.map((a) => {
          const isSelected = a.id === selectedId;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onSelect(a.id)}
              className={cn(
                "w-full flex flex-row items-center justify-between p-3 text-left border-b border-border/60 last:border-b-0 hover:bg-popover transition-colors",
                isSelected && "bg-popover border-l-2 border-l-primary"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Badge
                  variant={a.kind === "feynman" ? "default" : "secondary"}
                  size="sm"
                >
                  {a.kind === "feynman" ? "F" : "B"}
                </Badge>
                <div className="min-w-0 flex flex-col">
                  <span className="text-xs text-muted-foreground truncate">
                    {formatRelative(a.createdAt)}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    {a.referenceSnapshots.length} khái niệm
                    {a.retryOfId && (
                      <span className="inline-flex items-center gap-0.5 ml-1">
                        <RotateCcw className="h-3 w-3" />
                        retry
                      </span>
                    )}
                  </span>
                </div>
              </div>
              <StatusIcon status={a.status} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
