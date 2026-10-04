"use client";

import * as React from "react";
import { cn } from "@/lib/client/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, disabled, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full min-w-0 rounded-lg border border-input bg-sidebar/50 px-3 text-base sm:text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground outline-none ring-0 focus:border-primary focus:shadow-[0_0_0_3px_var(--focus-halo)] duration-150 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        disabled={disabled}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
