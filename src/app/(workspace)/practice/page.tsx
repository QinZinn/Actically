"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, EyeOff, RotateCcw } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getClient } from "@/lib/client";
import { uuidv4 } from "@/lib/client/utils";
import type {
  Concept,
  ConceptRef,
  PracticeAttempt,
  PracticeDetail,
  PracticeKind,
} from "@/contracts/dto";
import ConceptPicker from "@/features/practice/ConceptPicker";
import PracticeAttemptHistory from "@/features/practice/PracticeAttemptHistory";
import FeynmanWriter from "@/features/practice/FeynmanWriter";
import FeynmanFeedback from "@/features/practice/FeynmanFeedback";
import BlurtingWriter from "@/features/practice/BlurtingWriter";
import BlurtingResults from "@/features/practice/BlurtingResults";
import RecoverableErrorBox from "@/features/practice/RecoverableErrorBox";
import { toast } from "@/components/ui/use-toast";
import { ActicallyClientError } from "@/lib/client/errors";

type ErrorKind = "submit" | "evaluate" | null;

export default function PracticePageClient() {
  const [tab, setTab] = useState<PracticeKind>("feynman");

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [, setConceptsLoaded] = useState(false);

  const [attempts, setAttempts] = useState<PracticeAttempt[]>([]);
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<PracticeDetail | null>(null);

  const [feynmanDraftId] = useState(() => uuidv4());
  const [blurtingDraftId] = useState(() => uuidv4());
  const [, setFeynmanDraft] = useState("");
  const [, setBlurtingDraft] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [errorKind, setErrorKind] = useState<ErrorKind>(null);
  const [errorBody, setErrorBody] = useState<string>("");
  const [pendingRetryData, setPendingRetryData] = useState<{
    kind: PracticeKind;
    text: string;
    retryOfId?: string;
  } | null>(null);

  const client = useMemo(() => getClient(), []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [list, approved] = await Promise.all([
          client.listAttempts(),
          client.listConcepts({ status: "approved" }),
        ]);
        if (cancelled) return;
        setAttempts(list.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ));
        setConcepts(approved);
        setConceptsLoaded(true);
      } catch (err) {
        if (cancelled) return;
        toast({
          variant: "error",
          title: "Không tải được dữ liệu",
          description: err instanceof Error ? err.message : "Lỗi không xác định",
        });
        setConceptsLoaded(true);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [client]);

  const selectedRefs: ConceptRef[] = useMemo(() => {
    const map = new Map(concepts.map((c) => [c.id, c]));
    return selectedIds
      .map((id) => map.get(id))
      .filter((c): c is Concept => !!c)
      .map((c) => ({ conceptId: c.id, revision: c.revision }));
  }, [selectedIds, concepts]);

  const studySetId = useMemo(() => {
    const first = concepts.find((c) => selectedIds.includes(c.id));
    return first?.studySetId ?? "default-study-set";
  }, [concepts, selectedIds]);

  const currentTabAttempts = useMemo(
    () => attempts.filter((a) => a.kind === tab),
    [attempts, tab]
  );

  const latestAttempt = currentTabAttempts[0] ?? null;
  const displayDetail = selectedDetail;
  const displayEvaluation = displayDetail?.evaluation ?? null;
  const displayAttempt = displayDetail?.attempt ?? latestAttempt;

  const handleToggleConcept = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const handleSelectAttempt = useCallback(
    async (id: string) => {
      setSelectedAttemptId(id);
      try {
        const detail = await client.getAttempt(id);
        setSelectedDetail(detail);
      } catch (err) {
        toast({
          variant: "error",
          title: "Không tải được chi tiết lượt tập",
          description: err instanceof Error ? err.message : undefined,
        });
      }
    },
    [client]
  );

  const runEvaluate = useCallback(
    async (attempt: PracticeAttempt) => {
      setEvaluating(true);
      setErrorKind(null);
      try {
        const ev = await client.evaluateAttempt(attempt.id);
        const detail: PracticeDetail = { attempt, evaluation: ev };
        setSelectedDetail(detail);
        setAttempts((prev) =>
          prev.map((a) =>
            a.id === attempt.id ? { ...a, status: "evaluated" } : a
          )
        );
        setPendingRetryData(null);
      } catch (err) {
        setErrorKind("evaluate");
        setErrorBody(err instanceof Error ? err.message : "");
        if (err instanceof ActicallyClientError && err.code === "CONFLICT") {
          toast({
            variant: "warning",
            title: "Trùng lặp",
            description: "Lượt phân tích đã được thực hiện từ nơi khác, làm mới.",
          });
        }
      } finally {
        setEvaluating(false);
      }
    },
    [client]
  );

  const handleSubmitFeynman = useCallback(
    async (text: string, idempotencyKey: string) => {
      if (selectedRefs.length === 0) return;
      setSubmitting(true);
      setErrorKind(null);
      setSelectedAttemptId(null);
      setSelectedDetail(null);
      try {
        const attempt = await client.createAttempt({
          kind: "feynman",
          studySetId,
          learnerText: text,
          referenceSnapshots: selectedRefs,
          idempotencyKey,
        });
        setAttempts((prev) =>
          [attempt, ...prev].sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        );
        setSelectedAttemptId(attempt.id);
        setSelectedDetail({ attempt, evaluation: null });
        setPendingRetryData({ kind: "feynman", text });
        setAttempts((prev) =>
          prev.map((a) =>
            a.id === attempt.id ? { ...a, status: "evaluating" } : a
          )
        );
        await runEvaluate({ ...attempt, status: "evaluating" });
      } catch (err) {
        setErrorKind("submit");
        setErrorBody(err instanceof Error ? err.message : "");
        setPendingRetryData({ kind: "feynman", text });
      } finally {
        setSubmitting(false);
      }
    },
    [client, selectedRefs, studySetId, runEvaluate]
  );

  const handleSubmitBlurting = useCallback(
    async (text: string, idempotencyKey: string) => {
      if (selectedRefs.length === 0) return;
      setSubmitting(true);
      setErrorKind(null);
      setSelectedAttemptId(null);
      setSelectedDetail(null);
      try {
        const attempt = await client.createAttempt({
          kind: "blurting",
          studySetId,
          learnerText: text,
          referenceSnapshots: selectedRefs,
          idempotencyKey,
        });
        setAttempts((prev) =>
          [attempt, ...prev].sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        );
        setSelectedAttemptId(attempt.id);
        setSelectedDetail({ attempt, evaluation: null });
        setPendingRetryData({ kind: "blurting", text });
        setAttempts((prev) =>
          prev.map((a) =>
            a.id === attempt.id ? { ...a, status: "evaluating" } : a
          )
        );
        await runEvaluate({ ...attempt, status: "evaluating" });
      } catch (err) {
        setErrorKind("submit");
        setErrorBody(err instanceof Error ? err.message : "");
        setPendingRetryData({ kind: "blurting", text });
      } finally {
        setSubmitting(false);
      }
    },
    [client, selectedRefs, studySetId, runEvaluate]
  );

  const handleRetry = useCallback(async () => {
    if (!pendingRetryData) return;
    const { text, kind, retryOfId } = pendingRetryData;
    const key = uuidv4();

    if (retryOfId) {
      setSubmitting(true);
      setErrorKind(null);
      try {
        const attempt = await client.retryAttempt(retryOfId, {
          learnerText: text,
          idempotencyKey: key,
        });
        setAttempts((prev) =>
          [attempt, ...prev].sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        );
        setSelectedAttemptId(attempt.id);
        setSelectedDetail({ attempt, evaluation: null });
        setAttempts((prev) =>
          prev.map((a) =>
            a.id === attempt.id ? { ...a, status: "evaluating" } : a
          )
        );
        await runEvaluate({ ...attempt, status: "evaluating" });
      } catch (err) {
        setErrorKind("submit");
        setErrorBody(err instanceof Error ? err.message : "");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (kind === "feynman") {
      await handleSubmitFeynman(text, key);
    } else {
      await handleSubmitBlurting(text, key);
    }
  }, [pendingRetryData, client, handleSubmitFeynman, handleSubmitBlurting, runEvaluate]);

  const handleBackToWriter = useCallback(() => {
    setErrorKind(null);
    setSelectedAttemptId(null);
    setSelectedDetail(null);
  }, []);

  const handleStartRetry = useCallback(() => {
    if (displayAttempt) {
      setPendingRetryData({
        kind: tab,
        text: displayAttempt.learnerText,
        retryOfId: displayAttempt.id,
      });
    }
    setSelectedAttemptId(null);
    setSelectedDetail(null);
    setErrorKind(null);
  }, [displayAttempt, tab]);

  const showWriter =
    !displayEvaluation &&
    !(submitting || evaluating) &&
    !selectedAttemptId;

  const showEvaluation = !!displayEvaluation;

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 max-w-7xl mx-auto">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-foreground">Luyện tập</h1>
          <p className="text-sm text-muted-foreground">
            Giải thích Feynman hoặc Viết lại từ bộ nhớ để củng cố kiến thức.
          </p>
        </div>

        <Tabs
          defaultValue="feynman"
          value={tab}
          onValueChange={(v) => {
            setTab(v as PracticeKind);
            setSelectedAttemptId(null);
            setSelectedDetail(null);
            setErrorKind(null);
          }}
          className="w-full"
        >
          <TabsList>
            <TabsTrigger value="feynman" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Giải thích Feynman
            </TabsTrigger>
            <TabsTrigger value="blurting" className="gap-2">
              <EyeOff className="h-4 w-4" />
              Viết lại Blurting
            </TabsTrigger>
          </TabsList>

          <TabsContent value="feynman" className="mt-6">
            <div className="grid lg:grid-cols-[360px_1fr] gap-6">
              <div className="flex flex-col gap-4">
                <Card className="p-4">
                  <h3 className="text-sm font-semibold mb-3">
                    Chọn khái niệm đã duyệt
                  </h3>
                  <ConceptPicker
                    selectedIds={selectedIds}
                    onToggle={handleToggleConcept}
                    disabled={submitting || evaluating}
                  />
                </Card>
                <PracticeAttemptHistory
                  kind="feynman"
                  attempts={attempts}
                  selectedId={selectedAttemptId}
                  onSelect={handleSelectAttempt}
                />
              </div>

              <div className="flex flex-col gap-4">
                {showWriter && (
                  <Card className="p-5 min-h-[500px]">
                    <FeynmanWriter
                      selectedReferenceSnapshots={selectedRefs}
                      onSubmit={handleSubmitFeynman}
                      draftId={feynmanDraftId}
                      onDraftChange={setFeynmanDraft}
                    />
                  </Card>
                )}

                {(submitting || evaluating) && (
                  <Card className="p-8">
                    <div className="text-center text-muted-foreground">
                      <div className="font-medium text-foreground">
                        {submitting ? "Đang gửi bài…" : "Đang phân tích bài giải thích…"}
                      </div>
                      <div className="text-xs mt-1">
                        Vui lòng chờ trong giây lát.
                      </div>
                    </div>
                  </Card>
                )}

                {showEvaluation && displayEvaluation && (
                  <div className="flex flex-col gap-4">
                    <Card className="p-5">
                      <FeynmanFeedback evaluation={displayEvaluation} />
                    </Card>
                    <div className="flex justify-end">
                      <Button
                        variant="secondary"
                        onClick={handleStartRetry}
                        className="gap-2"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Viết lại
                      </Button>
                    </div>
                  </div>
                )}

                {errorKind && (
                  <RecoverableErrorBox
                    title={
                      errorKind === "evaluate"
                        ? "Chưa phân tích được bài giải thích"
                        : "Chưa gửi được câu trả lời"
                    }
                    body={errorBody}
                    onRetry={handleRetry}
                    onBackToWriter={handleBackToWriter}
                  />
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="blurting" className="mt-6">
            <div className="grid lg:grid-cols-[360px_1fr] gap-6">
              <div className="flex flex-col gap-4">
                <Card className="p-4">
                  <h3 className="text-sm font-semibold mb-3">
                    Chọn khái niệm cần ôn
                  </h3>
                  <ConceptPicker
                    selectedIds={selectedIds}
                    onToggle={handleToggleConcept}
                    disabled={submitting || evaluating}
                  />
                </Card>
                <PracticeAttemptHistory
                  kind="blurting"
                  attempts={attempts}
                  selectedId={selectedAttemptId}
                  onSelect={handleSelectAttempt}
                />
              </div>

              <div className="flex flex-col gap-4">
                {showWriter && (
                  <Card className="p-5 min-h-[500px]">
                    <BlurtingWriter
                      selectedCount={selectedRefs.length}
                      onSubmit={handleSubmitBlurting}
                      draftId={blurtingDraftId}
                      onDraftChange={setBlurtingDraft}
                    />
                  </Card>
                )}

                {(submitting || evaluating) && (
                  <Card className="p-8">
                    <div className="text-center text-muted-foreground">
                      <div className="font-medium text-foreground">
                        {submitting ? "Đang gửi bài…" : "Đang đối chiếu kết quả…"}
                      </div>
                      <div className="text-xs mt-1">
                        Vui lòng chờ trong giây lát.
                      </div>
                    </div>
                  </Card>
                )}

                {showEvaluation && displayEvaluation && (
                  <div className="flex flex-col gap-4">
                    <Card className="p-5">
                      <BlurtingResults evaluation={displayEvaluation} />
                    </Card>
                    <div className="flex justify-end">
                      <Button
                        variant="secondary"
                        onClick={handleStartRetry}
                        className="gap-2"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Viết lại
                      </Button>
                    </div>
                  </div>
                )}

                {errorKind && (
                  <RecoverableErrorBox
                    title={
                      errorKind === "evaluate"
                        ? "Chưa phân tích được bài giải thích"
                        : "Chưa gửi được câu trả lời"
                    }
                    body={errorBody}
                    onRetry={handleRetry}
                    onBackToWriter={handleBackToWriter}
                  />
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
