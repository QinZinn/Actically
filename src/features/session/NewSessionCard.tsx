"use client";

import * as React from "react";
import Link from "next/link";
import { BrainCircuit, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import type { LearningSession, StudyMode, StudySet } from "@/contracts/dto";
import type { SessionCreate } from "@/contracts/requests";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { useActicallyClient } from "@/features/client-provider";
import { toast } from "@/components/ui/use-toast";
import ModeSelector from "./ModeSelector";
import SourceInputPaste from "./SourceInputPaste";

interface NewSessionCardProps {
  recent?: LearningSession[];
}

export default function NewSessionCard({ recent = [] }: NewSessionCardProps) {
  const router = useRouter();
  const client = useActicallyClient();
  const [mode, setMode] = React.useState<StudyMode>("socratic");
  const [studySetId, setStudySetId] = React.useState<string | null>(null);
  const [studySets, setStudySets] = React.useState<StudySet[]>([]);
  const [sourceOpen, setSourceOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const list = await client.listStudySets();
        if (mounted) setStudySets(list);
      } catch {
        /* ignore */
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [client]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const title =
        mode === "solve"
          ? "Giải bài mới"
          : mode === "ask"
          ? "Hỏi nhanh"
          : "Phiên học mới";
      const input: SessionCreate = {
        title,
        mode,
        studySetId,
      };
      const session = await client.createSession(input);
      toast({
        title: "Đã tạo phiên",
        description: session.title,
        variant: "success",
      });
      router.push(`/sessions/${session.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast({
        title: "Tạo phiên thất bại",
        description: message ?? "Có lỗi xảy ra.",
        variant: "error",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardContent className="p-6 pt-6">
          <div className="flex items-center gap-2 mb-5">
            <Badge variant="default" className="text-sm gap-1 h-7 px-2.5">
              <BrainCircuit className="w-4 h-4" />
              Bắt đầu phiên học mới
            </Badge>
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <ModeSelector value={mode} onChange={setMode} />
              <Select
                value={studySetId ?? ""}
                onChange={(e) => setStudySetId(e.target.value || null)}
                className="w-auto min-w-[240px]"
              >
                <option value="">— Không chọn bộ —</option>
                {studySets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.subject} — {s.title}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex items-center justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSourceOpen((v) => !v)}
                className="gap-1"
              >
                Nguồn (dán)
                {sourceOpen ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </div>

            {sourceOpen && (
              <SourceInputPaste
                studySetId={studySetId}
                studySets={studySets}
                onStudySetCreated={(ss) => { setStudySets(prev => [...prev, ss]); setStudySetId(ss.id); }}
              />
            )}

            <div className="flex justify-end pt-2">
              <Button onClick={handleCreate} disabled={creating} className="gap-1">
                <Plus className="w-4 h-4" />
                {creating ? "Đang tạo…" : "Tạo phiên mới"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      {recent.length > 0 && <section className="mt-6 space-y-2"><h2 className="font-semibold">Phiên học gần đây</h2>{recent.map(s => <Link key={s.id} href={`/sessions/${s.id}`} className="block rounded-lg border border-border p-3 text-sm hover:bg-popover">{s.title}</Link>)}</section>}
    </div>
  );
}
