'use client';

import type { ReactNode } from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { XCircle } from 'lucide-react';
import { cn } from '@/lib/client/utils';

interface ContextPanelProps {
  open: boolean;
  onClose: () => void;
  defaultTab?: 'concepts' | 'sources' | 'notes';
  children?: ReactNode;
}

export default function ContextPanel({
  open,
  onClose,
  defaultTab = 'concepts',
  children,
}: ContextPanelProps) {
  return (
    <aside
      className={cn(
        'h-screen flex flex-col border-l border-border bg-sidebar/40 shrink-0 transition-[width,transform] duration-200 overflow-hidden',
        open ? 'w-[360px] translate-x-0' : 'w-0 translate-x-full'
      )}
      aria-hidden={!open}
    >
      <Tabs defaultValue={defaultTab} className="w-full flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between h-14 px-4 border-b border-border shrink-0">
          <TabsList className="grid w-full grid-cols-3 h-9">
            <TabsTrigger value="concepts" className="text-xs h-8">
              Khái niệm
            </TabsTrigger>
            <TabsTrigger value="sources" className="text-xs h-8">
              Nguồn
            </TabsTrigger>
            <TabsTrigger value="notes" className="text-xs h-8">
              Ghi chú
            </TabsTrigger>
          </TabsList>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 ml-2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-popover transition-colors"
            aria-label="Đóng"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {children ?? (
            <>
              <TabsContent value="concepts" className="mt-0">
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Chưa có khái niệm nào được trích xuất.
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="sources" className="mt-0">
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Chưa có nguồn nào được liên kết.
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="notes" className="mt-0">
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Chưa có ghi chú nào.
                  </p>
                </div>
              </TabsContent>
            </>
          )}
        </div>
      </Tabs>
    </aside>
  );
}
