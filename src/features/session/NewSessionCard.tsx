"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, BookOpenText, ChevronDown, ChevronUp, Layers3, NotebookPen, History, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import type { LearningSession, StudyMode, StudySet } from "@/contracts/dto";
import type { SessionCreate } from "@/contracts/requests";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { useActicallyClient } from "@/features/client-provider";
import { toast } from "@/components/ui/use-toast";
import ModeSelector from "./ModeSelector";
import SourceInputPaste from "./SourceInputPaste";
import PageHeader from "@/components/layout/PageHeader";

interface NewSessionCardProps {
  recent?: LearningSession[];
}

export default function NewSessionCard({ recent = [] }: NewSessionCardProps) {
  const router = useRouter();
  const client = useActicallyClient();
  const [mode, setMode] = React.useState<StudyMode>("socratic");
  const [studySetId, setStudySetId] = React.useState<string | null>(null);
  const [studySets, setStudySets] = React.useState<StudySet[]>([]);
  const [sourceOpen, setSourceOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [showAll, setShowAll] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const list = await client.listStudySets();
        if (mounted) setStudySets(list);
      } catch {
        /* ignore */
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [client]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const title =
        mode === "solve"
          ? "Giải bài mới"
          : mode === "ask"
          ? "Hỏi nhanh"
          : "Phiên học mới";
      const input: SessionCreate = {
        title,
        mode,
        studySetId,
      };
      const session = await client.createSession(input);
      toast({
        title: "Đã tạo phiên",
        description: session.title,
        variant: "success",
      });
      router.push(`/sessions/${session.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast({
        title: "Tạo phiên thất bại",
        description: message ?? "Có lỗi xảy ra.",
        variant: "error",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Không gian học tập" title="Hôm nay bạn muốn học gì?" description="Bắt đầu từ một câu hỏi. Từng bước hiểu sâu, tự giải thích và ghi nhớ kiến thức." />
      <div className="home-grid">
        <Card className="overflow-hidden">
          <div className="flex items-center gap-3 border-b border-border/70 bg-primary/[0.04] px-5 py-5 sm:px-6">
            <span className="flex size-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary"><BookOpenText className="size-5" /></span>
            <div><h2 className="text-base font-semibold">Bắt đầu phiên học</h2><p className="text-xs text-muted-foreground">Chọn cách học phù hợp với bạn.</p></div>
          </div>
          <CardContent className="space-y-6 p-5 sm:p-6">
            <div className="space-y-3">
              <ModeSelector value={mode} onChange={setMode} disabled={creating} />
              <p className="text-sm leading-6 text-muted-foreground">{mode === "socratic" ? "Tự tìm ra câu trả lời qua những câu hỏi gợi mở." : mode === "solve" ? "Hiểu cách giải qua từng bước và nguyên lý liên quan." : "Nhận lời giải thích trực tiếp cho điều bạn đang thắc mắc."}</p>
            </div>
            <div className="space-y-2">
              <label htmlFor="new-session-set" className="text-sm font-medium">Bạn đang học chủ đề nào?</label>
              <Select
                id="new-session-set"
                value={studySetId ?? ""}
                onChange={(e) => setStudySetId(e.target.value || null)}
                disabled={creating}
              >
                <option value="">Học tự do · chưa chọn bộ học</option>
                {studySets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.subject} — {s.title}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-3 rounded-lg border border-dashed border-border bg-sidebar/50 p-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSourceOpen((v) => !v)}
                className="w-full justify-start gap-2"
                aria-expanded={sourceOpen}
              >
                <FileText className="size-4 text-muted-foreground" />
                Thêm tài liệu tham khảo
                {sourceOpen ? (
                  <ChevronUp className="ml-auto size-4" />
                ) : (
                  <ChevronDown className="ml-auto size-4" />
                )}
              </Button>
            {sourceOpen && (
              <SourceInputPaste
                studySetId={studySetId}
                studySets={studySets}
                onStudySetCreated={(ss) => { setStudySets(prev => [...prev, ss]); setStudySetId(ss.id); }}
              />
            )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/70 pt-5">
              <p className="text-xs text-muted-foreground">Kiến thức mới sẽ được bạn duyệt trước khi lưu.</p>
              <Button onClick={handleCreate} disabled={creating} className="w-full sm:w-auto">
                {creating ? "Đang tạo…" : "Bắt đầu học"}
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
        <aside className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tiếp tục hành trình</p>
          <Link href="/practice" className="group flex items-start gap-3 rounded-xl border border-border/80 bg-card p-5 transition-colors hover:border-primary/40">
            <NotebookPen className="mt-0.5 size-5 text-primary" /><div className="min-w-0"><h2 className="font-semibold">Tự kiểm tra kiến thức</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Giải thích bằng lời của bạn, hoặc viết lại từ trí nhớ.</p><span className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-primary">Đến luyện tập <ArrowRight className="size-3.5" /></span></div>
          </Link>
          <Link href="/review" className="group flex items-start gap-3 rounded-xl border border-border/80 bg-card p-5 transition-colors hover:border-primary/40">
            <Layers3 className="mt-0.5 size-5 text-primary" /><div className="min-w-0"><h2 className="font-semibold">Ôn để nhớ lâu</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Quay lại những thẻ đến hạn, từng chút một mỗi ngày.</p><span className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-primary">Đến ôn tập <ArrowRight className="size-3.5" /></span></div>
          </Link>
        </aside>
      </div>
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-base font-semibold"><History className="size-[18px] text-muted-foreground" />Phiên học gần đây</h2><span className="text-xs text-muted-foreground">{recent.length} phiên</span></div>
        {recent.length ? <div className="overflow-hidden rounded-xl border border-border/80 bg-card">
          {(showAll ? recent : recent.slice(0, 5)).map(s => <Link key={s.id} href={`/sessions/${s.id}`} className="flex min-w-0 items-center gap-3 border-b border-border/60 px-4 py-4 transition-colors last:border-0 hover:bg-popover sm:px-5">
            <BookOpenText className="size-[18px] text-muted-foreground" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{s.title}</span><span className="text-xs text-muted-foreground">{new Date(s.updatedAt).toLocaleDateString("vi-VN")}</span></span>
            <Badge variant="secondary" className="hidden sm:inline-flex">{s.mode === "solve" ? "Giải bài" : s.mode === "ask" ? "Hỏi nhanh" : "Socratic"}</Badge><ArrowRight className="size-4 text-muted-foreground" />
          </Link>)}
        </div> : <div className="rounded-xl border border-dashed border-border px-6 py-8 text-center text-sm text-muted-foreground">Phiên học của bạn sẽ xuất hiện ở đây. Bắt đầu phiên đầu tiên phía trên.</div>}
        {recent.length > 5 && <Button variant="ghost" size="sm" onClick={() => setShowAll(v => !v)}>{showAll ? "Thu gọn lịch sử" : "Xem thêm phiên học"}</Button>}
      </section>
    </div>
  );
}
