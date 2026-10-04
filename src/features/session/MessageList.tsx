"use client";

import * as React from "react";
import { MessagesSquare } from "lucide-react";
import type { Message } from "@/contracts/dto";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/client/utils";
import MessageBubble from "./MessageBubble";

interface MessageListProps {
  actionsDisabled?: boolean;
  messages: Message[];
  onRetry?: (m: Message) => void;
  onFollowUpSolveStep?: (msg: Message, stepNumber: number) => void;
  onAnswer?: (msg: Message, answer: string) => Promise<boolean>;
}

export default function MessageList({
  messages,
  onRetry,
  onFollowUpSolveStep,
  onAnswer,
  actionsDisabled = false,
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
        title="Bắt đầu từ điều bạn chưa hiểu"
        description="Đặt câu hỏi, chia sẻ cách suy nghĩ hoặc dán nội dung cần học."
        className="flex-1 min-h-0"
      />
    );
  }

  const latestSolve = messages.slice().reverse().find(m => m.solve && m.status === "completed");
  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={cn(
        "flex-1 min-h-0 overflow-y-auto overscroll-contain scroll-smooth px-4 py-6 sm:px-6"
      )}
    >
      <div className="mx-auto flex w-full max-w-[832px] flex-col gap-8">{messages.map((m) => (
        <MessageBubble
          key={m.id}
          message={m}
          onRetry={actionsDisabled ? undefined : onRetry}
          onFollowUpSolveStep={actionsDisabled || m.id !== latestSolve?.id ? undefined : onFollowUpSolveStep}
          onAnswer={actionsDisabled ? undefined : onAnswer}
        />
      ))}</div>
    </div>
  );
}
