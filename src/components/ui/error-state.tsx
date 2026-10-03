"use client";

import * as React from "react";
import { XCircle } from "lucide-react";
import { cn } from "@/lib/client/utils";
import { Button } from "@/components/ui/button";

interface ErrorStateProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: React.ReactNode;
  body?: React.ReactNode;
  retryLabel?: React.ReactNode;
  onRetry?: () => void;
  secondaryLabel?: React.ReactNode;
  onSecondary?: () => void;
  variant?: "default" | "compact";
}

function ErrorState({
  title,
  body,
  retryLabel = "Thử lại",
  onRetry,
  secondaryLabel,
  onSecondary,
  variant = "default",
  className,
  ...props
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-lg border p-4 flex flex-col bg-[var(--error-bg)] border-[var(--error-border)]",
        variant === "compact" ? "p-3" : "p-4",
        className
      )}
      style={{
        gap: variant === "compact" ? "8px" : "12px",
      }}
      {...props}
    >
      <div className="flex items-start gap-3">
        <XCircle className="h-[18px] w-[18px] text-error shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="font-semibold text-foreground text-sm">{title}</div>
          {body && (
            <div className="text-sm text-muted-foreground">{body}</div>
          )}
        </div>
      </div>
      {(onRetry || secondaryLabel) && (
        <div
          className="flex flex-wrap items-center gap-2"
          style={{ marginLeft: "42px" }}
        >
          {onRetry && (
            <Button size="sm" variant="primary" onClick={onRetry}>
              {retryLabel}
            </Button>
          )}
          {secondaryLabel && onSecondary && (
            <Button size="sm" variant="secondary" onClick={onSecondary}>
              {secondaryLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export { ErrorState };
