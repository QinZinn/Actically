"use client";

import { useEffect, useState } from "react";
import { Inbox, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { ConceptRef } from "@/contracts/dto";
import { cn } from "@/lib/client/utils";

const MAX_CHARS = 16000;
const MIN_CHARS = 20;

interface FeynmanWriterProps {
  selectedReferenceSnapshots: ConceptRef[];
  onSubmit: (learnerText: string, idempotencyKey: string) => void;
  draftId: string;
  onDraftChange: (text: string) => void;
}

export default function FeynmanWriter({
  selectedReferenceSnapshots,
  onSubmit,
  draftId,
  onDraftChange,
}: FeynmanWriterProps) {
  const storageKey = `practice-feynman-draft-${draftId}`;
  const [text, setText] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem(storageKey) ?? "";
    }
    return "";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, text);
    }
    onDraftChange(text);
  }, [text, storageKey, onDraftChange]);

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
          <div className="flex flex-wrap gap-1.5">
            {selectedReferenceSnapshots.map((ref) => (
              <Badge
                key={ref.conceptId}
                variant="secondary"
                size="sm"
                className="gap-1"
              >
                <BookOpen className="h-3 w-3" />
                <span className="max-w-[160px] truncate">
                  {ref.conceptId.slice(0, 8)}…
                </span>
                <span className="text-xs text-muted-foreground">
                  r{ref.revision}
                </span>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Giải thích như bạn đang nói với học sinh lớp 10. Dùng ví dụ thực tế, công thức nếu cần (16.000 ký tự)…"
          className={cn(
            "flex-1 min-h-[300px] w-full p-4 text-sm leading-6",
            "resize-y"
          )}
          maxLength={MAX_CHARS}
        />
      </div>

      <div className="flex items-center justify-between gap-4 pt-2 border-t border-border/60">
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
          <Inbox className="h-4 w-4" />
          Gửi bài giải thích
        </Button>
      </div>
    </div>
  );
}
