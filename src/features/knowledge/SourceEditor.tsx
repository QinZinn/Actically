"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import type { Source } from "@/contracts/dto";

interface SourceEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: Source | null;
  studySetId: string;
  onSaved?: (s: Source) => void;
}

export default function SourceEditor({
  open,
  onOpenChange,
  source,
  studySetId,
  onSaved,
}: SourceEditorProps) {
  const client = getClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      if (source) {
        setTitle(source.title);
        setContent(source.content);
      } else {
        setTitle("");
        setContent("");
      }
    });
  }, [source, open]);

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    if (!trimmedTitle) {
      toast({ variant: "warning", title: "Thiếu tiêu đề" });
      return;
    }
    if (!trimmedContent) {
      toast({ variant: "warning", title: "Thiếu nội dung" });
      return;
    }
    setSaving(true);
    try {
      let saved: Source;
      if (source) {
        saved = await client.updateSource(source.id, {
          title: trimmedTitle,
          content: trimmedContent,
          expectedRevision: source.revision,
        });
      } else {
        saved = await client.createSource(studySetId, {
          title: trimmedTitle,
          content: trimmedContent,
        });
      }
      toast({
        variant: "success",
        title: source ? "Đã cập nhật nguồn" : "Đã tạo nguồn",
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{source ? "Sửa nguồn" : "Tạo nguồn mới"}</DialogTitle>
          <DialogDescription>
            Nhập tiêu đề và nội dung đầy đủ của nguồn tham khảo (tài liệu, sách, bài giảng…).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
          <div className="flex flex-col gap-1.5">
            <Label>Tiêu đề nguồn (tối đa 200 ký tự)</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 200))}
              placeholder="Ví dụ: Giáo trình Vật lý Lớp 10"
              maxLength={200}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Nội dung (tối đa 50.000 ký tự)</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, 50000))}
              placeholder="Dán toàn bộ nội dung nguồn (bài giảng, chương sách, ghi chú…) vào đây."
              className="min-h-[300px] font-mono text-xs leading-5"
              maxLength={50000}
            />
            <div className="text-xs text-muted-foreground text-right">
              {content.length.toLocaleString()} / 50.000
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={saving}>
            Hủy
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Đang lưu…" : source ? "Lưu thay đổi" : "Tạo nguồn"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
