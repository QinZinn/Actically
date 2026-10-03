"use client";

import * as React from "react";
import { BookOpenCheck, FileWarning } from "lucide-react";
import type { Source, StudySet } from "@/contracts/dto";
import type { SourceCreate } from "@/contracts/requests";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useActicallyClient } from "@/features/client-provider";
import { toast } from "@/components/ui/use-toast";

interface SourceInputPasteProps {
  studySetId: string | null;
  onSourceCreated?: (source: Source) => void;
  studySets?: StudySet[];
  onStudySetCreated?: (studySet: StudySet) => void;
}

export default function SourceInputPaste({
  studySetId,
  onSourceCreated,
  studySets: _studySets,
  onStudySetCreated,
}: SourceInputPasteProps) {
  void _studySets;
  const client = useActicallyClient();
  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [newSubject, setNewSubject] = React.useState("Chung");
  const [newTitle, setNewTitle] = React.useState("");
  const [pendingSource, setPendingSource] = React.useState<SourceCreate | null>(null);

  const contentLength = content.length;

  const createStudySetAndSource = async (srcData: SourceCreate) => {
    try {
      const studySet = await client.createStudySet({
        subject: newSubject || "Chung",
        title: newTitle,
        description: "",
      });
      onStudySetCreated?.(studySet);
      const source = await client.createSource(studySet.id, srcData);
      onSourceCreated?.(source);
      toast({
        title: "Đã tạo bộ học & nguồn",
        description: `Bộ học "${studySet.title}" và nguồn "${source.title}" đã được tạo.`,
        variant: "success",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast({
        title: "Tạo nguồn thất bại",
        description: message ?? "Có lỗi xảy ra.",
        variant: "error",
      });
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng điền tên tài liệu và nội dung.",
        variant: "warning",
      });
      return;
    }
    if (contentLength > 50000) {
      toast({
        title: "Nội dung quá dài",
        description: "Tối đa 50.000 ký tự.",
        variant: "warning",
      });
      return;
    }
    setSaving(true);
    const srcData: SourceCreate = { title: title.trim(), content: content.trim() };

    try {
      if (!studySetId) {
        setPendingSource(srcData);
        setNewTitle(title.trim());
        setDialogOpen(true);
        return;
      }
      const source = await client.createSource(studySetId, srcData);
      onSourceCreated?.(source);
      setTitle("");
      setContent("");
      toast({
        title: "Đã lưu nguồn",
        description: `Nguồn "${source.title}" đã được lưu.`,
        variant: "success",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast({
        title: "Lưu nguồn thất bại",
        description: message ?? "Có lỗi xảy ra.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmCreate = async () => {
    if (!newTitle.trim()) return;
    setSaving(true);
    if (pendingSource) {
      await createStudySetAndSource(pendingSource);
    }
    setPendingSource(null);
    setDialogOpen(false);
    setNewSubject("Chung");
    setNewTitle("");
    setTitle("");
    setContent("");
    setSaving(false);
  };

  return (
    <>
      <Card className="p-3 mt-3">
        <div className="flex items-center justify-between mb-3">
          <h5 className="text-sm font-semibold">Dán nội dung nguồn tài liệu</h5>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <FileWarning className="w-3 h-3" />
            Tải tệp lên chưa hỗ trợ ở bản MVP
          </span>
        </div>
        <div className="space-y-3">
          <Input
            placeholder="Tên tài liệu, e.g. Giải tích lớp 11 trang 45"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <Textarea
            rows={4}
            placeholder="Dán toàn bộ nội dung… (tối đa 50.000 ký tự)"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {contentLength}/50000
            </span>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <BookOpenCheck className="w-4 h-4" />
              {saving ? "Đang lưu…" : "Lưu nguồn"}
            </Button>
          </div>
        </div>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo bộ học trước?</DialogTitle>
            <DialogDescription>
              Bạn chưa chọn bộ học nào. Một bộ học mới sẽ được tạo để chứa nguồn
              tài liệu này.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Môn học</label>
              <Input
                placeholder="e.g. Toán học"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                Tên bộ học <span className="text-error">*</span>
              </label>
              <Input
                placeholder="e.g. Giải tích lớp 11"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setDialogOpen(false);
                setSaving(false);
              }}
            >
              Hủy
            </Button>
            <Button
              onClick={handleConfirmCreate}
              disabled={!newTitle.trim() || saving}
            >
              Tạo & Lưu nguồn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
