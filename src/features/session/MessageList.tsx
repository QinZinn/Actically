"use client";

import * as React from "react";
import { MessagesSquare } from "lucide-react";
import type { Message } from "@/contracts/dto";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/client/utils";
import MessageBubble from "./MessageBubble";

interface MessageListProps {
  messages: Message[];
  onRetry?: (m: Message) => void;
  onFollowUpSolveStep?: (msg: Message, stepNumber: number) => void;
}

export default function MessageList({
  messages,
  onRetry,
  onFollowUpSolveStep,
}: MessageListProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = React.useState(true);

  const handleScroll = React.useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const distanceFromBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight;
    setAutoScroll(distanceFromBottom < 50);
  }, []);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el || !autoScroll) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, autoScroll]);

  if (messages.length === 0) {
    return (
      <EmptyState
        icon={<MessagesSquare />}
        title="Chưa có tin nhắn — bắt đầu hỏi bên dưới"
      />
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={cn(
        "flex flex-col gap-5 p-4 overflow-y-auto scroll-smooth pb-32"
      )}
    >
      {messages.map((m) => (
        <MessageBubble
          key={m.id}
          message={m}
          onRetry={onRetry}
          onFollowUpSolveStep={onFollowUpSolveStep}
        />
      ))}
    </div>
  );
}
