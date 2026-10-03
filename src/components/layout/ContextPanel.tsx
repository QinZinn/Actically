"use client";
import { useSyncExternalStore, type ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";
export default function ContextPanel({ open, onClose, children }: { open: boolean; onClose: () => void; children?: ReactNode; defaultTab?: string }) {
  const narrow = useSyncExternalStore(
    callback => { const media = window.matchMedia("(max-width: 1023px)"); media.addEventListener("change", callback); return () => media.removeEventListener("change", callback); },
    () => window.matchMedia("(max-width: 1023px)").matches, () => false);
  if (!open) return null;
  return <>
    <aside className="hidden lg:flex w-[360px] h-full min-h-0 flex-col border-l border-border bg-sidebar shrink-0">
      <div className="p-4 border-b border-border flex justify-between items-center">
        <h2 className="font-semibold">Ngữ cảnh phiên học</h2>
        <button aria-label="Đóng ngữ cảnh" onClick={onClose} className="p-2 rounded focus-visible:ring-2"><X className="w-4 h-4" /></button>
      </div>
      <div className="p-4 overflow-y-auto min-h-0">{children}</div>
    </aside>
    <div className="lg:hidden">
      <Dialog open={open && narrow} onOpenChange={v => { if (!v) onClose(); }}>
        <DialogContent className="max-w-[calc(100vw-2rem)] max-h-[85dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Ngữ cảnh phiên học</DialogTitle></DialogHeader>
          {children}
        </DialogContent>
      </Dialog>
    </div>
  </>;
}
