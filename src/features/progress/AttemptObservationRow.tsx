"use client";

import Link from "next/link";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/client/utils";
import type { PracticeKind } from "@/contracts/dto";

interface AttemptObservationRowProps {
  attemptId: string;
  kind: PracticeKind;
  summary: string;
  sufficientEvidence: boolean;
  createdAt: string;
}

function relativeDateVietnamese(iso: string): string {
  try {
    const then = new Date(iso).getTime();
    const now = Date.now();
    const diffMs = then - now;
    const diffSec = Math.round(diffMs / 1000);
    const absSec = Math.abs(diffSec);

    const rtf = new Intl.RelativeTimeFormat("vi", { numeric: "auto" });

    if (absSec < 60) {
      return rtf.format(diffSec > 0 ? Math.ceil(diffSec) : Math.floor(diffSec), "second");
    }
    const diffMin = diffSec / 60;
    if (absSec < 3600) {
      return rtf.format(diffMin > 0 ? Math.ceil(diffMin) : Math.floor(diffMin), "minute");
    }
    const diffHr = diffMin / 60;
    if (absSec < 86400) {
      return rtf.format(diffHr > 0 ? Math.ceil(diffHr) : Math.floor(diffHr), "hour");
    }
    const diffDay = diffHr / 24;
    if (absSec < 2592000) {
      return rtf.format(diffDay > 0 ? Math.ceil(diffDay) : Math.floor(diffDay), "day");
    }
    const diffMonth = diffDay / 30;
    if (absSec < 31536000) {
      return rtf.format(diffMonth > 0 ? Math.ceil(diffMonth) : Math.floor(diffMonth), "month");
    }
    const diffYear = diffDay / 365;
    return rtf.format(diffYear > 0 ? Math.ceil(diffYear) : Math.floor(diffYear), "year");
  } catch {
    return iso;
  }
}

export default function AttemptObservationRow({
  attemptId,
  kind,
  summary,
  sufficientEvidence,
  createdAt,
}: AttemptObservationRowProps) {
  const kindLabel = kind === "feynman" ? "Feynman" : "Blurting";
  const kindVariant: "solid" | "growing" = kind === "feynman" ? "solid" : "growing";

  return (
    <li className={cn("p-2 rounded-md flex flex-col gap-2 hover:bg-popover border border-transparent hover:border-border transition-colors")}>
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant={kindVariant} size="sm">{kindLabel}</Badge>
        <Badge
          variant={sufficientEvidence ? "solid" : "weak"}
          size="sm"
          className="gap-1"
        >
          {sufficientEvidence ? (
            <>
              <CheckCircle2 className="w-3 h-3" />
              Đủ bằng chứng
            </>
          ) : (
            <>
              <AlertTriangle className="w-3 h-3" />
              Cần thêm bằng chứng
            </>
          )}
        </Badge>
        <span className="text-xs text-muted-foreground ml-auto">
          {relativeDateVietnamese(createdAt)}
        </span>
      </div>
      <p className="text-sm text-foreground line-clamp-2">{summary}</p>
      <div>
        <Link
          href={`/practice?attemptId=${encodeURIComponent(attemptId)}`}
          className="text-xs text-primary hover:underline inline-flex items-center gap-1"
        >
          Chi tiết
        </Link>
      </div>
    </li>
  );
}

export { relativeDateVietnamese };
