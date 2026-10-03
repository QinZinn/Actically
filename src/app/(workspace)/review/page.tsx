"use client";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { useActicallyClient } from "@/features/client-provider";
import { allPages } from "@/lib/client/pagination";
import { uuidv4 } from "@/lib/client/utils";
import type { ReviewPresentation, TopicProgress } from "@/contracts/dto";
import type { GradeRequest } from "@/contracts/requests";
import { ActicallyClientError } from "@/lib/client/errors";
import ReviewQueue from "@/features/review/ReviewQueue";
import ReviewSession from "@/features/review/ReviewSession";
import ReviewHistory from "@/features/review/ReviewHistory";
function ReviewInner() {
  const client = useActicallyClient();
  const params = useSearchParams();
  const [queue, setQueue] = useState<ReviewPresentation[]>([]);
  const [progress, setProgress] = useState<TopicProgress[]>([]);
  const [timezone, setTimezone] = useState("Asia/Ho_Chi_Minh");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [grading, setGrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gradeError, setGradeError] = useState<string | null>(null);
  const pending = useRef<{ cardId: string; input: GradeRequest } | null>(null);
  const lock = useRef(false);
  const load = useCallback(async () => {
    if (lock.current || pending.current) return;
    setLoading(true); setError(null);
    try {
      const [q, p, profile] = await Promise.all([allPages(query => client.getDueQueue(query)), client.getProgress(), client.getProfile()]);
      setQueue(q); setProgress(p); setTimezone(profile.timezone); setRunning(false); setCompleted(0);
    } catch (e) { setError(e instanceof Error ? e.message : "Không tải được hàng đợi"); }
    finally { setLoading(false); }
  }, [client]);
  useEffect(() => { queueMicrotask(() => { void load(); }); }, [load]);
  async function grade(_index: number, rating: GradeRequest["rating"]) {
    if (lock.current) return;
    const presentation = queue[0];
    if (!presentation) return;
    pending.current ??= { cardId: presentation.card.id, input: { presentationId: presentation.presentationId,
      expectedRevision: presentation.expectedRevision, rating, idempotencyKey: uuidv4() } };
    const submission = pending.current;
    lock.current = true; setGrading(true); setGradeError(null);
    try {
      await client.gradeCard(submission.cardId, submission.input);
      pending.current = null;
      const remaining = queue.filter(p => p.presentationId !== submission.input.presentationId);
      setQueue(remaining); setCompleted(n => n + 1);
      if (!remaining.length) setRunning(false);
      try { setProgress(await client.getProgress()); }
      catch (e) { setError("Đã lưu điểm. Chưa tải được tiến độ: " + (e instanceof Error ? e.message : "")); }
    } catch (e) {
      if (e instanceof ActicallyClientError && (e.code === "CONFLICT" || !e.retryable)) {
        pending.current = null; setRunning(false); setError(e.message + " Làm mới hàng đợi trước khi tiếp tục.");
      } else setGradeError(e instanceof Error ? e.message : "Chưa xác nhận được điểm ôn tập.");
    } finally { lock.current = false; setGrading(false); }
  }
  const events = progress.flatMap(p => p.reviewEvidence);
  const selectedEvent = params.get("eventId");
  useEffect(() => {
    if (selectedEvent && progress.some(p => p.reviewEvidence.some(e => e.id === selectedEvent))) document.getElementById("review-event-" + selectedEvent)?.scrollIntoView({ block: "center" });
  }, [selectedEvent, progress]); // show the persisted evidence reached from Progress
  return <AppLayout><div className="max-w-5xl mx-auto space-y-6">
    <div className="flex justify-between items-center flex-wrap gap-3">
      <div><h1 className="text-2xl font-bold">Ôn tập</h1><p className="text-sm text-muted-foreground">Thẻ đến hạn theo múi giờ {timezone}. FSRS lên lịch sau khi bạn chấm.</p></div>
      <Button variant="secondary" disabled={loading || grading || !!gradeError} onClick={load}>Làm mới</Button>
    </div>
    {error && <ErrorState title="Cần tải lại dữ liệu" body={error} onRetry={load} />}
    {selectedEvent && !loading && !events.some(e => e.id === selectedEvent) && <p role="status">Bằng chứng này không còn trong cửa sổ tiến độ gần nhất.</p>}
    {completed > 0 && <Card className="p-4">Đã lưu {completed} lượt ôn trong phiên này.</Card>}
    <div className="grid lg:grid-cols-[1fr_320px] gap-6">
      <section className="space-y-4 min-w-0">
        {loading ? <p role="status">Đang tải hàng đợi…</p> : running && queue.length ?
          <Card className="p-5"><Button variant="ghost" disabled={grading || !!gradeError} onClick={() => setRunning(false)}>Dừng phiên</Button>
            <ReviewSession key={queue[0].presentationId} presentations={queue} index={0} onGrade={grade} grading={grading || !!gradeError} /></Card> :
          <ReviewQueue presentations={queue} onStart={() => setRunning(true)} />}
        {gradeError && <ErrorState title="Chưa xác nhận được việc ghi điểm" body={gradeError}
          onRetry={() => { if (pending.current) void grade(0, pending.current.input.rating); }} />}
      </section>
      <ReviewHistory events={events} timezone={timezone} selectedEventId={selectedEvent} />
    </div>
  </div></AppLayout>;
}
export default function ReviewPage() { return <Suspense fallback={<p>Đang tải…</p>}><ReviewInner /></Suspense>; }
