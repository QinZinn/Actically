"use client";

import { useState } from "react";
import { Send, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { ConceptRef } from "@/contracts/dto";
import { cn } from "@/lib/client/utils";

const MAX_CHARS = 16000;
const MIN_CHARS = 20;

interface FeynmanWriterProps {
  value?: string;
  selectedReferenceSnapshots: ConceptRef[];
  onSubmit: (learnerText: string, idempotencyKey: string) => void;
  draftId: string;
  onDraftChange: (text: string) => void;
}

export default function FeynmanWriter({
  selectedReferenceSnapshots,
  onSubmit,
  draftId,
  value,
  onDraftChange,
}: FeynmanWriterProps) {
  void draftId;
  const [localText, setText] = useState("");
  const text = value ?? localText;

  const refCount = selectedReferenceSnapshots.length;
  const canSubmit = refCount > 0 && text.length >= MIN_CHARS && text.length <= MAX_CHARS;
  const charCount = text.length;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const key =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `key-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    onSubmit(text, key);
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-sm font-medium text-foreground">
          Khái niệm đã chọn:
        </div>
        {refCount === 0 ? (
          <Badge variant="nodata" size="sm">
            Chưa chọn
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1.5"><BookOpen className="size-3.5" />{refCount} khái niệm tham chiếu</Badge>
        )}
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <Textarea
          value={text}
          aria-label="Bài giải thích Feynman"
          onChange={(e) => { setText(e.target.value); onDraftChange(e.target.value); }}
          placeholder="Giải thích như bạn đang nói với học sinh lớp 10. Dùng ví dụ thực tế, công thức nếu cần (16.000 ký tự)…"
          className={cn(
            "flex-1 min-h-[300px] w-full p-4 text-sm leading-6",
            "resize-y"
          )}
          maxLength={MAX_CHARS}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border/60">
        <div
          className={cn(
            "text-xs font-medium",
            charCount > MAX_CHARS
              ? "text-error"
              : charCount < MIN_CHARS
                ? "text-muted-foreground"
                : "text-muted-foreground"
          )}
        >
          {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
          {charCount < MIN_CHARS && (
            <span className="ml-2 text-warn">
              (cần tối thiểu {MIN_CHARS} ký tự)
            </span>
          )}
        </div>
        <Button onClick={handleSubmit} disabled={!canSubmit} className="gap-2">
          <Send className="h-4 w-4" />
          Gửi bài giải thích
        </Button>
      </div>
    </div>
  );
}
