"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Plus,
  BookPlus,
  BookOpen,
  FileText,
  LayoutList,
  CheckCircle2,
  Clock,
  Pencil,
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { ErrorState } from "@/components/ui/error-state";
import { allPages } from "@/lib/client/pagination";
import { uuidv4 } from "@/lib/client/utils";
import FlashcardManager from "@/features/knowledge/FlashcardManager";
import { getClient } from "@/lib/client";
import type { Concept, Source, StudySet } from "@/contracts/dto";
import SubjectTree from "@/features/knowledge/SubjectTree";
import ConceptCard from "@/features/knowledge/ConceptCard";
import ConceptEditor from "@/features/knowledge/ConceptEditor";
import SourceEditor from "@/features/knowledge/SourceEditor";
import PendingQueue from "@/features/knowledge/PendingQueue";
import DuplicateWarningBanner from "@/features/knowledge/DuplicateWarningBanner";
import MarkdownRenderer from "@/components/markdown/MarkdownRenderer";

type KnowledgeTab = "pending" | "approved" | "all" | "sources";
const PAGE_SIZE = 50;

interface DuplicateWarn {
  title: string;
  existingConceptId: string;
}

function KnowledgePageInner() {
  const searchParams = useSearchParams();
  const client = useMemo(() => getClient(), []);

  const [tab, setTab] = useState<KnowledgeTab>("pending");
  const [studySetId, setStudySetId] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);

  const [studySets, setStudySets] = useState<StudySet[]>([]);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [duplicates] = useState<DuplicateWarn[]>([]);

  const [conceptEditorOpen, setConceptEditorOpen] = useState(false);
  const [editingConcept, setEditingConcept] = useState<Concept | null>(null);
  const [sourceEditorOpen, setSourceEditorOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [deletingSource, setDeletingSource] = useState<Source | null>(null);
  const openedQuery = useRef<string | null>(null);
  const [studySetDialogOpen, setStudySetDialogOpen] = useState(false);

  const [ssSubject, setSsSubject] = useState("");
  const [ssTitle, setSsTitle] = useState("");
  const [ssDescription, setSsDescription] = useState("");
  const [ssSaving, setSsSaving] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cardVersion, setCardVersion] = useState(0);
  const [editingSet, setEditingSet] = useState<StudySet | null>(null);
  const [deletingSet, setDeletingSet] = useState<StudySet | null>(null);

  const activeStudySetId = editingConcept?.studySetId ?? studySetId ?? studySets[0]?.id ?? "";

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sets, allConcepts] = await Promise.all([
        client.listStudySets(),
        allPages(q => client.listConcepts(q)),
      ]);
      setStudySets(sets);
      setConcepts(allConcepts);

      const srcPromises = sets.map((s) => client.listSources(s.id));
      const srcResults = await Promise.all(srcPromises);
      setSources(srcResults.flat());
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Không tải được dữ liệu");
      toast({
        variant: "error",
        title: "Không tải được dữ liệu",
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    queueMicrotask(() => {
      loadAll();
    });
  }, [loadAll]);

  useEffect(() => {
    queueMicrotask(() => {
      const paramConcept = searchParams.get("id");
      const paramStudySet = searchParams.get("studySet");
      if (paramStudySet) setStudySetId(paramStudySet);
      if (paramConcept) {
        const c = concepts.find((x) => x.id === paramConcept);
        if (c && openedQuery.current !== paramConcept) {
          openedQuery.current = paramConcept;
          setEditingConcept(c);
          setConceptEditorOpen(true);
        }
      }
    });
  }, [searchParams, concepts]);

  const filteredConcepts = useMemo(() => {
    let list = concepts;
    if (studySetId) list = list.filter((c) => c.studySetId === studySetId);
    if (tab === "pending") list = list.filter((c) => c.status === "pending");
    else if (tab === "approved") list = list.filter((c) => c.status === "approved");
    return list.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [concepts, studySetId, tab]);

  const filteredSources = useMemo(() => {
    if (!studySetId) return sources;
    return sources.filter((s) => s.studySetId === studySetId);
  }, [sources, studySetId]);

  const pageData = useMemo(() => {
    return filteredConcepts.slice(offset, offset + PAGE_SIZE);
  }, [filteredConcepts, offset]);

  const hasPrev = offset > 0;
  const hasNext = offset + PAGE_SIZE < filteredConcepts.length;

  const handleCreateStudySet = async () => {
    if (!ssSubject.trim() || !ssTitle.trim()) {
      toast({ variant: "warning", title: "Thiếu thông tin" });
      return;
    }
    setSsSaving(true);
    try {
      const input = {
        subject: ssSubject.trim(),
        title: ssTitle.trim(),
        description: ssDescription.trim(),
      };
      const created = editingSet ? await client.updateStudySet(editingSet.id, { ...input, expectedRevision: editingSet.revision }) : await client.createStudySet(input);
      setStudySets((prev) => [...prev.filter(s => s.id !== created.id), created]);
      toast({
        variant: "success",
        title: "Đã lưu bộ học",
        description: created.title,
      });
      setStudySetDialogOpen(false);
      setEditingSet(null);
      setSsSubject("");
      setSsTitle("");
      setSsDescription("");
      setStudySetId(created.id);
    } catch (err) {
      toast({
        variant: "error",
        title: "Không tạo được",
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSsSaving(false);
    }
  };

  const refreshConcept = useCallback(
    (saved: Concept, remove = false) => {
      setConcepts((prev) => {
        const others = prev.filter((c) => c.id !== saved.id);
        if (remove) return others;
        return [saved, ...others];
      });
    },
    []
  );

  const handleApprove = useCallback(
    async (c: Concept) => {
      try {
        const saved = await client.updateConcept(c.id, {
          status: "approved",
          expectedRevision: c.revision,
        });
        refreshConcept(saved);
        toast({
          variant: "success",
          title: "Đã duyệt",
          description: saved.title,
        });
        try {
          await client.generateCard({ conceptId: saved.id, expectedConceptRevision: saved.revision, idempotencyKey: uuidv4() });
          setCardVersion(v => v + 1);
        } catch (e) {
          toast({ variant: "warning", title: "Đã duyệt, chưa tạo được thẻ", description: (e instanceof Error ? e.message + " " : "") + "Mở mục Đã duyệt và chọn Tạo thẻ để thử lại." });
        }
      } catch (err) {
        toast({
          variant: "error",
          title: "Không duyệt được",
          description: err instanceof Error ? err.message : undefined,
        });
      }
    },
    [client, refreshConcept]
  );

  const handleReject = useCallback(
    async (c: Concept) => {
      try {
        const saved = await client.updateConcept(c.id, {
          status: "rejected",
          expectedRevision: c.revision,
        });
        refreshConcept(saved);
        toast({
          variant: "warning",
          title: "Đã loại",
          description: saved.title,
        });
      } catch (err) {
        toast({
          variant: "error",
          title: "Không loại được",
          description: err instanceof Error ? err.message : undefined,
        });
      }
    },
    [client, refreshConcept]
  );

  const handleDeleteConcept = useCallback(
    async (c: Concept) => {
      try {
        await client.deleteConcept(c.id);
        refreshConcept(c, true);
        toast({ variant: "info", title: "Đã xóa khái niệm" });
      } catch (err) {
        toast({
          variant: "error",
          title: "Không xóa được",
          description: err instanceof Error ? err.message : undefined,
        });
      }
    },
    [client, refreshConcept]
  );

  const handleEditConcept = (c: Concept) => {
    setEditingConcept(c);
    setConceptEditorOpen(true);
  };

  const handleNewConcept = () => {
    if (studySets.length === 0) {
      toast({
        variant: "warning",
        title: "Cần có bộ học trước",
        description: "Tạo bộ học trước khi tạo khái niệm.",
      });
      setStudySetDialogOpen(true);
      return;
    }
    setEditingConcept(null);
    setConceptEditorOpen(true);
  };

  const handleEditSource = (s: Source) => {
    setEditingSource(s);
    setSourceEditorOpen(true);
  };

  const handleNewSource = () => {
    if (studySets.length === 0) {
      toast({
        variant: "warning",
        title: "Cần có bộ học trước",
      });
      setStudySetDialogOpen(true);
      return;
    }
    setEditingSource(null);
    setSourceEditorOpen(true);
  };

  const refreshSource = useCallback((s: Source, remove = false) => {
    setSources((prev) => {
      const others = prev.filter((x) => x.id !== s.id);
      if (remove) return others;
      return [s, ...others];
    });
  }, []);

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 max-w-[1400px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-foreground">Kiến thức</h1>
            <p className="text-sm text-muted-foreground">
              Quản lý bộ học, khái niệm và nguồn tham khảo.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="secondary"
              onClick={() => { setEditingSet(null); setSsSubject(""); setSsTitle(""); setSsDescription(""); setStudySetDialogOpen(true); }}
              className="gap-2"
            >
              <BookPlus className="h-4 w-4" />
              Tạo bộ học mới
            </Button>
            <Button onClick={handleNewConcept} className="gap-2">
              <Plus className="h-4 w-4" />
              Tạo khái niệm thủ công
            </Button>
          </div>
        </div>

        {duplicates.length > 0 && (
          <DuplicateWarningBanner warnings={duplicates} />
        )}
        {loadError && <ErrorState title="Không tải được Kiến thức" body={loadError} onRetry={loadAll} />}
        {studySetId && <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => { const s = studySets.find(x => x.id === studySetId); if (s) { setEditingSet(s); setSsSubject(s.subject); setSsTitle(s.title); setSsDescription(s.description); setStudySetDialogOpen(true); } }}>Sửa bộ học</Button>
          <Button variant="ghost" size="sm" onClick={() => setDeletingSet(studySets.find(x => x.id === studySetId) ?? null)}>Xóa bộ học</Button>
        </div>}

        <div className="grid lg:grid-cols-[300px_1fr] gap-6">
          <aside className="lg:sticky lg:top-0 lg:self-start">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <LayoutList className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold text-sm">Cây chủ đề</h2>
              </div>
              {loading ? (
                <div className="text-sm text-muted-foreground py-6 text-center">
                  Đang tải…
                </div>
              ) : (
                <SubjectTree
                  studySets={studySets}
                  concepts={concepts}
                  sources={sources}
                  studySetId={studySetId}
                  onSelect={id => { setStudySetId(id); setOffset(0); }}
                />
              )}
            </Card>
          </aside>

          <section className="flex flex-col gap-4 min-w-0">
            <Tabs
              defaultValue="pending"
              value={tab}
              onValueChange={(v) => {
                setTab(v as KnowledgeTab);
                setOffset(0);
              }}
            >
              <TabsList className="flex-wrap h-auto py-1">
                <TabsTrigger value="pending" className="gap-2 h-8">
                  <Clock className="h-4 w-4" />
                  Chờ duyệt
                  <Badge variant="pending" size="sm">
                    {concepts.filter((c) => c.status === "pending").length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="approved" className="gap-2 h-8">
                  <CheckCircle2 className="h-4 w-4" />
                  Đã duyệt
                </TabsTrigger>
                <TabsTrigger value="all" className="gap-2 h-8">
                  <FileText className="h-4 w-4" />
                  Tất cả
                </TabsTrigger>
                <TabsTrigger value="sources" className="gap-2 h-8">
                  <BookOpen className="h-4 w-4" />
                  Nguồn
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="mt-4">
                {loading ? (
                  <div className="text-sm text-muted-foreground py-12 text-center">
                    Đang tải…
                  </div>
                ) : (
                  <PendingQueue
                    concepts={concepts}
                    studySetId={studySetId}
                    onEdit={handleEditConcept}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onDelete={handleDeleteConcept}
                  />
                )}
              </TabsContent>

              <TabsContent value="approved" className="mt-4">
                <ConceptGrid
                  concepts={pageData}
                  hasPrev={hasPrev}
                  hasNext={hasNext}
                  offset={offset}
                  total={filteredConcepts.length}
                  onPrev={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
                  onNext={() => setOffset((o) => o + PAGE_SIZE)}
                  onEdit={handleEditConcept}
                  onDelete={handleDeleteConcept}
                  loading={loading}
                />
                <FlashcardManager concepts={filteredConcepts} version={cardVersion} />
              </TabsContent>

              <TabsContent value="all" className="mt-4">
                <ConceptGrid
                  concepts={pageData}
                  hasPrev={hasPrev}
                  hasNext={hasNext}
                  offset={offset}
                  total={filteredConcepts.length}
                  onPrev={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
                  onNext={() => setOffset((o) => o + PAGE_SIZE)}
                  onEdit={handleEditConcept}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onDelete={handleDeleteConcept}
                  loading={loading}
                />
              </TabsContent>

              <TabsContent value="sources" className="mt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm text-muted-foreground">
                    {filteredSources.length} nguồn
                    {studySetId && " trong bộ học đã chọn"}
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleNewSource}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Tạo nguồn
                  </Button>
                </div>
                {loading ? (
                  <div className="text-sm text-muted-foreground py-12 text-center">
                    Đang tải…
                  </div>
                ) : filteredSources.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-12 text-center border border-dashed border-border rounded-lg">
                    Chưa có nguồn nào. Tạo nguồn đầu tiên nhé.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {filteredSources.map((s) => (
                      <Card key={s.id} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                              <h3 className="font-semibold truncate">
                                {s.title}
                              </h3>
                              <Badge variant="secondary" size="sm">
                                rev {s.revision}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mb-2">
                              Bộ học:{" "}
                              {studySets.find((ss) => ss.id === s.studySetId)
                                ?.title ?? s.studySetId}
                            </div>
                            <div className="text-sm text-muted-foreground line-clamp-3">
                              <MarkdownRenderer>
                                {s.content.slice(0, 600)}
                              </MarkdownRenderer>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleEditSource(s)}
                            className="gap-1 shrink-0"
                          >
                            <Pencil className="h-4 w-4" />
                            Sửa
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeletingSource(s)}>Xóa nguồn</Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </section>
        </div>
      </div>

      <ConceptEditor
        open={conceptEditorOpen}
        onOpenChange={setConceptEditorOpen}
        concept={editingConcept}
        studySetId={activeStudySetId}
        sources={sources.filter(
          (s) => !activeStudySetId || s.studySetId === activeStudySetId
        )}
        onSaved={(c) => refreshConcept(c)}
      />

      <SourceEditor
        open={sourceEditorOpen}
        onOpenChange={setSourceEditorOpen}
        source={editingSource}
        studySetId={editingSource?.studySetId ?? studySetId ?? studySets[0]?.id ?? ""}
        onSaved={(s) => refreshSource(s)}
      />

      <Dialog open={studySetDialogOpen} onOpenChange={setStudySetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSet ? "Sửa bộ học" : "Tạo bộ học mới"}</DialogTitle>
            <DialogDescription>
              Bộ học chứa các khái niệm và nguồn cùng chủ đề.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label>Chủ đề (môn học, lĩnh vực)</Label>
              <Input
                value={ssSubject}
                onChange={(e) => setSsSubject(e.target.value.slice(0, 200))}
                placeholder="Ví dụ: Vật lý 10"
                maxLength={200}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Tên bộ học</Label>
              <Input
                value={ssTitle}
                onChange={(e) => setSsTitle(e.target.value.slice(0, 200))}
                placeholder="Ví dụ: Chương 1 — Động học chất điểm"
                maxLength={200}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Mô tả (tùy chọn, tối đa 4000 ký tự)</Label>
              <Textarea
                value={ssDescription}
                onChange={(e) => setSsDescription(e.target.value.slice(0, 4000))}
                placeholder="Mô tả ngắn gọn nội dung bộ học…"
                maxLength={4000}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setStudySetDialogOpen(false)}
              disabled={ssSaving}
            >
              Hủy
            </Button>
            <Button onClick={handleCreateStudySet} disabled={ssSaving}>
              {ssSaving ? "Đang lưu…" : "Lưu bộ học"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!deletingSet} onOpenChange={v => { if (!v) setDeletingSet(null); }}>
        <DialogContent><DialogHeader><DialogTitle>Xóa bộ học?</DialogTitle></DialogHeader>
          <p className="text-sm">Bộ học và các thẻ liên quan sẽ rời danh sách đang học. Lịch sử đã lưu vẫn được giữ.</p>
          <DialogFooter><Button variant="danger" onClick={async () => {
            if (!deletingSet) return;
            try { await client.deleteStudySet(deletingSet.id); setDeletingSet(null); setStudySetId(null); setOffset(0); await loadAll(); }
            catch (e) { toast({ variant: "error", title: "Không xóa được bộ học", description: e instanceof Error ? e.message : undefined }); }
          }}>Xóa bộ học</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!deletingSource} onOpenChange={v => { if (!v) setDeletingSource(null); }}>
        <DialogContent><DialogHeader><DialogTitle>Xóa nguồn khỏi bộ học?</DialogTitle></DialogHeader>
          <p className="text-sm">Các phiên bản tham chiếu trong lịch sử vẫn được giữ.</p>
          <DialogFooter><Button variant="danger" onClick={async () => {
            if (!deletingSource) return;
            try { await client.deleteSource(deletingSource.id); refreshSource(deletingSource, true); setDeletingSource(null); }
            catch (e) { toast({ variant: "error", title: "Không xóa được nguồn", description: e instanceof Error ? e.message : undefined }); }
          }}>Xóa nguồn</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Đang tải…</div>}>
      <KnowledgePageInner />
    </Suspense>
  );
}

interface ConceptGridProps {
  concepts: Concept[];
  total: number;
  offset: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onEdit?: (c: Concept) => void;
  onApprove?: (c: Concept) => void;
  onReject?: (c: Concept) => void;
  onDelete?: (c: Concept) => void;
  loading: boolean;
}

function ConceptGrid({
  concepts,
  total,
  offset,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onEdit,
  onApprove,
  onReject,
  onDelete,
  loading,
}: ConceptGridProps) {
  if (loading) {
    return (
      <div className="text-sm text-muted-foreground py-12 text-center">
        Đang tải…
      </div>
    );
  }
  if (concepts.length === 0 && total === 0) {
    return (
      <div className="text-sm text-muted-foreground py-12 text-center border border-dashed border-border rounded-lg">
        Không có khái niệm nào.
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {concepts.map((c) => (
          <ConceptCard
            key={c.id}
            concept={c}
            onEdit={onEdit}
            onApprove={c.status === "pending" ? onApprove : undefined}
            onReject={c.status === "pending" ? onReject : undefined}
            onDelete={onDelete}
          />
        ))}
      </div>
      <div className="flex items-center justify-between pt-2">
        <div className="text-xs text-muted-foreground">
          {total === 0
            ? "0 khái niệm"
            : `${offset + 1}–${Math.min(offset + PAGE_SIZE, total)} / ${total}`}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={onPrev}
            disabled={!hasPrev}
          >
            ← Trước
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={onNext}
            disabled={!hasNext}
          >
            Sau →
          </Button>
        </div>
      </div>
    </div>
  );
}
