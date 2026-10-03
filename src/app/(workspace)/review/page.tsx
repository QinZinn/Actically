"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, ArrowLeft, PartyPopper } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { getClient } from "@/lib/client";
import { ActicallyClientError } from "@/lib/client/errors";
import { uuidv4 } from "@/lib/client/utils";
import { reviewRatingSchema, reviewEventSchema } from "@/contracts/dto";
import type {
  ReviewPresentation,
  TopicProgress,
} from "@/contracts/dto";
import type { z } from "zod";
import ReviewQueue from "@/features/review/ReviewQueue";
import ReviewSession from "@/features/review/ReviewSession";
import ReviewHistory from "@/features/review/ReviewHistory";

type ReviewRating = z.infer<typeof reviewRatingSchema>;
type ReviewEvent = z.infer<typeof reviewEventSchema>;

export default function ReviewPageClient() {
  const client = useMemo(() => getClient(), []);

  const [presentations, setPresentations] = useState<ReviewPresentation[]>([]);
  const [index, setIndex] = useState(0);
  const [sessionRunning, setSessionRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState(false);
  const [history, setHistory] = useState<ReviewEvent[]>([]);
  const [progress, setProgress] = useState<TopicProgress[]>([]);
  const [sessionDone, setSessionDone] = useState(false);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const [queue, prog] = await Promise.all([
        client.getDueQueue(),
        client.getProgress().catch(() => [] as TopicProgress[]),
      ]);
      setPresentations(queue);
      setProgress(prog);
      const events: ReviewEvent[] = [];
      for (const p of prog) {
        for (const ev of p.reviewEvidence) events.push(ev);
      }
      setHistory(events);
    } catch (err) {
      toast({
        variant: "error",
        title: "Không tải được hàng đợi",
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    queueMicrotask(() => {
      loadQueue();
    });
  }, [loadQueue]);

  const startSession = useCallback(() => {
    setIndex(0);
    setSessionDone(false);
    setSessionRunning(true);
  }, []);

  const stopSession = useCallback(() => {
    setSessionRunning(false);
  }, []);

  const finishIfDone = useCallback(
    (nextIndex: number, total: number) => {
      if (nextIndex >= total) {
        setSessionRunning(false);
        setSessionDone(true);
      }
    },
    []
  );

  const onGradeCard = useCallback(
    async (idx: number, rating: ReviewRating) => {
      const pres = presentations[idx];
      if (!pres || grading) return;
      setGrading(true);
      try {
        const idempotencyKey = uuidv4();
        const result = await client.gradeCard(pres.card.id, {
          presentationId: pres.presentationId,
          idempotencyKey,
          expectedRevision: pres.expectedRevision,
          rating,
        });

        setPresentations((prev) =>
          prev.map((p, i) =>
            i === idx
              ? {
                  ...p,
                  card: { ...p.card, revision: result.revision },
                  expectedRevision: result.revision,
                }
              : p
          )
        );

        const newEvent: ReviewEvent = {
          id: uuidv4(),
          cardId: pres.card.id,
          presentationId: pres.presentationId,
          rating,
          reviewedAt: new Date().toISOString(),
          revisionBefore: pres.expectedRevision,
          revisionAfter: result.revision,
        };
        setHistory((prev) => [newEvent, ...prev]);

        const nextIndex = idx + 1;
        setIndex(nextIndex);
        finishIfDone(nextIndex, presentations.length);
      } catch (err) {
        if (err instanceof ActicallyClientError && err.code === "CONFLICT") {
          toast({
            variant: "warning",
            title: "Lượt ôn đã được chấm từ tab khác",
            description: "Làm mới danh sách hàng đợi.",
          });
          await loadQueue();
        } else {
          toast({
            variant: "error",
            title: "Không ghi được điểm",
            description: err instanceof Error ? err.message : undefined,
          });
        }
      } finally {
        setGrading(false);
      }
    },
    [client, presentations, grading, loadQueue, finishIfDone]
  );

  const totalDue = presentations.length;
  const completedCount = Math.min(index, totalDue);
  const queueProgress =
    totalDue === 0 ? 0 : (completedCount / totalDue) * 100;

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-foreground">Ôn tập</h1>
            <p className="text-sm text-muted-foreground">
              Lặp lại ngắt quãng bằng flashcards theo thuật toán FSRS.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="pending" size="md">
              Đến hạn: {totalDue}
            </Badge>
            <Button
              size="sm"
              variant="secondary"
              onClick={loadQueue}
              disabled={loading}
              className="gap-1"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Làm mới
            </Button>
          </div>
        </div>

        {sessionDone && completedCount > 0 && (
          <Card className="p-6 bg-primary/5 border-primary/30">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <PartyPopper className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-foreground">
                  Hoàn thành phiên ôn tập!
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Bạn đã ôn xong {completedCount} thẻ. Hẹn gặp lại vào lần tới!
                </p>
                <div className="mt-3 flex gap-2 flex-wrap">
                  <Button variant="secondary" onClick={loadQueue}>
                    <RefreshCw className="h-4 w-4" />
                    Tải hàng đợi mới
                  </Button>
                  <Button onClick={() => { setSessionDone(false); loadQueue(); }}>
                    Ôn tiếp
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          <section className="flex flex-col gap-4 min-w-0">
            {loading && !sessionRunning && (
              <Card className="p-10 text-center text-sm text-muted-foreground">
                Đang tải hàng đợi…
              </Card>
            )}

            {!loading && !sessionRunning && !sessionDone && (
              <ReviewQueue
                presentations={presentations}
                onStart={startSession}
              />
            )}

            {sessionRunning && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={stopSession}
                    className="gap-1"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Dừng phiên
                  </Button>
                  <Badge variant="secondary" size="sm">
                    Tiến độ: {completedCount}/{totalDue}
                  </Badge>
                </div>
                <div className="h-[10px] w-full bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all rounded-full"
                    style={{ width: `${queueProgress}%` }}
                  />
                </div>

                {index < totalDue ? (
                  <Card className="p-6">
                    <ReviewSession
                      presentations={presentations}
                      index={index}
                      onGrade={onGradeCard}
                    />
                  </Card>
                ) : (
                  <Card className="p-10 text-center">
                    <PartyPopper className="h-10 w-10 text-primary mx-auto mb-3" />
                    <h3 className="font-semibold text-lg mb-1">
                      Hoàn thành phiên
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Bạn đã ôn xong {totalDue} thẻ hôm nay.
                    </p>
                  </Card>
                )}
              </div>
            )}
          </section>

          <aside className="flex flex-col gap-4">
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3">Tiến độ chủ đề</h3>
              {progress.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center">
                  Chưa có dữ liệu tiến độ.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {progress.slice(0, 8).map((p) => {
                    const ratio =
                      p.totalCardCount === 0
                        ? 0
                        : p.eligibleCardCount / p.totalCardCount;
                    return (
                      <div key={p.studySetId} className="flex flex-col gap-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="truncate font-medium">{p.title}</span>
                          <Badge
                            variant={
                              p.status === "solid"
                                ? "default"
                                : p.status === "growing"
                                  ? "growing"
                                  : p.status === "weak"
                                    ? "weak"
                                    : "nodata"
                            }
                            size="sm"
                          >
                            {p.status === "solid"
                              ? "Vững"
                              : p.status === "growing"
                                ? "Đang tiến bộ"
                                : p.status === "weak"
                                  ? "Yếu"
                                  : "Chưa dữ liệu"}
                          </Badge>
                        </div>
                        <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${Math.round(ratio * 100)}%` }}
                          />
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {p.eligibleCardCount}/{p.totalCardCount} thẻ ·{" "}
                          {p.reviewCount} lần ôn
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
            <ReviewHistory events={history} />
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
