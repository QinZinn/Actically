"use client";

import * as React from "react";
import { Loader2, Send, ChevronDown, ChevronUp } from "lucide-react";
import type { StudyMode, StudySet } from "@/contracts/dto";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useActicallyClient } from "@/features/client-provider";
import ModeSelector from "./ModeSelector";
import { useDraft } from "@/lib/client/useDraft";
import SourceInputPaste from "./SourceInputPaste";

const MAX_CHARS = 16000;

interface SessionComposerProps {
  draftKey?: string;
  disabled?: boolean;
  mode: StudyMode;
  onModeChange: (mode: StudyMode) => void;
  studySetId: string | null;
  onStudySetChange: (id: string | null) => void;
  onSend: (mode: StudyMode, content: string) => Promise<boolean>;
  sending: boolean;
  onCancel: () => void;
  sourcePasteOpen?: boolean;
  onToggleSourcePaste?: () => void;
}

export default function SessionComposer({
  mode,
  onModeChange,
  disabled = false,
  draftKey = "new",
  studySetId,
  onStudySetChange,
  onSend,
  sending,
  onCancel,
  sourcePasteOpen = false,
  onToggleSourcePaste,
}: SessionComposerProps) {
  const client = useActicallyClient();
  const [content, setContent] = useDraft("actically:session-draft:" + draftKey);
  const [studySets, setStudySets] = React.useState<StudySet[]>([]);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const list = await client.listStudySets();
        if (mounted) setStudySets(list);
      } catch {
        /* ignore */
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [client]);

  const handleSend = async () => {
    const trimmed = content.trim();
    if (!trimmed || sending) return;
    const success = await onSend(mode, trimmed);
    if (success) setContent("");
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  const autoResize = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    const lineHeight = 22;
    const minRows = 2;
    const maxRows = 8;
    const minHeight = lineHeight * minRows + 24;
    const maxHeight = lineHeight * maxRows + 24;
    const scrollHeight = el.scrollHeight;
    el.style.height = `${Math.max(minHeight, Math.min(maxHeight, scrollHeight))}px`;
  };

  return (
    <div className="shrink-0 max-h-[55dvh] overflow-y-auto border-t border-border bg-background p-3 sm:p-4">
      <div className="max-w-[832px] mx-auto space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ModeSelector value={mode} onChange={onModeChange} disabled={sending || disabled} />
          <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:max-w-[360px]">
            <Select
              aria-label="Bộ học của phiên"
              disabled={sending || disabled}
              value={studySetId ?? ""}
              onChange={(e) => onStudySetChange(e.target.value || null)}
              className="min-w-0 flex-1 sm:w-[200px]"
            >
              <option value="">— Không chọn bộ —</option>
              {studySets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.subject} — {s.title}
                </option>
              ))}
            </Select>
            {onToggleSourcePaste && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleSourcePaste}
                disabled={sending || disabled}
                className="gap-1"
              >
                Nguồn
                {sourcePasteOpen ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            )}
          </div>
        </div>

        {sourcePasteOpen && (
          <SourceInputPaste
            studySetId={studySetId}
            studySets={studySets}
            onStudySetCreated={(ss) => { setStudySets(prev => [...prev, ss]); onStudySetChange(ss.id); }}
          />
        )}

        <div className="relative">
          <Textarea
            ref={textareaRef}
            rows={2}
            placeholder="Bạn đang muốn hiểu điều gì?"
            aria-label="Nội dung tin nhắn"
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              autoResize(e.currentTarget);
            }}
            onKeyDown={handleKeyDown}
            disabled={sending || disabled}
            maxLength={MAX_CHARS}
            className="min-h-[76px] max-h-[200px] pr-20 resize-none bg-card leading-6"
          />
          <div className="absolute right-2 bottom-2 flex items-center gap-2">
            {sending ? (
              <Button variant="secondary" size="sm" onClick={onCancel}>
                <Loader2 className="w-4 h-4 animate-spin" />
                Hủy
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleSend}
                aria-label="Gửi tin nhắn"
                disabled={!content.trim() || sending || disabled}
              >
                <Send className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="flex justify-between gap-3 text-xs text-muted-foreground">
          <span>Ctrl + Enter để gửi</span>
          <span className="text-xs text-muted-foreground">
            {content.length}/{MAX_CHARS}
          </span>
        </div>
      </div>
    </div>
  );
}
