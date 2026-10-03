"use client";

import * as React from "react";
import { cn } from "@/lib/client/utils";

interface EmptyStateProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}

function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center w-full py-12 px-6",
        className
      )}
      style={{ gap: "12px" }}
      {...props}
    >
      {icon && (
        <div
          className="text-muted-foreground [&_svg]:w-10 [&_svg]:h-10"
          style={{ width: "40px", height: "40px" }}
        >
          {icon}
        </div>
      )}
      <div className="text-base font-semibold text-foreground">{title}</div>
      {description && (
        <div className="text-sm text-muted-foreground max-w-sm">
          {description}
        </div>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export { EmptyState };
