"use client";

import * as React from "react";
import { cn } from "@/lib/client/utils";
import { useToast, type Toast } from "@/components/ui/use-toast";

const variantStyles: Record<
  NonNullable<Toast["variant"]>,
  string
> = {
  default: "border-border bg-popover text-popover-foreground",
  success: "border-primary/40 bg-primary/10 text-foreground",
  error: "border-[var(--error-border)] bg-[var(--error-bg)] text-foreground",
  warning: "border-[var(--warn)]/40 bg-[var(--warn-bg)] text-foreground",
  info: "border-[var(--info-border)] bg-[var(--info-bg)] text-foreground",
};

export type ToastViewportProps = React.HTMLAttributes<HTMLOListElement> & {}

export const ToastViewport = React.forwardRef<
  HTMLOListElement,
  ToastViewportProps
>(({ className, ...props }, ref) => (
  <ol
    ref={ref}
    className={cn(
      "fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:max-w-[420px]",
      className
    )}
    {...props}
  />
));
ToastViewport.displayName = "ToastViewport";

export interface ToastItemProps
  extends React.HTMLAttributes<HTMLLIElement> {
  toast: Toast;
  onClose?: () => void;
}

export const ToastItem = React.forwardRef<HTMLLIElement, ToastItemProps>(
  ({ className, toast, onClose, ...props }, ref) => {
    const variant = toast.variant ?? "default";
    return (
      <li
        ref={ref}
        className={cn(
          "pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-lg border p-4 pr-8 shadow-lg transition-all data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
          variantStyles[variant],
          className
        )}
        data-state={toast.open ? "open" : "closed"}
        {...props}
      >
        <div className="flex-1 min-w-0">
          {toast.title && (
            <div className="text-sm font-semibold">{toast.title}</div>
          )}
          {toast.description && (
            <div className="text-sm opacity-90 mt-1">
              {toast.description}
            </div>
          )}
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-2 top-2 rounded-md p-1 opacity-60 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Close"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </li>
    );
  }
);
ToastItem.displayName = "ToastItem";

export function Toaster() {
  const { toasts, dismiss } = useToast();
  return (
    <>
      <ToastViewport>
        {toasts.map((t) => (
          <ToastItem
            key={t.id}
            toast={t}
            onClose={() => dismiss(t.id)}
            data-state="open"
          />
        ))}
      </ToastViewport>
    </>
  );
}

export interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  return (
    <>
      {children}
    </>
  );
}

export { useToast, toast } from "@/components/ui/use-toast";
export type { Toast } from "@/components/ui/use-toast";
