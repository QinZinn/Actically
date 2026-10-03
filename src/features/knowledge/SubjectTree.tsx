"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, BookOpen, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Concept, Source, StudySet } from "@/contracts/dto";
import { cn } from "@/lib/client/utils";

interface SubjectTreeProps {
  studySets: StudySet[];
  concepts: Concept[];
  sources: Source[];
  studySetId: string | null;
  onSelect: (id: string | null) => void;
}

export default function SubjectTree({
  studySets,
  concepts,
  sources,
  studySetId,
  onSelect,
}: SubjectTreeProps) {
  const grouped = useMemo(() => {
    const bySubject = new Map<string, StudySet[]>();
    for (const s of studySets) {
      const list = bySubject.get(s.subject) ?? [];
      list.push(s);
      bySubject.set(s.subject, list);
    }
    return Array.from(bySubject.entries());
  }, [studySets]);

  const [openSubjects, setOpenSubjects] = useState<Set<string>>(
    () => new Set(grouped.slice(0, 2).map(([k]) => k))
  );

  const countsFor = (ssId: string) => {
    const cs = concepts.filter((c) => c.studySetId === ssId);
    const approved = cs.filter((c) => c.status === "approved").length;
    const pending = cs.filter((c) => c.status === "pending").length;
    const srcCount = sources.filter((s) => s.studySetId === ssId).length;
    return { approved, pending, srcCount };
  };

  const toggle = (subject: string) => {
    setOpenSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(subject)) next.delete(subject);
      else next.add(subject);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={cn(
          "w-full text-left px-3 py-2 rounded-md flex items-center justify-between text-sm",
          studySetId === null
            ? "bg-primary/10 text-primary"
            : "hover:bg-popover text-foreground"
        )}
      >
        <span className="font-medium">Tất cả</span>
        <Badge variant="secondary" size="sm">
          {concepts.length}
        </Badge>
      </button>

      <div className="h-2" />

      {grouped.length === 0 && (
        <div className="text-sm text-muted-foreground p-3 text-center border border-dashed border-border rounded-lg">
          Chưa có bộ học nào.
        </div>
      )}

      {grouped.map(([subject, sets]) => {
        const open = openSubjects.has(subject);
        return (
          <div key={subject} className="flex flex-col">
            <button
              type="button"
              onClick={() => toggle(subject)}
              className="w-full text-left px-3 py-2 rounded-md flex items-center gap-2 text-sm hover:bg-popover"
            >
              {open ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <span className="font-semibold text-foreground truncate">
                {subject}
              </span>
              <Badge variant="nodata" size="sm" className="ml-auto">
                {sets.length}
              </Badge>
            </button>
            {open && (
              <div className="flex flex-col ml-3 border-l border-border/70 pl-2 mt-0.5">
                {sets.map((ss) => {
                  const c = countsFor(ss.id);
                  const active = studySetId === ss.id;
                  return (
                    <button
                      key={ss.id}
                      type="button"
                      onClick={() => onSelect(ss.id)}
                      className={cn(
                        "w-full text-left px-2.5 py-2 rounded-md flex flex-col gap-1 text-sm my-0.5",
                        active
                          ? "bg-primary/10 border border-primary/30"
                          : "hover:bg-popover border border-transparent"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate font-medium">{ss.title}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 items-center">
                        <Badge variant="default" size="sm">
                          ✔ {c.approved}
                        </Badge>
                        <Badge variant="pending" size="sm">
                          ⏳ {c.pending}
                        </Badge>
                        <Badge variant="secondary" size="sm" className="gap-1">
                          <BookOpen className="h-3 w-3" />
                          {c.srcCount}
                        </Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
