import type { ReactNode } from "react";

export default function PageHeader({ title, description, eyebrow, actions }: {
  title: string; description: string; eyebrow?: string; actions?: ReactNode;
}) {
  return <div className="page-header flex gap-5 border-b border-border/70 pb-6">
    <div className="min-w-0 space-y-2">
      {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">{eyebrow}</p>}
      <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[28px] sm:leading-tight">{title}</h1>
      <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
    {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
  </div>;
}
