"use client";
import * as React from "react";
import type { LearningSession, Message, StudyMode, ExtractionResult } from "@/contracts/dto";
import type { SessionUpdate } from "@/contracts/requests";
import { useActicallyClient } from "@/features/client-provider";
import { uuidv4 } from "@/lib/client/utils";

export function useSession(sessionId: string) {
  const client = useActicallyClient();
  const [session, setSession] = React.useState<LearningSession | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [sending, setSending] = React.useState(false);
  const [ending, setEnding] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [version, setVersion] = React.useState(0);
  const abortRef = React.useRef<AbortController | null>(null);
  const finishKeyRef = React.useRef<string | null>(null);
  const alive = React.useRef(false);
  const finishing = React.useRef(false);

  React.useEffect(() => {
    alive.current = true;
    let mounted = true;
    async function load() {
      try {
        const [s, ms] = await Promise.all([client.getSession(sessionId), client.listMessages(sessionId)]);
        if (!mounted) return;
        setSession(s); setMessages(ms); setError(null);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : "Không thể tải phiên học");
      }
    }
    void load();
    return () => { mounted = false; alive.current = false; abortRef.current?.abort(); };
  }, [sessionId, client, version]);

  const sendMessage = React.useCallback(async (mode: StudyMode, content: string, followUpStep?: number,
    reuseRequestId?: string | null): Promise<boolean> => {
    if (abortRef.current || finishing.current || session?.status === "ended") return false;
    const requestId = reuseRequestId ?? uuidv4();
    const requestContext = { mode, followUpStep: followUpStep ?? null };
    const controller = new AbortController();
    abortRef.current = controller;
    const current = () => alive.current && abortRef.current === controller;
    setSending(true); setError(null);
    const now = new Date().toISOString();
    const base = { sessionId, requestId, requestContext, createdAt: now, updatedAt: now, solve: null };
    let assistantId = "pending-assistant-" + requestId;
    setMessages(prev => [...prev.filter(m => m.requestId !== requestId),
      { ...base, id: "pending-user-" + requestId, role: "user", content, status: "completed" },
      { ...base, id: assistantId, role: "assistant", content: "", status: "streaming" }]);
    try {
      let completed = false;
      for await (const evt of client.streamChat(sessionId, { content, ...requestContext, requestId }, controller.signal)) {
        if (!current()) return false;
        if (evt.event === "meta") {
          assistantId = evt.data.assistantMessageId;
          setMessages(prev => prev.map(m => m.requestId === requestId ?
            { ...m, id: m.role === "user" ? evt.data.userMessageId : assistantId } : m));
        } else if (evt.event === "delta") {
          setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: m.content + evt.data.text } : m));
        } else if (evt.event === "done") {
          completed = true;
          setMessages(prev => prev.map(m => m.requestId === requestId && m.role === "assistant" ? evt.data.message : m));
        } else if (evt.event === "error") throw new Error(evt.data.message);
      }
      if (!completed) throw new Error("Phản hồi bị ngắt trước khi hoàn tất.");
      return true;
    } catch (err) {
      if (current()) {
        const cancelled = err instanceof Error && err.name === "AbortError";
        if (!cancelled) setError(err instanceof Error ? err.message : "Gửi tin nhắn thất bại");
        setMessages(prev => prev.map(m => m.requestId === requestId && m.role === "assistant" ?
          { ...m, status: cancelled ? "cancelled" : "failed" } : m));
      }
      return false;
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        if (alive.current) setSending(false);
      }
    }
  }, [sessionId, client, session?.status]);

  const cancel = React.useCallback(() => { abortRef.current?.abort(); }, []);
  const finishSession = React.useCallback(async (): Promise<ExtractionResult | void> => {
    if (abortRef.current || finishing.current) return;
    finishing.current = true;
    setEnding(true);
    finishKeyRef.current ??= uuidv4();
    try {
      const result = await client.finishSession(sessionId, { idempotencyKey: finishKeyRef.current });
      if (alive.current) setSession(prev => prev ? { ...prev, status: "ended" } : prev);
      return result;
    } catch (err) {
      if (alive.current) setError(err instanceof Error ? err.message : "Không thể kết thúc phiên");
      throw err;
    } finally { finishing.current = false; if (alive.current) setEnding(false); }
  }, [client, sessionId]);

  const updateSession = React.useCallback(async (input: SessionUpdate) => {
    if (finishing.current || abortRef.current) throw new Error("Chờ thao tác hiện tại hoàn tất trước khi đổi ngữ cảnh.");
    const saved = await client.updateSession(sessionId, input);
    if (alive.current) setSession(saved);
    return saved;
  }, [client, sessionId]);

  const handleRetry = React.useCallback(async (message: Message) => {
    const user = messages.find(m => m.requestId === message.requestId && m.role === "user");
    if (!user) return;
    const context = message.requestContext;
    await sendMessage(context?.mode ?? session?.mode ?? "socratic", user.content,
      context?.followUpStep ?? undefined, context ? message.requestId : null);
  }, [messages, sendMessage, session?.mode]);

  return { session, messages, sending, ending, error, streaming: sending, abortRef, sendMessage, cancel,
    finishSession, handleRetry, updateSession, reload: () => setVersion(v => v + 1) };
}
