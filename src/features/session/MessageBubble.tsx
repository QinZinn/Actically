"use client";

import * as React from "react";
import { RefreshCw, XCircle, BookOpenText } from "lucide-react";
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
  onAnswer?: (msg: Message, answer: string) => Promise<boolean>;
}

export default function MessageBubble({
  message,
  onRetry,
  onFollowUpSolveStep,
  onAnswer,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isStreaming = message.status === "streaming";
  const isFailed = message.status === "failed" || message.status === "cancelled";

  const roleLabel = isUser ? "Bạn" : "Trợ lý";

  return (
    <div
      className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "flex min-w-0 flex-col gap-2",
          isUser ? "max-w-[90%] sm:max-w-[80%] items-end" : "w-full items-start"
        )}
      >
        <div className="flex items-center gap-2 text-xs">
          {!isUser && <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary"><BookOpenText className="size-3.5" /></span>}
          <span className="font-medium text-muted-foreground">{roleLabel}</span>
          {isStreaming ? (
            <Skeleton className="w-16 h-[18px] rounded" />
          ) : isFailed ? (
            <Badge variant="destructive" size="sm">
              <XCircle className="w-3 h-3" />
              {message.status === "cancelled" ? "Đã hủy" : "Lỗi"}
            </Badge>
          ) : null}
          {isFailed && onRetry && (
            <Button
              variant="ghost"
              size="xs"
              className="h-5 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground"
              onClick={() => onRetry(message)}
            >
              <RefreshCw className="w-3 h-3" />
              {message.requestContext ? "Thử lại" : "Gửi mới"}
            </Button>
          )}
        </div>

        {(!message.solve || isUser) && <div
          className={cn(
            "min-w-0 max-w-full text-sm leading-7",
            isUser
              ? "rounded-2xl rounded-br-md border border-border/60 bg-popover px-4 py-3 text-foreground"
              : "w-full pl-0 sm:pl-8"
          )}
        >
          <MarkdownRenderer>
            {message.content || (isStreaming ? "" : "\u00A0")}
          </MarkdownRenderer>
          {isStreaming && (
            <span className="inline-block w-2 h-5 ml-0.5 -mb-1 bg-primary/70 animate-pulse" />
          )}
        </div>}

        {!isUser && message.solve && (
          <div className="w-full min-w-0 space-y-4 sm:pl-8">
            <SolveSteps
              solve={message.solve}
              onFollowUpStep={
                onFollowUpSolveStep
                  ? (n) => onFollowUpSolveStep(message, n)
                  : undefined
              }
            />
            {message.solve.comprehensionCheck && (
              <ComprehensionCheck check={message.solve.comprehensionCheck} onAnswer={onAnswer ? a => onAnswer(message, a) : undefined} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
