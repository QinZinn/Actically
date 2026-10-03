"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/client/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center gap-1 font-medium whitespace-nowrap shrink-0 transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-primary/14 text-primary border border-primary/30",
        secondary:
          "bg-popover text-foreground border border-border",
        outline: "border border-border",
        weak:
          "bg-[var(--warn-bg)] text-warn border border-[var(--warn)]/40",
        growing:
          "bg-[var(--info-bg)] text-info border border-[var(--info-border)]",
        solid:
          "bg-primary/20 text-primary border border-primary/30",
        nodata: "bg-[var(--nodata-bg)] text-muted-foreground",
        correct: "border border-border/60 text-foreground",
        missing:
          "border border-dashed border-[var(--warn-dashed)] text-warn",
        incorrect:
          "border border-solid border-[var(--error)]/40 text-error",
        pending:
          "bg-[var(--info-bg)] text-info border border-[var(--info-border)]",
        destructive: "bg-[var(--error)]/10 text-error",
      },
      size: {
        sm: "h-[22px] px-2 text-xs rounded",
        md: "h-[26px] px-2.5 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div
      className={cn(badgeVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
