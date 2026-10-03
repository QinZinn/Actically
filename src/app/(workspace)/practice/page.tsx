"use client";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BookOpen, EyeOff, RotateCcw } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { useActicallyClient } from "@/features/client-provider";
import { allPages } from "@/lib/client/pagination";
import { uuidv4 } from "@/lib/client/utils";
import { useDraft } from "@/lib/client/useDraft";
import type { Concept, PracticeAttempt, PracticeDetail, PracticeKind, StudySet } from "@/contracts/dto";
import type { PracticeCreate, PracticeRetry } from "@/contracts/requests";
import ConceptPicker from "@/features/practice/ConceptPicker";
import PracticeAttemptHistory from "@/features/practice/PracticeAttemptHistory";
import FeynmanWriter from "@/features/practice/FeynmanWriter";
import FeynmanFeedback from "@/features/practice/FeynmanFeedback";
import BlurtingWriter from "@/features/practice/BlurtingWriter";
import BlurtingResults from "@/features/practice/BlurtingResults";
import RecoverableErrorBox from "@/features/practice/RecoverableErrorBox";

type Pending = { parentId: string; input: PracticeRetry } | { parentId: null; input: PracticeCreate };
function PracticeInner() {
  const client = useActicallyClient();
  const params = useSearchParams();
  const [tab, setTab] = useState<PracticeKind>("feynman");
  const [sets, setSets] = useState<StudySet[]>([]);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [setId, setSetId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [attempts, setAttempts] = useState<PracticeAttempt[]>([]);
  const [detail, setDetail] = useState<PracticeDetail | null>(null);
  const [parent, setParent] = useState<PracticeAttempt | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [text, setText] = useDraft(`actically:practice-draft:${userId ?? "loading"}:${tab}:${setId ?? "unselected"}:${parent?.id ?? "new"}`, parent?.learnerText ?? "");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<{ stage: "submit" | "evaluate"; message: string } | null>(null);
  const [version, setVersion] = useState(0);
  const pending = useRef<Pending | null>(null);
  const lock = useRef(false);
  const selectionSequence = useRef(0);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const refs = parent?.referenceSnapshots ?? concepts.filter(c => selectedIds.includes(c.id)).map(c => ({ conceptId: c.id, revision: c.revision }));

  useEffect(() => {
    let active = true;
    Promise.all([client.listStudySets(), allPages(q => client.listConcepts({ ...q, status: "approved" })),
      allPages(q => client.listAttempts(q)), client.getProfile()]).then(([s, c, a, profile]) => {
        if (active) { setSets(s); setConcepts(c); setAttempts(a); setUserId(profile.id); setLoadError(null); setLoading(false); }
      }).catch(e => { if (active) { setLoadError(e.message); setLoading(false); } });
    return () => { active = false; };
  }, [client, version]);

  const selectAttempt = useCallback(async (id: string) => {
    if (lock.current) return;
    const sequence = ++selectionSequence.current;
    setSelectedAttemptId(id); setDetail(null); setDetailError(null); setDetailLoading(true);
    setParent(null); setError(null); pending.current = null;
    try {
      const d = await client.getAttempt(id);
      if (sequence === selectionSequence.current) { setDetail(d); setTab(d.attempt.kind); }
    } catch (e) { if (sequence === selectionSequence.current) setDetailError(e instanceof Error ? e.message : "Không tải được lượt tập"); }
    finally { if (sequence === selectionSequence.current) setDetailLoading(false); }
  }, [client]);
  useEffect(() => {
    const id = params.get("attemptId");
    let active = true;
    if (id) queueMicrotask(() => { if (active) void selectAttempt(id); });
    return () => { active = false; };
  }, [params, selectAttempt]);

  async function evaluate(attempt: PracticeAttempt) {
    try {
      const evaluation = await client.evaluateAttempt(attempt.id);
      const saved = { ...attempt, status: "evaluated" as const };
      setDetail({ attempt: saved, evaluation });
      setAttempts(prev => [saved, ...prev.filter(a => a.id !== saved.id)]);
      setError(null);
    } catch (e) { setError({ stage: "evaluate", message: e instanceof Error ? e.message : "Chưa phân tích được bài" }); }
  }
  async function submit(replay = false) {
    if (lock.current) return;
    if (!replay) {
      if (!refs.length || !(parent?.studySetId ?? setId) || !text.trim()) return;
      const key = uuidv4();
      pending.current = parent ? { parentId: parent.id, input: { learnerText: text, idempotencyKey: key } } :
        { parentId: null, input: { kind: tab, studySetId: setId!, learnerText: text,
          referenceSnapshots: refs, idempotencyKey: key } };
    }
    const intent = pending.current;
    if (!intent) return;
    lock.current = true; setBusy(true); setError(null);
    try {
      const attempt = intent.parentId === null ? await client.createAttempt(intent.input) :
        await client.retryAttempt(intent.parentId, intent.input);
      pending.current = null;
      setAttempts(prev => [attempt, ...prev.filter(a => a.id !== attempt.id)]);
      setSelectedAttemptId(attempt.id); setDetail({ attempt, evaluation: null }); setParent(null);
      await evaluate(attempt);
    } catch (e) { setError({ stage: "submit", message: e instanceof Error ? e.message : "Chưa gửi được bài" }); }
    finally { lock.current = false; setBusy(false); }
  }
  async function retry() {
    if (error?.stage === "submit") return submit(true);
    if (!detail || lock.current) return;
    lock.current = true; setBusy(true);
    try { await evaluate(detail.attempt); } finally { lock.current = false; setBusy(false); }
  }
  function newDraft(kind = tab, clearDraft = true) {
    if (lock.current) return;
    selectionSequence.current++; pending.current = null;
    setTab(kind); setDetail(null); setSelectedAttemptId(null); setDetailError(null); setDetailLoading(false);
    setParent(null); setError(null); if (clearDraft) setText(""); setSelectedIds([]);
  }
  function rewrite() {
    if (!detail || lock.current) return;
    const attempt = detail.attempt;
    pending.current = null; setParent(attempt); setTab(attempt.kind); setSetId(attempt.studySetId);
    setSelectedIds(attempt.referenceSnapshots.map(r => r.conceptId));
    setDetail(null); setSelectedAttemptId(null); setError(null);
  }
  const writing = !detail && !detailLoading && !detailError && !error;
  return <AppLayout><div className="max-w-7xl mx-auto space-y-6">
    <div className="flex flex-wrap justify-between gap-3">
      <div><h1 className="text-2xl font-bold">Luyện tập</h1><p className="text-sm text-muted-foreground">Giải thích Feynman hoặc viết lại từ trí nhớ.</p></div>
      <Button variant="secondary" disabled={busy} onClick={() => newDraft()}>Lượt tập mới</Button>
    </div>
    {loadError && <ErrorState title="Không tải được dữ liệu" body={loadError} onRetry={() => setVersion(v => v + 1)} />}
    {loading ? <p role="status">Đang tải dữ liệu…</p> : <>
      <Tabs value={tab} onValueChange={v => newDraft(v as PracticeKind, false)}>
        <TabsList><TabsTrigger value="feynman" disabled={busy}><BookOpen className="w-4 h-4" /> Feynman</TabsTrigger>
          <TabsTrigger value="blurting" disabled={busy}><EyeOff className="w-4 h-4" /> Blurting</TabsTrigger></TabsList>
      </Tabs>
      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        <aside className="space-y-4">
          {parent ? <Card className="p-4 text-sm">Viết lại lượt đã lưu, giữ nguyên {refs.length} phiên bản khái niệm tham chiếu.</Card> :
            <Card className="p-4"><ConceptPicker concepts={concepts} studySets={sets} studySetIdFilter={setId}
              selectedIds={selectedIds} disabled={busy || !writing} hideBody={tab === "blurting"}
              onStudySetChange={id => { setSetId(id); setSelectedIds([]); }}
              onToggle={id => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])} /></Card>}
          <PracticeAttemptHistory kind={tab} attempts={attempts} selectedId={selectedAttemptId} onSelect={id => { void selectAttempt(id); }} disabled={busy} />
        </aside>
        <section className="space-y-4 min-w-0">
          {writing && <Card className="p-5">{tab === "feynman" ?
            <FeynmanWriter selectedReferenceSnapshots={refs} value={text} onSubmit={() => { void submit(); }} draftId="current" onDraftChange={setText} /> :
            <BlurtingWriter selectedCount={refs.length} value={text} onSubmit={() => { void submit(); }} draftId="current" onDraftChange={setText} />}
          </Card>}
          {(busy || detailLoading) && <Card className="p-8" role="status">{detailLoading ? "Đang tải lượt tập…" : "Đang lưu và phân tích bài…"}</Card>}
          {detailError && <ErrorState title="Không tải được lượt tập" body={detailError} onRetry={() => { if (selectedAttemptId) void selectAttempt(selectedAttemptId); }} />}
          {detail && !busy && <Card className="p-5 space-y-4">
            <h2 className="font-semibold">Bài đã lưu</h2><p className="text-sm whitespace-pre-wrap">{detail.attempt.learnerText}</p>
            {detail.evaluation ? detail.evaluation.result.kind === "feynman" ? <FeynmanFeedback evaluation={detail.evaluation} /> :
              <BlurtingResults evaluation={detail.evaluation} /> : !error && <Button onClick={() => { setError({ stage: "evaluate", message: "Lượt này chưa có đánh giá." }); }}>Tiếp tục phân tích</Button>}
            <Button variant="secondary" onClick={rewrite} disabled={busy}><RotateCcw className="w-4 h-4" /> Viết lại</Button>
          </Card>}
          {error && <RecoverableErrorBox title={error.stage === "submit" ? "Chưa xác nhận được việc lưu bài" : "Bài đã lưu, chưa phân tích xong"}
            body={error.message} onRetry={retry} onBackToWriter={() => { if (detail) rewrite(); else { pending.current = null; setError(null); } }} />}
        </section>
      </div>
    </>}
  </div></AppLayout>;
}
export default function PracticePage() {
  return <Suspense fallback={<p>Đang tải…</p>}><PracticeInner /></Suspense>;
}
