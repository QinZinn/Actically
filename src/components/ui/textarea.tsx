"use client";

import * as React from "react";
import { cn } from "@/lib/client/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, disabled, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[120px] w-full min-w-0 resize-y rounded-lg border border-input bg-sidebar/50 px-3 py-3 text-base sm:text-sm shadow-sm transition-colors placeholder:text-muted-foreground outline-none ring-0 focus:border-primary focus:shadow-[0_0_0_3px_var(--focus-halo)] duration-150 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        disabled={disabled}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
