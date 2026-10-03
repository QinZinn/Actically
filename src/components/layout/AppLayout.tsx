'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import {
  Drawer,
  DrawerContent,
} from '@/components/ui/drawer';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ContextPanel from './ContextPanel';

interface AppLayoutProps {
  children: ReactNode;
  contextPanel?: ReactNode;
  contextPanelOpen?: boolean;
  onContextPanelClose?: () => void;
  demoMode?: boolean;
}

export default function AppLayout({
  children,
  contextPanel,
  contextPanelOpen: contextPanelOpenProp,
  onContextPanelClose,
  demoMode,
}: AppLayoutProps) {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [contextPanelOpenInternal, setContextPanelOpenInternal] = useState(false);

  const isDemoMode =
    demoMode ?? process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
  const isContextPanelOpen = contextPanelOpenProp ?? contextPanelOpenInternal;
  const hasContextPanel = !!contextPanel;

  const handleContextPanelClose = () => {
    if (onContextPanelClose) {
      onContextPanelClose();
    } else {
      setContextPanelOpenInternal(false);
    }
  };

  const handleNewSession = () => {
    router.push('/sessions/new');
    setMobileDrawerOpen(false);
  };

  const sidebar = (
    <Sidebar
      collapsed={sidebarCollapsed}
      onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
      onNewSession={handleNewSession}
    />
  );

  return (
    <div className="flex w-full min-h-screen bg-background">
      <div className="hidden md:flex">
        {sidebar}
      </div>

      <Drawer open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
        <DrawerContent side="left" className="md:hidden !p-0 h-[85vh] max-w-[300px] !rounded-tr-none !rounded-br-none bg-sidebar border-r border-sidebar-border !shadow-none">
          <div className="h-full overflow-hidden">
            <Sidebar
              collapsed={false}
              onToggleCollapsed={() => setMobileDrawerOpen(false)}
              onNewSession={handleNewSession}
            />
          </div>
        </DrawerContent>
      </Drawer>

      <div className="flex-1 min-w-0 flex flex-col">
        {isDemoMode && (
          <div className="sticky top-0 z-20 flex items-center justify-center h-8 bg-background/95 border-b border-border shrink-0 backdrop-blur">
            <Badge variant="outline" className="text-[11px] px-2.5 h-5 font-medium text-muted-foreground border-border bg-transparent">
              CHẾ ĐỘ MẪU — Dữ liệu được tạo để xem giao diện, không lưu
            </Badge>
          </div>
        )}

        <Topbar
          onOpenGlobalSearch={() => {}}
          onOpenSidebar={() => setMobileDrawerOpen(true)}
        />

        <div className="flex-1 flex min-w-0 overflow-hidden">
          <main className="flex-1 overflow-y-auto p-8 min-w-0">
            {children}
          </main>

          {hasContextPanel && (
            <ContextPanel
              open={isContextPanelOpen}
              onClose={handleContextPanelClose}
            >
              {contextPanel}
            </ContextPanel>
          )}
        </div>
      </div>
    </div>
  );
}
