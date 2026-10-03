"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import type { Concept } from "@/contracts/dto";

interface ApprovalButtonsProps {
  concept: Concept;
  onApproved?: (c: Concept) => void;
  onRejected?: (c: Concept) => void;
  inline?: boolean;
}

export default function ApprovalButtons({
  concept,
  onApproved,
  onRejected,
  inline = false,
}: ApprovalButtonsProps) {
  const client = getClient();
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);
  const [loading, setLoading] = useState(false);

  if (concept.status !== "pending") return null;

  const doApprove = async () => {
    setLoading(true);
    try {
      const saved = await client.updateConcept(concept.id, {
        status: "approved",
        expectedRevision: concept.revision,
      });
      toast({
        variant: "success",
        title: "Đã duyệt khái niệm",
        description: saved.title,
      });
      onApproved?.(saved);
    } catch (err) {
      toast({
        variant: "error",
        title: "Không duyệt được",
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
      setConfirmApprove(false);
    }
  };

  const doReject = async () => {
    setLoading(true);
    try {
      const saved = await client.updateConcept(concept.id, {
        status: "rejected",
        expectedRevision: concept.revision,
      });
      toast({
        variant: "warning",
        title: "Đã loại khái niệm",
        description: saved.title,
      });
      onRejected?.(saved);
    } catch (err) {
      toast({
        variant: "error",
        title: "Không loại được",
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
      setConfirmReject(false);
    }
  };

  return (
    <>
      <div
        className={
          inline
            ? "inline-flex items-center gap-2"
            : "flex items-center gap-2 w-full"
        }
      >
        <Button
          size={inline ? "sm" : "default"}
          variant="primary"
          onClick={() => setConfirmApprove(true)}
          className="gap-1"
          disabled={loading}
        >
          <CheckCircle2 className="h-4 w-4" />
          Duyệt
        </Button>
        <Button
          size={inline ? "sm" : "default"}
          variant="danger"
          onClick={() => setConfirmReject(true)}
          className="gap-1"
          disabled={loading}
        >
          <XCircle className="h-4 w-4" />
          Loại
        </Button>
      </div>

      <Dialog open={confirmApprove} onOpenChange={setConfirmApprove}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Duyệt khái niệm
            </DialogTitle>
            <DialogDescription>
              Xác nhận duyệt khái niệm <b>{concept.title}</b>? Khái niệm sẽ
              sẵn sàng cho luyện tập và tạo thẻ ôn.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setConfirmApprove(false)}
              disabled={loading}
            >
              Hủy
            </Button>
            <Button onClick={doApprove} disabled={loading}>
              Xác nhận duyệt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmReject} onOpenChange={setConfirmReject}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-error" />
              Loại khái niệm
            </DialogTitle>
            <DialogDescription>
              Xác nhận loại khái niệm <b>{concept.title}</b>? Khái niệm sẽ bị
              loại khỏi hàng đợi duyệt.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setConfirmReject(false)}
              disabled={loading}
            >
              Hủy
            </Button>
            <Button variant="danger" onClick={doReject} disabled={loading}>
              Xác nhận loại
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
