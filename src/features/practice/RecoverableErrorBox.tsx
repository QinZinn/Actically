"use client";

import { AlertTriangle, RotateCcw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/client/utils";

interface RecoverableErrorBoxProps {
  title: string;
  body?: string;
  onRetry: () => void;
  onBackToWriter: () => void;
  className?: string;
}

export default function RecoverableErrorBox({
  title,
  body,
  onRetry,
  onBackToWriter,
  className,
}: RecoverableErrorBoxProps) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-lg border p-4 flex flex-col bg-[var(--error-bg)] border-[var(--error-border)] gap-3",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-[18px] w-[18px] text-error shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="font-semibold text-foreground text-sm">{title}</div>
          {body && (
            <div className="text-sm text-muted-foreground">{body}</div>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 ml-[42px]">
        <Button size="sm" variant="primary" onClick={onRetry} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Gửi lại
        </Button>
        <Button size="sm" variant="secondary" onClick={onBackToWriter} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Quay lại bài viết
        </Button>
      </div>
    </div>
  );
}
