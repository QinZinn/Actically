"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";

interface DuplicateWarning {
  title: string;
  existingConceptId: string;
}

interface DuplicateWarningBannerProps {
  warnings: DuplicateWarning[];
}

export default function DuplicateWarningBanner({
  warnings,
}: DuplicateWarningBannerProps) {
  if (warnings.length === 0) return null;

  return (
    <div
      role="alert"
      className="rounded-lg border border-[var(--warn)]/40 bg-[var(--warn-bg)] p-4 flex flex-col gap-2"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-warn shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="font-semibold text-foreground text-sm">
            Phát hiện khái niệm trùng lặp
          </div>
          <div className="text-sm text-muted-foreground mt-1 flex flex-col gap-1">
            {warnings.map((w, idx) => (
              <div key={idx} className="flex items-center gap-2 flex-wrap">
                <span>
                  Khái niệm <b className="text-foreground">{w.title}</b> trùng
                  với khái niệm đã tồn tại.
                </span>
                <Link
                  href={`/knowledge?id=${w.existingConceptId}`}
                  className="inline-flex items-center gap-1 text-primary text-xs font-medium hover:underline"
                >
                  Xem khái niệm gốc
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
