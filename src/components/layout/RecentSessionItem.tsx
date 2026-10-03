'use client';

import { useRouter } from 'next/navigation';
import type { LearningSession, StudyMode } from '@/contracts/dto';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/client/utils';

interface RecentSessionItemProps {
  session: LearningSession;
  selected?: boolean;
  onClick?: () => void;
}

const MODE_LABELS: Record<StudyMode, string> = {
  socratic: 'Socratic',
  solve: 'Giải bài',
  ask: 'Hỏi nhanh',
};

function formatRelativeTime(date: string, locale = 'vi'): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (diffSec < 60) return rtf.format(-diffSec, 'second');
  if (diffMin < 60) return rtf.format(-diffMin, 'minute');
  if (diffHour < 24) return rtf.format(-diffHour, 'hour');
  if (diffDay < 7) return rtf.format(-diffDay, 'day');
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

export default function RecentSessionItem({
  session,
  selected = false,
  onClick,
}: RecentSessionItemProps) {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      router.push(`/sessions/${session.id}`);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'w-full flex items-center gap-2 py-2 px-2 rounded-md text-sm transition-colors text-left',
        selected
          ? 'bg-popover'
          : 'hover:bg-popover/60'
      )}
    >
      <Badge variant="secondary" className="shrink-0 text-[10px] px-1.5 py-0 h-5">
        {MODE_LABELS[session.mode]}
      </Badge>
      <div className="flex-1 min-w-0">
        <p className="truncate text-foreground font-medium">{session.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {formatRelativeTime(session.updatedAt)}
        </p>
      </div>
    </button>
  );
}
