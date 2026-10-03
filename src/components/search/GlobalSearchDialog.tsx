'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, MessagesSquare, BookOpen } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import type { ActicallyClient } from '@/contracts/client';
import type {
  LearningSession,
  Concept,
  StudyMode,
} from '@/contracts/dto';
import { cn } from '@/lib/client/utils';

const MODE_LABELS: Record<StudyMode, string> = {
  socratic: 'Socratic',
  solve: 'Giải bài',
  ask: 'Hỏi nhanh',
};

interface GlobalSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect?: (item: { type: 'session' | 'concept'; id: string; url: string }) => void;
  client?: ActicallyClient;
}

interface SearchSections {
  sessions: LearningSession[];
  concepts: Concept[];
}

export default function GlobalSearchDialog({
  open,
  onOpenChange,
  onSelect,
  client,
}: GlobalSearchDialogProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchSections>({
    sessions: [],
    concepts: [],
  });

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 200);
    return () => clearTimeout(timer);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    async function fetchResults() {
    const q = debouncedQuery.trim();
    if (!q) {
      setResults({ sessions: [], concepts: [] });
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      if (client?.search) {
        const data = await client.search(q);
        if (active) setResults({
          sessions: data.sessions ?? [],
          concepts: data.concepts ?? [],
        });
      } else {
        setResults({ sessions: [], concepts: [] });
      }
    } catch (e) {
      if (active) { setError(e instanceof Error ? e.message : "Không tìm kiếm được"); setResults({ sessions: [], concepts: [] }); }
    } finally {
      if (active) setLoading(false);
    }
    }
    queueMicrotask(() => { if (active) { setError(null); void fetchResults(); } });
    return () => { active = false; };
  }, [debouncedQuery, client, open]);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setQuery('');
      setDebouncedQuery('');
      setResults({ sessions: [], concepts: [] });
    });
  }, [open]);

  const handleSelectSession = (session: LearningSession) => {
    const url = `/sessions/${session.id}`;
    if (onSelect) {
      onSelect({ type: 'session', id: session.id, url });
    }
    onOpenChange(false);
    router.push(url);
  };

  const handleSelectConcept = (concept: Concept) => {
    const url = `/knowledge?id=${encodeURIComponent(concept.id)}`;
    if (onSelect) {
      onSelect({ type: 'concept', id: concept.id, url });
    }
    onOpenChange(false);
    router.push(url);
  };

  const hasResults = results.sessions.length > 0 || results.concepts.length > 0;
  const searched = debouncedQuery.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-base font-semibold text-foreground">
            Tìm kiếm
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              autoFocus
              aria-label="Tìm kiếm phiên học và khái niệm"
              maxLength={200}
              placeholder="Tìm phiên học, khái niệm..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 h-10 text-sm"
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
            )}
          </div>
        </div>

        <Separator />

        <div className="flex-1 overflow-y-auto py-2 max-h-[50vh]">
          {!searched && !hasResults && (
            <div className="py-10 px-5 text-center">
              <p className="text-sm text-muted-foreground">
                Gõ từ khóa để tìm phiên học và khái niệm
              </p>
            </div>
          )}

          {error && <p role="alert" className="p-5 text-error">{error}</p>}
          {searched && !loading && !hasResults && !error && (
            <div className="py-10 px-5 text-center">
              <p className="text-sm text-muted-foreground">
                Không tìm thấy kết quả cho &quot;{debouncedQuery}&quot;
              </p>
            </div>
          )}

          {results.sessions.length > 0 && (
            <div className="mb-2">
              <div className="px-5 py-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Phiên học
                </p>
              </div>
              <div>
                {results.sessions.map((session) => (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => handleSelectSession(session)}
                    className={cn(
                      'w-full flex items-center gap-3 px-5 py-2.5 text-left hover:bg-popover/60 transition-colors'
                    )}
                  >
                    <div className="w-8 h-8 rounded-md bg-popover flex items-center justify-center shrink-0">
                      <MessagesSquare className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {session.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {MODE_LABELS[session.mode]}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {results.concepts.length > 0 && (
            <div>
              <div className="px-5 py-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Khái niệm
                </p>
              </div>
              <div>
                {results.concepts.map((concept) => (
                  <button
                    key={concept.id}
                    type="button"
                    onClick={() => handleSelectConcept(concept)}
                    className={cn(
                      'w-full flex items-center gap-3 px-5 py-2.5 text-left hover:bg-popover/60 transition-colors'
                    )}
                  >
                    <div className="w-8 h-8 rounded-md bg-popover flex items-center justify-center shrink-0">
                      <BookOpen className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {concept.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {concept.body.slice(0, 80)}
                        {concept.body.length > 80 && '...'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
