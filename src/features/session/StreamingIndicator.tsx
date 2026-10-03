"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/client/utils";

interface StreamingIndicatorProps {
  visible: boolean;
  text?: string;
}

export default function StreamingIndicator({
  visible,
  text = "Đang soạn câu trả lời…",
}: StreamingIndicatorProps) {
  if (!visible) return null;
  return (
    <div className="flex items-center gap-2 mt-2 ml-3">
      <Loader2 className={cn("w-4 h-4 animate-spin text-primary")} />
      <span className="text-muted-foreground text-sm">{text}</span>
    </div>
  );
}
