"use client";
import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import type { Concept, StudySet } from "@/contracts/dto";
import { cn } from "@/lib/client/utils";
interface Props {
  selectedIds: string[]; onToggle: (id: string) => void; disabled?: boolean; hideBody?: boolean;
  studySetIdFilter?: string | null; onStudySetChange?: (id: string | null) => void;
  concepts?: Concept[]; studySets?: StudySet[];
}
export default function ConceptPicker({ selectedIds, onToggle, disabled, hideBody,
  studySetIdFilter, onStudySetChange, concepts = [], studySets = [] }: Props) {
  const list = concepts.filter(c => c.studySetId === studySetIdFilter && c.status === "approved");
  return <div className="space-y-3">
    <label className="text-sm" htmlFor="practice-set">Bộ học</label>
    <Select id="practice-set" value={studySetIdFilter ?? ""} disabled={disabled} onChange={e => onStudySetChange?.(e.target.value || null)}>
      <option value="">Chọn một bộ học</option>
      {studySets.map(s => <option key={s.id} value={s.id}>{s.subject} · {s.title}</option>)}
    </Select>
    <div className="grid gap-2 max-h-80 overflow-y-auto">
      {list.map(c => <button type="button" key={c.id} aria-pressed={selectedIds.includes(c.id)}
        disabled={disabled || (!selectedIds.includes(c.id) && selectedIds.length >= 30)}
        onClick={() => onToggle(c.id)} className={cn("rounded-lg border-2 p-3 text-left focus-visible:ring-2 focus-visible:ring-primary",
          selectedIds.includes(c.id) ? "border-primary bg-primary/5" : "border-border")}>
        <div className="flex justify-between gap-2 font-semibold text-sm">{c.title}{selectedIds.includes(c.id) && <CheckCircle2 className="w-4 h-4 shrink-0" />}</div>
        {!hideBody && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{c.body}</p>}
        <Badge variant="secondary" size="sm" className="mt-2">Đã duyệt · r{c.revision}</Badge>
      </button>)}
      {!list.length && <p className="text-sm text-muted-foreground">{studySetIdFilter ? "Bộ học chưa có khái niệm đã duyệt." : "Chọn bộ học trước khi chọn khái niệm."}</p>}
    </div>
    <p className="text-xs text-muted-foreground">Đã chọn {selectedIds.length} · tối đa 30</p>
  </div>;
}
