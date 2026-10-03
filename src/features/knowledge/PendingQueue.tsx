"use client";

import { useMemo } from "react";
import type { Concept } from "@/contracts/dto";
import ConceptCard from "./ConceptCard";

interface PendingQueueProps {
  concepts: Concept[];
  onEdit?: (c: Concept) => void;
  onApprove?: (c: Concept) => void;
  onReject?: (c: Concept) => void;
  onDelete?: (c: Concept) => void;
  studySetId?: string | null;
}

export default function PendingQueue({
  concepts,
  onEdit,
  onApprove,
  onReject,
  onDelete,
  studySetId,
}: PendingQueueProps) {
  const filtered = useMemo(() => {
    let list = concepts.filter((c) => c.status === "pending");
    if (studySetId) list = list.filter((c) => c.studySetId === studySetId);
    return list.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [concepts, studySetId]);

  if (filtered.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-12 text-center border border-dashed border-border rounded-lg">
        Không còn khái niệm chờ duyệt. Tốt lắm! 🎉
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {filtered.map((c) => (
        <ConceptCard
          key={c.id}
          concept={c}
          onEdit={onEdit}
          onApprove={onApprove}
          onReject={onReject}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
