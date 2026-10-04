export default function ActicallyMark({ className }: { className?: string }) {
  return <svg viewBox="0 0 28 28" fill="none" className={className} aria-hidden="true">
    <circle cx="12" cy="14" r="9" stroke="currentColor" strokeWidth="3.5" />
    <path d="M24 5v18" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
  </svg>;
}
