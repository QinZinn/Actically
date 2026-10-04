"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { StudyMode, Source, Concept } from "@/contracts/dto";
import AppLayout from "@/components/layout/AppLayout";
import { toast } from "@/components/ui/toast";
import { ErrorState } from "@/components/ui/error-state";
import { useActicallyClient } from "@/features/client-provider";
import { useSession } from "@/features/session/useSession";
import { allPages } from "@/lib/client/pagination";
import SessionHeader from "@/features/session/SessionHeader";
import MessageList from "@/features/session/MessageList";
import SessionComposer from "@/features/session/SessionComposer";
import MarkdownRenderer from "@/components/markdown/MarkdownRenderer";

function SessionBody({ sessionId }: { sessionId: string }) {
  const client = useActicallyClient();
  const router = useRouter();
  const state = useSession(sessionId);
  const [modeOverride, setMode] = React.useState<StudyMode | null>(null);
  const [sourceOpen, setSourceOpen] = React.useState(false);
  const [sources, setSources] = React.useState<Source[]>([]);
  const [concepts, setConcepts] = React.useState<Concept[]>([]);
  const [contextError, setContextError] = React.useState<string | null>(null);
  const [updating, setUpdating] = React.useState(false);
  const updateLock = React.useRef(false);
  const mode = modeOverride ?? state.session?.mode ?? "socratic";
  const studySetId = state.session?.studySetId ?? null;
  React.useEffect(() => {
    let active = true;
    Promise.all([studySetId ? client.listSources(studySetId) : Promise.resolve([]),
      studySetId ? allPages(q => client.listConcepts({ ...q, studySetId })) : Promise.resolve([])])
      .then(([s, c]) => { if (active) { setSources(s); setConcepts(c); setContextError(null); } })
      .catch(e => { if (active) setContextError(e.message); });
    return () => { active = false; };
  }, [client, studySetId, state.session?.status, sourceOpen]);
  async function update(input: Parameters<typeof state.updateSession>[0]) {
    if (updateLock.current || state.sending) return;
    updateLock.current = true; setUpdating(true);
    try { await state.updateSession(input); }
    catch (e) { setMode(null); toast({ variant: "error", title: "Không lưu được thay đổi", description: e instanceof Error ? e.message : undefined }); }
    finally { updateLock.current = false; setUpdating(false); }
  }
  const context = <div className="space-y-5">
    {contextError && <p role="alert">{contextError}</p>}
    <section><h3 className="font-semibold mb-2">Khái niệm</h3>
      {concepts.length ? concepts.map(c => <Link className="block p-2 rounded hover:bg-popover" key={c.id} href={`/knowledge?id=${encodeURIComponent(c.id)}`}>{c.title} · {c.status === "pending" ? "Chờ duyệt" : c.status === "approved" ? "Đã duyệt" : "Đã loại"}</Link>) : <p className="text-sm text-muted-foreground">Chưa có khái niệm. Kết thúc phiên để trích xuất.</p>}
    </section>
    <section><h3 className="font-semibold mb-2">Nguồn đã liên kết</h3>
      {sources.length ? sources.map(s => <details key={s.id} className="py-2"><summary className="cursor-pointer">{s.title} · r{s.revision}</summary><MarkdownRenderer>{s.content}</MarkdownRenderer></details>) : <p className="text-sm text-muted-foreground">Phiên chưa có nguồn tham khảo.</p>}
    </section>
  </div>;
  return <AppLayout contextPanel={context} conversation>
    <div className="flex flex-1 min-h-0 flex-col">
      {!state.session ? state.error ? <ErrorState title="Không thể tải phiên học" body={state.error} onRetry={state.reload} /> : <p role="status">Đang tải phiên học…</p> : <>
        <SessionHeader session={state.session} busy={state.sending || state.ending || updating}
          onRename={title => update({ title })}
          onDelete={async () => { try { await client.deleteSession(sessionId); router.push("/"); } catch (e) { toast({ variant: "error", title: "Không xóa được phiên", description: e instanceof Error ? e.message : undefined }); } }}
          onEndExtractConcepts={() => updateLock.current ? Promise.resolve(undefined) : state.finishSession()} />
        {state.error && <p role="alert" className="text-error p-2">{state.error}</p>}
        <div className="flex min-h-0 flex-1 flex-col"><MessageList messages={state.messages} actionsDisabled={updating || state.sending || state.ending || state.session.status === "ended"}
          onRetry={m => { if (!updateLock.current) void state.handleRetry(m); }}
          onAnswer={(m, a) => updateLock.current ? Promise.resolve(false) : state.sendMessage("ask", `Với câu kiểm tra hiểu: ${m.solve?.comprehensionCheck ?? ""}\nCâu trả lời của tôi: ${a}`)}
          onFollowUpSolveStep={(_m, step) => { if (!updateLock.current) void state.sendMessage("ask", `Xin giải thích rõ hơn bước ${step}`, step); }} /></div>
        {state.session.status === "ended" ? <p className="p-4 text-sm">Phiên đã kết thúc. <Link href="/knowledge" className="text-primary underline">Duyệt khái niệm</Link> hoặc <Link href="/" className="text-primary underline">tạo phiên mới</Link>.</p> :
          <SessionComposer draftKey={sessionId} mode={mode} onModeChange={m => { setMode(m); void update({ mode: m }); }}
            studySetId={studySetId} onStudySetChange={id => { void update({ studySetId: id }); }}
            onSend={(m, c) => updateLock.current ? Promise.resolve(false) : state.sendMessage(m, c)} disabled={updating || state.ending} sending={state.sending} onCancel={state.cancel}
            sourcePasteOpen={sourceOpen} onToggleSourcePaste={() => setSourceOpen(v => !v)} />}
      </>}
    </div>
  </AppLayout>;
}
export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  return <SessionBody key={id} sessionId={id} />;
}
