"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getClient } from "@/lib/client";
import type { Concept } from "@/contracts/dto";
import { cn } from "@/lib/client/utils";

interface ConceptPickerProps {
  selectedIds: string[];
  onToggle: (id: string) => void;
  disabled?: boolean;
}

export default function ConceptPicker({
  selectedIds,
  onToggle,
  disabled,
}: ConceptPickerProps) {
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await getClient().listConcepts({ status: "approved" });
        if (!cancelled) setConcepts(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const total = concepts.length;
  const selectedCount = selectedIds.length;

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-y-auto max-h-80 w-full rounded-lg border border-border p-3 bg-card">
        <div className="grid sm:grid-cols-2 gap-3">
          {loading && concepts.length === 0 && (
            <div className="col-span-2 text-sm text-muted-foreground py-6 text-center">
              Đang tải danh sách khái niệm…
            </div>
          )}
          {!loading && concepts.length === 0 && (
            <div className="col-span-2 text-sm text-muted-foreground py-6 text-center">
              Chưa có khái niệm nào được duyệt.
            </div>
          )}
          {concepts.map((c) => {
            const selected = selectedIds.includes(c.id);
            return (
              <Card
                key={c.id}
                onClick={() => !disabled && onToggle(c.id)}
                className={cn(
                  "cursor-pointer p-3 transition-all border-2",
                  selected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50",
                  disabled && "opacity-60 cursor-not-allowed"
                )}
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-foreground line-clamp-1 text-sm">
                      {c.title}
                    </div>
                    {selected && (
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground line-clamp-2">
                    {c.body}
                  </div>
                  <Badge variant="secondary" size="sm">
                    Khái niệm đã duyệt
                  </Badge>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
      <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
        <span>Đã chọn: {selectedCount} / {total}</span>
      </div>
    </div>
  );
}
