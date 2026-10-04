"use client";

import * as React from "react";
import { Inbox, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { ExtractionResult, LearningSession, StudyMode } from "@/contracts/dto";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/client/utils";

const MODE_LABEL: Record<StudyMode, string> = {
  socratic: "Socratic",
  solve: "Giải bài",
  ask: "Hỏi nhanh",
};

interface SessionHeaderProps {
  busy?: boolean;
  session: LearningSession;
  onRename: (title: string) => void;
  onDelete: () => void;
  onEndExtractConcepts: () => Promise<ExtractionResult | void> | void;
}

export default function SessionHeader({
  busy = false,
  session,
  onRename,
  onDelete,
  onEndExtractConcepts,
}: SessionHeaderProps) {
  const [editing, setEditing] = React.useState(false);
  const [editTitle, setEditTitle] = React.useState(session.title);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [ending, setEnding] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    queueMicrotask(() => {
      setEditTitle(session.title);
    });
  }, [session.title]);

  React.useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const startEdit = () => {
    setEditTitle(session.title);
    setEditing(true);
  };

  const commitEdit = () => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== session.title) {
      onRename(trimmed);
    } else {
      setEditTitle(session.title);
    }
    setEditing(false);
  };

  const handleEnd = async () => {
    setEnding(true);
    try {
      const result = await onEndExtractConcepts();
      if (result && "concepts" in result) {
        const { concepts, duplicateWarnings } = result;
        let description = `Đã trích xuất ${concepts.length} khái niệm, đang ở trạng thái Chờ duyệt.`;
        if (duplicateWarnings.length > 0) {
          description += ` Cảnh báo: ${duplicateWarnings.length} khái niệm trùng lặp có thể tồn tại.`;
        }
        toast({
          title: "Đã kết thúc phiên",
          description,
          variant: concepts.length > 0 ? "success" : "info",
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast({
        title: "Kết thúc phiên thất bại",
        description: message ?? "Có lỗi xảy ra.",
        variant: "error",
      });
    } finally {
      setEnding(false);
      setConfirmOpen(false);
    }
  };

  return (
    <>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border/70 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 flex-1 basis-[240px] items-center gap-2">
          {editing ? (
            <Input
              ref={inputRef}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitEdit();
                if (e.key === "Escape") {
                  setEditTitle(session.title);
                  setEditing(false);
                }
              }}
              className="h-9 text-lg font-semibold !border-input focus:!border-primary bg-transparent"
              style={{ border: "1px solid transparent", boxShadow: "none" }}
            />
          ) : (
            <h1
              className="text-base font-semibold truncate cursor-pointer hover:opacity-80"
              onDoubleClick={() => { if (!busy) startEdit(); }}
            >
              {session.title}
            </h1>
          )}
          {!editing && (
            <Button
              variant="ghost"
              size="xs"
              onClick={startEdit}
              className="h-6 w-6 p-0 rounded-md text-muted-foreground hover:text-foreground"
              aria-label="Đổi tên"
              disabled={busy}
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          )}
          <Badge
            variant="default"
            className={cn(
              "hidden shrink-0 gap-1 rounded-md px-2 py-1 font-medium sm:inline-flex"
            )}
          >
            {MODE_LABEL[session.mode]}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmOpen(true)}
            disabled={busy || ending || session.status === "ended"}
            className="gap-1"
          >
            <Inbox className="w-4 h-4" />
            Kết thúc phiên
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Tùy chọn"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled={busy} onClick={onDelete} className="gap-2 text-error">
                <Trash2 className="w-4 h-4" />
                Xóa phiên
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kết thúc phiên học</DialogTitle>
            <DialogDescription>
              Sau khi kết thúc, các khái niệm AI đề xuất sẽ ở trạng thái Chờ
              duyệt. Bạn muốn tiếp tục?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Không
            </Button>
            <Button onClick={handleEnd} disabled={ending || busy}>
              {ending ? "Đang xử lý…" : "Có, tiếp tục"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
