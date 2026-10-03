"use client";

import { useState } from "react";
import { EyeOff, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/client/utils";

const MAX_CHARS = 16000;
const MIN_CHARS = 20;

interface BlurtingWriterProps {
  value?: string;
  selectedCount: number;
  onSubmit: (text: string, key: string) => void;
  draftId: string;
  onDraftChange: (text: string) => void;
}

export default function BlurtingWriter({
  selectedCount,
  onSubmit,
  draftId,
  value,
  onDraftChange,
}: BlurtingWriterProps) {
  void draftId;
  const [localText, setText] = useState("");
  const text = value ?? localText;

  const canSubmit = selectedCount > 0 && text.length >= MIN_CHARS && text.length <= MAX_CHARS;
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
      <Card className="p-4 bg-popover/70 border-warn/30">
        <div className="flex items-start gap-3">
          <EyeOff className="h-5 w-5 text-warn shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold text-sm text-foreground">
              🔒 Tài liệu tham khảo đã được ẩn
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Hãy nhớ và viết lại tất cả kiến thức bạn nhớ về các khái niệm đã chọn
              <span className="font-semibold text-foreground ml-1">
                (số lượng: {selectedCount})
              </span>
              .
            </div>
          </div>
        </div>
      </Card>

      <div className="flex-1 flex flex-col min-h-0">
        <Textarea
          value={text}
          aria-label="Bài viết lại Blurting"
          onChange={(e) => { setText(e.target.value); onDraftChange(e.target.value); }}
          placeholder="Viết ra mọi thứ bạn nhớ về các khái niệm đã chọn. Không cần theo trình tự, hãy liệt kê tất cả các điểm bạn nhớ được…"
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
          <Send className="h-4 w-4" />
          Gửi bài nhớ
        </Button>
      </div>
    </div>
  );
}
