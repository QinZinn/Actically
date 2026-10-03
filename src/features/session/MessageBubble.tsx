"use client";

import * as React from "react";
import { RefreshCw, XCircle } from "lucide-react";
import type { Message } from "@/contracts/dto";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/client/utils";
import MarkdownRenderer from "@/components/markdown/MarkdownRenderer";
import SolveSteps from "./SolveSteps";
import ComprehensionCheck from "./ComprehensionCheck";

interface MessageBubbleProps {
  message: Message;
  onRetry?: (m: Message) => void;
  onFollowUpSolveStep?: (msg: Message, stepNumber: number) => void;
}

export default function MessageBubble({
  message,
  onRetry,
  onFollowUpSolveStep,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isStreaming = message.status === "streaming";
  const isFailed = message.status === "failed";

  const roleLabel = isUser ? "Bạn" : "Trợ lý";

  return (
    <div
      className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "flex flex-col gap-1.5",
          isUser ? "items-end" : "items-start"
        )}
      >
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">{roleLabel}</span>
          {isStreaming ? (
            <Skeleton className="w-16 h-[18px] rounded" />
          ) : isFailed ? (
            <Badge variant="destructive" size="sm">
              <XCircle className="w-3 h-3" />
              Lỗi
            </Badge>
          ) : (
            <Badge variant="secondary" size="sm">
              OK
            </Badge>
          )}
          {isFailed && onRetry && (
            <Button
              variant="ghost"
              size="xs"
              className="h-5 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground"
              onClick={() => onRetry(message)}
            >
              <RefreshCw className="w-3 h-3" />
              Thử lại
            </Button>
          )}
          {!isUser && !isStreaming && !isFailed && message.solve && (
            <Button
              variant="ghost"
              size="xs"
              className="h-5 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground"
              onClick={() => onRetry?.(message)}
            >
              <RefreshCw className="w-3 h-3" />
              Sửa câu trả lời
            </Button>
          )}
        </div>

        <div
          className={cn(
            "px-4 py-3",
            isUser
              ? "max-w-[70%] rounded-[14px_14px_4px_14px] bg-popover text-foreground"
              : "max-w-[80%] rounded-[14px_14px_14px_4px] bg-sidebar px-4 py-3"
          )}
        >
          <MarkdownRenderer>
            {message.content || (isStreaming ? "" : "\u00A0")}
          </MarkdownRenderer>
          {isStreaming && (
            <span className="inline-block w-2 h-5 ml-0.5 -mb-1 bg-primary/70 animate-pulse" />
          )}
        </div>

        {!isUser && message.solve && (
          <div className="w-full max-w-[80%] mt-2">
            <SolveSteps
              solve={message.solve}
              onFollowUpStep={
                onFollowUpSolveStep
                  ? (n) => onFollowUpSolveStep(message, n)
                  : undefined
              }
            />
            {message.solve.comprehensionCheck && (
              <ComprehensionCheck check={message.solve.comprehensionCheck} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
