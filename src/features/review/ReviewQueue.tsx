"use client";

import { Layers3, Play, CircleCheck } from "lucide-react";
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

  return (
    <Card className="flex flex-col gap-6 p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Layers3 className="h-5 w-5 text-primary" />
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

      {total === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
          <CircleCheck className="mx-auto mb-4 size-9 text-primary" />
          <h3 className="font-semibold text-foreground mb-1">
            Không có thẻ nào đến hạn
          </h3>
          <p className="text-sm text-muted-foreground">
            Bạn có thể học tiếp hoặc duyệt khái niệm để chuẩn bị thêm thẻ.
          </p>
        </div>
      ) : (
        <>
          <div className="concept-grid">
            {presentations.slice(0, 6).map((p, idx) => (
              <div key={p.presentationId} className="rounded-lg border border-border/70 bg-sidebar/60 p-4 overflow-hidden">
                <div className="text-xs text-muted-foreground mb-1 flex items-center justify-between">
                  <span>#{idx + 1}</span>
                </div>
                <div className="text-sm text-foreground line-clamp-4">
                  <MarkdownRenderer>
                    {p.card.front.slice(0, 400)}
                  </MarkdownRenderer>
                </div>
              </div>
            ))}
            {total > 6 && (
              <div className="rounded-lg border border-dashed border-border p-4 flex items-center justify-center text-muted-foreground text-sm">
                + {total - 6} thẻ nữa…
              </div>
            )}
          </div>

          <div className="flex justify-end border-t border-border/70 pt-5">
            <Button onClick={onStart} className="w-full sm:w-auto">
              <Play className="h-5 w-5" />
              Bắt đầu ôn
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
