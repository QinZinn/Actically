"use client";
import { useEffect, useRef, useState } from "react";
import type { Concept, Flashcard } from "@/contracts/dto";
import { useActicallyClient } from "@/features/client-provider";
import { allPages } from "@/lib/client/pagination";
import { uuidv4 } from "@/lib/client/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import MarkdownRenderer from "@/components/markdown/MarkdownRenderer";
export default function FlashcardManager({ concepts, version }: { concepts: Concept[]; version: number }) {
  const client = useActicallyClient();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [editing, setEditing] = useState<Flashcard | null>(null);
  const [deleting, setDeleting] = useState<Flashcard | null>(null);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const keys = useRef(new Map<string, string>());
  useEffect(() => {
    let active = true;
    allPages(q => client.listCards(q)).then(c => { if (active) { setCards(c); setError(null); } })
      .catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [client, version, reload]);
  function saved(card: Flashcard) { setCards(prev => [card, ...prev.filter(c => c.id !== card.id)]); }
  async function generate(c: Concept) {
    if (busy) return;
    const scope = c.id + ":" + c.revision;
    if (!keys.current.has(scope)) keys.current.set(scope, uuidv4());
    setBusy(c.id);
    try { saved(await client.generateCard({ conceptId: c.id, expectedConceptRevision: c.revision, idempotencyKey: keys.current.get(scope)! })); keys.current.delete(scope); }
    catch (e) { toast({ variant: "error", title: "Khái niệm đã duyệt, chưa tạo được thẻ", description: e instanceof Error ? e.message : undefined }); }
    finally { setBusy(null); }
  }
  async function save() {
    if (!editing || busy) return;
    setBusy(editing.id);
    try { saved(await client.updateCard(editing.id, { front, back, expectedRevision: editing.revision })); setEditing(null); }
    catch (e) { toast({ variant: "error", title: "Không sửa được thẻ", description: e instanceof Error ? e.message : undefined }); }
    finally { setBusy(null); }
  }
  async function remove() {
    if (!deleting || busy) return;
    setBusy(deleting.id);
    try { await client.deleteCard(deleting.id); setCards(prev => prev.filter(c => c.id !== deleting.id)); setDeleting(null); }
    catch (e) { toast({ variant: "error", title: "Không xóa được thẻ", description: e instanceof Error ? e.message : undefined }); }
    finally { setBusy(null); }
  }
  return <section className="space-y-3 mt-6">
    <h2 className="font-semibold">Thẻ ôn tập từ khái niệm đã duyệt</h2>
    {error && <div role="alert">{error}<Button variant="ghost" onClick={() => setReload(v => v + 1)}>Tải lại thẻ</Button></div>}
    <div className="concept-grid">
      {concepts.filter(c => c.status === "approved").map(c => {
        const card = cards.find(x => x.conceptId === c.id);
        return <Card key={c.id} className="p-4 space-y-3">
          <h3 className="font-medium">{c.title}</h3>
          {card && <><div className="text-sm"><MarkdownRenderer>{card.front}</MarkdownRenderer></div><details><summary className="text-sm cursor-pointer">Xem mặt sau</summary><MarkdownRenderer>{card.back}</MarkdownRenderer></details></>}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={!!busy} onClick={() => { void generate(c); }}>{busy === c.id ? "Đang tạo…" : card ? "Tạo lại thẻ" : "Tạo thẻ"}</Button>
            {card && <><Button size="sm" variant="secondary" disabled={!!busy} onClick={() => { setEditing(card); setFront(card.front); setBack(card.back); }}>Sửa thẻ</Button>
              <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => setDeleting(card)}>Xóa thẻ</Button></>}
          </div>
        </Card>;
      })}
    </div>
    <Dialog open={!!editing} onOpenChange={v => { if (!v && !busy) setEditing(null); }}><DialogContent>
      <DialogHeader><DialogTitle>Sửa thẻ ôn tập</DialogTitle></DialogHeader>
      <label htmlFor="card-front">Mặt trước</label><Input id="card-front" value={front} maxLength={4000} onChange={e => setFront(e.target.value)} />
      <label htmlFor="card-back">Mặt sau</label><Textarea id="card-back" value={back} maxLength={8000} onChange={e => setBack(e.target.value)} />
      <DialogFooter><Button disabled={!!busy || !front.trim() || !back.trim()} onClick={save}>Lưu thẻ</Button></DialogFooter>
    </DialogContent></Dialog>
    <Dialog open={!!deleting} onOpenChange={v => { if (!v && !busy) setDeleting(null); }}><DialogContent>
      <DialogHeader><DialogTitle>Xóa thẻ khỏi hàng đợi?</DialogTitle></DialogHeader>
      <p className="text-sm">Lịch sử đã chấm vẫn được giữ. Bạn có thể tạo lại thẻ từ khái niệm.</p>
      <DialogFooter><Button variant="danger" disabled={!!busy} onClick={remove}>Xóa thẻ</Button></DialogFooter>
    </DialogContent></Dialog>
  </section>;
}
