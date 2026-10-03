"use client";

import { useState } from "react";
import {
  BookOpen,
  Pencil,
  MoreHorizontal,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import MarkdownRenderer from "@/components/markdown/MarkdownRenderer";
import type { Concept } from "@/contracts/dto";

const statusConfig: Record<
  Concept["status"],
  { label: string; variant: "pending" | "default" | "destructive"; Icon: typeof Clock }
> = {
  pending: { label: "Chờ duyệt", variant: "pending", Icon: Clock },
  approved: { label: "Đã duyệt", variant: "default", Icon: CheckCircle2 },
  rejected: { label: "Bị loại", variant: "destructive", Icon: XCircle },
};

interface ConceptCardProps {
  concept: Concept;
  onEdit?: (c: Concept) => void;
  onApprove?: (c: Concept) => void;
  onReject?: (c: Concept) => void;
  onDelete?: (c: Concept) => void;
  onCardClick?: (c: Concept) => void;
}

export default function ConceptCard({
  concept,
  onEdit,
  onApprove,
  onReject,
  onDelete,
  onCardClick,
}: ConceptCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const cfg = statusConfig[concept.status];
  const StatusIcon = cfg.Icon;

  const showOwnerActions = concept.status === "pending" && (onApprove || onReject);

  return (
    <>
      <div
        role={onCardClick ? "button" : undefined}
        tabIndex={onCardClick ? 0 : undefined}
        onClick={() => onCardClick?.(concept)}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onCardClick?.(concept);
          }
        }}
        className="h-full outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
      >
        <Card className="flex flex-col p-4 gap-3 hover:shadow-lg transition-shadow h-full">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-foreground line-clamp-2 flex-1">
            {concept.title}
          </h3>
          <Badge variant={cfg.variant} size="sm" className="gap-1 shrink-0">
            <StatusIcon className="h-3 w-3" />
            {cfg.label}
          </Badge>
        </div>

        <div className="text-sm text-foreground line-clamp-3">
          <MarkdownRenderer>{concept.body}</MarkdownRenderer>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5" />
              {concept.sourceRefs.length}
            </span>
            <span>rev {concept.revision}</span>
          </div>
        </div>

        <div
          className="flex items-center gap-2 pt-2 border-t border-border/60 flex-wrap"
          onClick={(e) => e.stopPropagation()}
        >
          {showOwnerActions && onApprove && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => onApprove(concept)}
              className="gap-1"
            >
              <CheckCircle2 className="h-4 w-4" />
              Duyệt
            </Button>
          )}
          {showOwnerActions && onReject && (
            <Button
              size="sm"
              variant="danger"
              onClick={() => onReject(concept)}
              className="gap-1"
            >
              <XCircle className="h-4 w-4" />
              Loại
            </Button>
          )}
          {onEdit && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onEdit(concept)}
              className="gap-1"
            >
              <Pencil className="h-4 w-4" />
              Sửa
            </Button>
          )}
          {onDelete && (
            <div className="ml-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="gap-2 text-error cursor-pointer"
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Xóa khái niệm
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </Card>
      </div>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-error" />
              Xác nhận xóa
            </DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn xóa khái niệm <b>{concept.title}</b>? Hành động
              này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setConfirmDelete(false)}
            >
              Hủy
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setConfirmDelete(false);
                onDelete?.(concept);
              }}
            >
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
