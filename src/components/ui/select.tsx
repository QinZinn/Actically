"use client";

import * as React from "react";
import { cn } from "@/lib/client/utils";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, disabled, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        disabled={disabled}
        className={cn(
          "flex h-[38px] w-full appearance-none rounded-lg border border-input bg-sidebar/50 px-3 pr-8 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground outline-none ring-0 focus:border-primary focus:shadow-[0_0_0_3px_var(--focus-halo)] duration-150 disabled:cursor-not-allowed disabled:opacity-50 bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2216%22%20height=%2216%22%20viewBox=%220%200%2024%2024%22%20fill=%22none%22%20stroke=%22%23A8B2A0%22%20stroke-width=%222%22%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22%3E%3Cpolyline%20points=%226%209%2012%2015%2018%209%22/%3E%3C/svg%3E')] bg-no-repeat bg-[right_10px_center]",
          className
        )}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = "Select";

export { Select };
