"use client";

import { LayoutGrid, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import MarkdownRenderer from "@/components/markdown/MarkdownRenderer";
import type { ReviewPresentation } from "@/contracts/dto";

interface ReviewQueueProps {
  presentations: ReviewPresentation[];
  onStart: () => void;
}

export default function ReviewQueue({
  presentations,
  onStart,
}: ReviewQueueProps) {
  const total = presentations.length;
  const progress = total > 0 ? 0 : 0;

  return (
    <div className="flex flex-col gap-5 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <LayoutGrid className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Hàng đợi hôm nay
            </h2>
            <p className="text-sm text-muted-foreground">
              Các thẻ đến hạn cần ôn tập.
            </p>
          </div>
        </div>
        <Badge variant="solid" size="md" className="gap-1">
          {total} thẻ
        </Badge>
      </div>

      <div className="h-[10px] w-full bg-border rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all rounded-full"
          style={{ width: `${total === 0 ? 0 : progress}%` }}
        />
      </div>

      {total === 0 ? (
        <Card className="p-10 text-center">
          <div className="text-3xl mb-2">🎯</div>
          <h3 className="font-semibold text-foreground mb-1">
            Không có thẻ nào đến hạn
          </h3>
          <p className="text-sm text-muted-foreground">
            Tất cả các thẻ flashcard hiện tại chưa đến hạn ôn. Quay lại sau nhé!
          </p>
        </Card>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {presentations.slice(0, 6).map((p, idx) => (
              <Card key={p.presentationId} className="p-3 overflow-hidden">
                <div className="text-xs text-muted-foreground mb-1 flex items-center justify-between">
                  <span>#{idx + 1}</span>
                </div>
                <div className="text-sm text-foreground line-clamp-4">
                  <MarkdownRenderer>
                    {p.card.front.slice(0, 400)}
                  </MarkdownRenderer>
                </div>
              </Card>
            ))}
            {total > 6 && (
              <Card className="p-3 bg-popover/60 flex items-center justify-center text-muted-foreground text-sm">
                + {total - 6} thẻ nữa…
              </Card>
            )}
          </div>

          <div className="flex justify-center pt-2">
            <Button size="lg" onClick={onStart} className="gap-2 px-10">
              <Play className="h-5 w-5" />
              Bắt đầu ôn
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
