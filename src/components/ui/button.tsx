"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/client/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground hover:brightness-110",
        secondary:
          "bg-card text-foreground border border-border hover:bg-popover",
        ghost: "hover:bg-accent text-foreground",
        outline: "border border-border bg-transparent",
        danger: "bg-[var(--error)] text-white",
        "grade-again":
          "bg-red-500/10 text-error border border-[var(--error-border)] hover:bg-[var(--error)]/20",
        "grade-hard":
          "bg-orange-500/10 text-warn hover:bg-[var(--warn)]/20",
        "grade-good":
          "bg-blue-500/10 text-info hover:bg-[var(--info)]/20",
        "grade-easy":
          "bg-primary/10 text-primary hover:bg-primary/20",
      },
      size: {
        default: "h-[38px] px-4 text-sm rounded-lg",
        sm: "h-8 px-3 text-xs",
        xs: "h-[26px] px-2 text-xs rounded-md",
        icon: "h-9 w-9",
        lg: "h-11 px-6 rounded-md",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
