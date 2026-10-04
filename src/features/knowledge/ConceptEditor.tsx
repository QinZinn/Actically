"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { getClient } from "@/lib/client";
import { ActicallyClientError } from "@/lib/client/errors";
import type { Concept, Source, SourceRef } from "@/contracts/dto";
import { uuidv4 } from "@/lib/client/utils";

interface ConceptEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  concept: Concept | null;
  studySetId: string;
  sources: Source[];
  onSaved?: (c: Concept) => void;
}

type SourceRefDraft = {
  id: string;
  sourceId: string;
  revision: number;
  excerpt: string;
};

function toRefs(drafts: SourceRefDraft[]): SourceRef[] {
  return drafts
    .filter((d) => d.sourceId && d.excerpt.trim().length > 0)
    .map(({ sourceId, revision, excerpt }) => ({
      sourceId,
      revision,
      excerpt: excerpt.trim(),
    }));
}

export default function ConceptEditor({
  open,
  onOpenChange,
  concept,
  studySetId,
  sources,
  onSaved,
}: ConceptEditorProps) {
  const client = getClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [refs, setRefs] = useState<SourceRefDraft[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      if (concept) {
        setTitle(concept.title);
        setBody(concept.body);
        setRefs(
          concept.sourceRefs.map((r) => ({
            id: uuidv4(),
            sourceId: r.sourceId,
            revision: r.revision,
            excerpt: r.excerpt,
          }))
        );
      } else {
        setTitle("");
        setBody("");
        setRefs([]);
      }
    });
  }, [concept, open]);

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (!trimmedTitle) {
      toast({ variant: "warning", title: "Thiếu tiêu đề" });
      return;
    }
    if (!trimmedBody) {
      toast({ variant: "warning", title: "Thiếu nội dung" });
      return;
    }
    setSaving(true);
    try {
      const sourceRefs = toRefs(refs);
      let saved: Concept;
      if (concept) {
        saved = await client.updateConcept(concept.id, {
          title: trimmedTitle,
          body: trimmedBody,
          sourceRefs,
          expectedRevision: concept.revision,
        });
      } else {
        saved = await client.createConcept({
          studySetId,
          title: trimmedTitle,
          body: trimmedBody,
          sourceRefs,
        });
      }
      toast({
        variant: "success",
        title: concept ? "Đã cập nhật" : "Đã tạo",
        description: saved.title,
      });
      onSaved?.(saved);
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ActicallyClientError && err.code === "CONFLICT") {
        toast({
          variant: "warning",
          title: "Có bản sửa mới hơn",
          description: "Làm mới và thử lại.",
        });
      } else {
        toast({
          variant: "error",
          title: "Lưu không thành công",
          description: err instanceof Error ? err.message : undefined,
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const addRef = () => {
    const firstSource = sources[0];
    setRefs((prev) => [
      ...prev,
      {
        id: uuidv4(),
        sourceId: firstSource?.id ?? "",
        revision: firstSource?.revision ?? 1,
        excerpt: "",
      },
    ]);
  };

  const updateRef = (id: string, patch: Partial<SourceRefDraft>) => {
    setRefs((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeRef = (id: string) => {
    setRefs((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{concept ? "Sửa khái niệm" : "Tạo khái niệm mới"}</DialogTitle>
          <DialogDescription>
            Nhập tiêu đề, nội dung và các nguồn tham chiếu của khái niệm.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2 max-h-[65vh] overflow-y-auto pr-1">
          <div className="flex flex-col gap-1.5">
            <Label>Tiêu đề (tối đa 200 ký tự)</Label>
            <Input
              aria-label="Tiêu đề khái niệm"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 200))}
              placeholder="Ví dụ: Định luật Newton thứ nhất"
              maxLength={200}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Nội dung (tối đa 8000 ký tự)</Label>
            <Textarea
              aria-label="Nội dung khái niệm"
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, 8000))}
              placeholder="Viết giải thích chi tiết, markdown hỗ trợ (định nghĩa, ví dụ, công thức…)"
              className="min-h-[180px]"
              maxLength={8000}
            />
            <div className="text-xs text-muted-foreground text-right">
              {body.length} / 8000
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Nguồn tham chiếu</Label>
              <Button size="sm" variant="secondary" onClick={addRef} className="gap-1">
                <Plus className="h-4 w-4" />
                Thêm
              </Button>
            </div>
            {refs.length === 0 && (
              <div className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
                Chưa có nguồn tham chiếu nào.
              </div>
            )}
            <div className="flex flex-col gap-3">
              {refs.map((r) => {
                const selected = sources.find((s) => s.id === r.sourceId);
                return (
                  <div
                    key={r.id}
                    className="p-3 border border-border rounded-lg bg-card flex flex-col gap-2"
                  >
                    <div className="grid grid-cols-[minmax(0,1fr)_40px] gap-2 items-center sm:grid-cols-[minmax(0,1fr)_96px_40px]">
                      <Select
                        aria-label="Nguồn tham chiếu"
                        className="col-span-2 sm:col-span-1"
                        value={r.sourceId}
                        onChange={(e) => {
                          const sid = e.target.value;
                          const s = sources.find((x) => x.id === sid);
                          updateRef(r.id, {
                            sourceId: sid,
                            revision: s?.revision ?? 1,
                          });
                        }}
                      >
                        <option value="">-- Chọn nguồn --</option>
                        {sources.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.title} (r{s.revision})
                          </option>
                        ))}
                      </Select>
                      <Input
                        aria-label="Phiên bản nguồn"
                        type="number"
                        min={1}
                        value={r.revision}
                        onChange={(e) =>
                          updateRef(r.id, {
                            revision: Math.max(1, parseInt(e.target.value) || 1),
                          })
                        }
                      />
                      <Button
                        aria-label="Xóa nguồn tham chiếu"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeRef(r.id)}
                        className="h-9 w-9 text-error"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <Textarea
                      aria-label="Trích đoạn tham chiếu"
                      value={r.excerpt}
                      onChange={(e) =>
                        updateRef(r.id, { excerpt: e.target.value.slice(0, 4000) })
                      }
                      placeholder="Trích đoạn từ nguồn (tối đa 4000 ký tự)…"
                      className="min-h-[80px] text-sm"
                      maxLength={4000}
                    />
                    {selected && (
                      <div className="text-xs text-muted-foreground">
                        Nguồn hiện tại: {selected.title} — rev {selected.revision}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={saving}>
            Hủy
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Đang lưu…" : concept ? "Lưu thay đổi" : "Tạo khái niệm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
