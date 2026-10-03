"use client";

import * as React from "react";
import type {
  LearningSession,
  Message,
  StudyMode,
  ExtractionResult,
} from "@/contracts/dto";
import type { ChatEvent } from "@/contracts/sse";
import { useActicallyClient } from "@/features/client-provider";
import { uuidv4 } from "@/lib/client/utils";

export interface UseSessionReturn {
  session: LearningSession | null;
  messages: Message[];
  sending: boolean;
  error: string | null;
  streaming: boolean;
  abortRef: React.MutableRefObject<AbortController | null>;
  sendMessage: (
    mode: StudyMode,
    content: string,
    followUpStep?: number
  ) => Promise<void>;
  cancel: () => void;
  finishSession: () => Promise<ExtractionResult | void>;
  handleRetry: (message: Message) => Promise<void>;
}

export function useSession(sessionId: string): UseSessionReturn {
  const client = useActicallyClient();
  const [session, setSession] = React.useState<LearningSession | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [streaming, setStreaming] = React.useState(false);
  const abortRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [s, ms] = await Promise.all([
          client.getSession(sessionId),
          client.listMessages(sessionId),
        ]);
        if (!mounted) return;
        setSession(s);
        setMessages(ms);
      } catch (err: unknown) {
        if (!mounted) return;
        const message = err instanceof Error ? err.message : String(err);
        setError(message ?? "Không thể tải phiên học");
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [sessionId, client]);

  const sendMessage = React.useCallback(
    async (
      mode: StudyMode,
      content: string,
      followUpStep?: number
    ): Promise<void> => {
      setSending(true);
      setStreaming(true);
      setError(null);

      const requestId = uuidv4();
      const controller = new AbortController();
      abortRef.current = controller;

      let userMsgId: string | null = null;
      let assistantMsgId: string | null = null;

      try {
        const iter = client.streamChat(
          sessionId,
          {
            content,
            mode,
            requestId,
            followUpStep: followUpStep ?? null,
          },
          controller.signal
        );

        for await (const evt of iter as AsyncIterable<ChatEvent>) {
          if (evt.event === "meta") {
            userMsgId = evt.data.userMessageId;
            assistantMsgId = evt.data.assistantMessageId;

            const now = new Date().toISOString();
            const userPlaceholder: Message = {
              id: userMsgId,
              sessionId,
              role: "user",
              content,
              status: "completed",
              solve: null,
              requestId,
              createdAt: now,
              updatedAt: now,
            };
            const assistantPlaceholder: Message = {
              id: assistantMsgId,
              sessionId,
              role: "assistant",
              content: "",
              status: "streaming",
              solve: null,
              requestId,
              createdAt: now,
              updatedAt: now,
            };
            setMessages((prev) => [
              ...prev.filter((m) => m.requestId !== requestId),
              userPlaceholder,
              assistantPlaceholder,
            ]);
          } else if (evt.event === "delta") {
            if (!assistantMsgId) continue;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, content: m.content + evt.data.text }
                  : m
              )
            );
          } else if (evt.event === "done") {
            const completedMsg = evt.data.message;
            setMessages((prev) =>
              prev.map((m) =>
                m.requestId === requestId && m.role === "assistant"
                  ? completedMsg
                  : m
              )
            );
          } else if (evt.event === "error") {
            setError(evt.data.message);
            if (assistantMsgId) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, status: "failed" }
                    : m
                )
              );
            }
          }
        }
      } catch (err: unknown) {
        const name = err instanceof Error ? err.name : "";
        const message = err instanceof Error ? err.message : String(err);
        if (name === "AbortError") {
          if (assistantMsgId) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, status: "cancelled" }
                  : m
              )
            );
          }
        } else {
          setError(message ?? "Gửi tin nhắn thất bại");
          if (assistantMsgId) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, status: "failed" }
                  : m
              )
            );
          }
        }
      } finally {
        setSending(false);
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [sessionId, client]
  );

  const cancel = React.useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  const finishSession = React.useCallback(
    async (): Promise<ExtractionResult | void> => {
      try {
        const idempotencyKey = uuidv4();
        const result = await client.finishSession(sessionId, { idempotencyKey });
        if (result.concepts.length > 0) {
          setSession((prev) =>
            prev ? { ...prev, status: "ended" } : prev
          );
        }
        return result;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message ?? "Không thể kết thúc phiên");
      }
    },
    [sessionId, client]
  );

  const handleRetry = React.useCallback(
    async (message: Message): Promise<void> => {
      const failedMsg = messages.find((m) => m.id === message.id);
      if (!failedMsg || failedMsg.role !== "assistant") return;

      const userMsg = messages.find(
        (m) => m.requestId === failedMsg.requestId && m.role === "user"
      );
      if (!userMsg) return;

      const followUp = session?.mode === "solve" ? undefined : undefined;

      await sendMessage(
        session?.mode ?? "socratic",
        userMsg.content,
        followUp
      );
    },
    [messages, session, sendMessage]
  );

  return {
    session,
    messages,
    sending,
    error,
    streaming,
    abortRef,
    sendMessage,
    cancel,
    finishSession,
    handleRetry,
  };
}
