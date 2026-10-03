"use client";

import { BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import MarkdownRenderer from "@/components/markdown/MarkdownRenderer";
import type { Flashcard } from "@/contracts/dto";
import { cn } from "@/lib/client/utils";

interface FlashcardProps {
  card: Flashcard;
  revealed: boolean;
  onReveal: () => void;
}

export default function Flashcard({ card, revealed, onReveal }: FlashcardProps) {
  return (
    <div className="flex flex-col gap-3">
      <Card
        onClick={!revealed ? onReveal : undefined}
        className={cn(
          "rounded-xl border p-8 min-h-[220px] flex items-center justify-center text-center transition-colors",
          !revealed && "cursor-pointer hover:border-primary/60",
          "bg-[var(--elevated-bg)] border-border"
        )}
      >
        <div className="max-w-3xl w-full text-lg leading-8">
          <MarkdownRenderer>{card.front}</MarkdownRenderer>
        </div>
      </Card>

      {revealed && (
        <>
          <div className="text-center text-xs text-muted-foreground py-1">
            ↓ Đáp án ↓
          </div>
          <Card className="rounded-xl border border-primary/50 p-8 min-h-[200px] flex items-center justify-center text-center bg-primary/5">
            <div className="max-w-3xl w-full text-base leading-7">
              <MarkdownRenderer>{card.back}</MarkdownRenderer>
            </div>
          </Card>

          {card.sourceRefs && card.sourceRefs.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
              <span className="text-xs text-muted-foreground mr-1">Nguồn:</span>
              {card.sourceRefs.map((sr, idx) => (
                <Badge key={idx} variant="secondary" size="sm" className="gap-1">
                  <BookOpen className="h-3 w-3" />
                  <span className="truncate max-w-[140px]">
                    Nguồn #{sr.sourceId.slice(0, 6)}
                  </span>
                </Badge>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
