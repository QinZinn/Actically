'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { LearningSession, UserProfile } from '@/contracts/dto';
import { useActicallyClient } from '@/features/client-provider';
import { ActicallyClientError } from '@/lib/client/errors';
import { toast } from '@/components/ui/use-toast';
import { PanelRight, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ContextPanel from './ContextPanel';

interface AppLayoutProps {
  children: ReactNode;
  contextPanel?: ReactNode;
  contextPanelOpen?: boolean;
  onContextPanelClose?: () => void;
  demoMode?: boolean;
  conversation?: boolean;
}
export default function AppLayout({ children, contextPanel, contextPanelOpen: controlledPanel, onContextPanelClose, demoMode, conversation = false }: AppLayoutProps) {
  const router = useRouter(), pathname = usePathname(), client = useActicallyClient();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [recentSessions, setRecentSessions] = useState<LearningSession[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const isDemo = demoMode ?? process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [next, sessions] = await Promise.all([client.getProfile(), client.listSessions({ limit: 5 })]);
        if (active) { setProfile(next); setRecentSessions(sessions); setError(null); }
      } catch (e) {
        if (!active) return;
        if (e instanceof ActicallyClientError && e.code === 'UNAUTHENTICATED') router.replace('/login');
        setError(e instanceof Error ? e.message : 'Không tải được hồ sơ.');
      }
    }
    void load();
    window.addEventListener('actically:profile-changed', load);
    return () => { active = false; window.removeEventListener('actically:profile-changed', load); };
  }, [client, router, pathname, retry]);
  const toggleSidebar = useCallback(async () => {
    if (!profile) return;
    const previous = profile;
    setProfile({ ...profile, sidebarCollapsed: !profile.sidebarCollapsed });
    try { setProfile(await client.updateProfile({ sidebarCollapsed: !profile.sidebarCollapsed })); }
    catch (e) { setProfile(previous); toast({ variant: 'error', title: 'Chưa lưu được thanh bên', description: e instanceof Error ? e.message : 'Vui lòng thử lại.' }); }
  }, [client, profile]);
  const newSession = () => { router.push('/'); setMobileOpen(false); };
  const selectedSessionId = pathname.startsWith('/sessions/') ? pathname.split('/')[2] : undefined;
  const sidebarProps = { profile, recentSessions, selectedSessionId, onNewSession: newSession, onNav: (route: string) => { router.push(route); setMobileOpen(false); } };
  return (
    <div className="flex w-full h-dvh min-h-0 bg-background overflow-hidden">
      <a href="#workspace-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">Đến nội dung chính</a>
      <div className="hidden md:flex"><Sidebar {...sidebarProps} collapsed={profile?.sidebarCollapsed ?? false} onToggleCollapsed={() => void toggleSidebar()} /></div>
      <Drawer open={mobileOpen} onOpenChange={setMobileOpen}>
        <DrawerContent side="left" hideClose className="md:hidden !p-0 h-dvh w-[280px] max-w-[85vw] bg-sidebar">
          <DrawerTitle className="sr-only">Điều hướng Actically</DrawerTitle>
          <DrawerDescription className="sr-only">Chọn màn hình hoặc mở phiên học gần đây.</DrawerDescription>
          <Sidebar {...sidebarProps} collapsed={false} onToggleCollapsed={() => setMobileOpen(false)} mobile />
        </DrawerContent>
      </Drawer>
      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
        <Topbar profile={profile} onOpenSidebar={() => setMobileOpen(true)}>
          {contextPanel && <Button variant="secondary" size="sm" aria-expanded={controlledPanel ?? panelOpen} onClick={() => { if (controlledPanel) onContextPanelClose?.(); else setPanelOpen(v => !v); }}>
            <PanelRight className="size-4" /><span className="hidden sm:inline">Ngữ cảnh</span>
            <span className="sr-only sm:hidden">Ngữ cảnh phiên học</span>
          </Button>}
        </Topbar>
        {isDemo && <div className="flex min-h-8 shrink-0 items-center justify-center gap-2 border-b border-primary/15 bg-primary/5 px-4 py-1.5 text-center text-[11px] leading-4 text-muted-foreground"><FlaskConical className="size-3.5 text-primary" /><span><strong className="font-semibold text-primary">Chế độ mẫu</strong> · Dữ liệu minh họa, đặt lại khi tải trang</span></div>}
        <div className="flex-1 min-h-0 flex min-w-0 overflow-hidden">
          <main id="workspace-main" tabIndex={-1} className={conversation ? "flex flex-1 min-w-0 min-h-0 flex-col overflow-hidden" : "flex-1 min-w-0 overflow-y-auto overscroll-contain p-4 sm:p-6 lg:p-8"}>
            <div className={conversation ? "flex flex-1 min-h-0 min-w-0 flex-col" : "workspace-content space-y-6"}>
            {error && <ErrorState variant="compact" title="Kết nối chưa khả dụng" body={error} onRetry={() => setRetry(n => n + 1)} />}
            {children}
            </div>
          </main>
          {contextPanel && <ContextPanel open={controlledPanel ?? panelOpen} onClose={onContextPanelClose ?? (() => setPanelOpen(false))}>{contextPanel}</ContextPanel>}
        </div>
      </div>
    </div>
  );
}
