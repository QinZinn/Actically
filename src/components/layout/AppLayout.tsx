'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { LearningSession, UserProfile } from '@/contracts/dto';
import { useActicallyClient } from '@/features/client-provider';
import { ActicallyClientError } from '@/lib/client/errors';
import { toast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { ErrorState } from '@/components/ui/error-state';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
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
export default function AppLayout({ children, contextPanel, contextPanelOpen: controlledPanel, onContextPanelClose, demoMode }: AppLayoutProps) {
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
      <div className="hidden md:flex"><Sidebar {...sidebarProps} collapsed={profile?.sidebarCollapsed ?? false} onToggleCollapsed={() => void toggleSidebar()} /></div>
      <Drawer open={mobileOpen} onOpenChange={setMobileOpen}>
        <DrawerContent side="left" className="md:hidden !p-0 h-dvh max-w-[300px] bg-sidebar"><Sidebar {...sidebarProps} collapsed={false} onToggleCollapsed={() => setMobileOpen(false)} /></DrawerContent>
      </Drawer>
      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
        {isDemo && <div className="flex justify-center h-8 shrink-0 items-center border-b border-border"><Badge variant="outline">CHẾ ĐỘ MẪU — Dữ liệu mô phỏng, lưu trong bộ nhớ</Badge></div>}
        <Topbar profile={profile} onOpenSidebar={() => setMobileOpen(true)} />
        <div className="flex-1 min-h-0 flex min-w-0 overflow-hidden">
          <main className="flex-1 overflow-y-auto p-4 md:p-8 min-w-0">
            {error && <ErrorState variant="compact" title="Kết nối chưa khả dụng" body={error} onRetry={() => setRetry(n => n + 1)} />}
            {contextPanel && <button type="button" onClick={() => setPanelOpen(v => !v)} className="mb-2 text-sm text-primary underline focus-visible:ring-2 focus-visible:ring-primary">{(controlledPanel ?? panelOpen) ? 'Ẩn ngữ cảnh' : 'Xem ngữ cảnh'}</button>}
            {children}
          </main>
          {contextPanel && <ContextPanel open={controlledPanel ?? panelOpen} onClose={onContextPanelClose ?? (() => setPanelOpen(false))}>{contextPanel}</ContextPanel>}
        </div>
      </div>
    </div>
  );
}
