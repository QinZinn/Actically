"use client";

import * as React from "react";
import { cn } from "@/lib/client/utils";

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement> & {}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        "text-sm font-medium text-foreground mb-1.5 block leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className
      )}
      {...props}
    />
  )
);
Label.displayName = "Label";

export { Label };
