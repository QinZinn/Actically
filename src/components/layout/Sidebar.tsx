'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  Settings,
  Plus,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from 'lucide-react';
import type { LearningSession, UserProfile } from '@/contracts/dto';
import { signOut } from '@/lib/client/auth';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import SidebarNavItem from './SidebarNavItem';
import RecentSessionItem from './RecentSessionItem';
import { cn } from '@/lib/client/utils';
import { workspaceNavigation } from './navigation';
import ActicallyMark from './ActicallyMark';

interface SidebarProps {
  profile?: UserProfile | null;
  recentSessions?: LearningSession[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
  selectedSessionId?: string;
  onNewSession?: () => void;
  onNav?: (route: string) => void;
  mobile?: boolean;
}

function getInitials(name: string): string {
  const cleaned = (name ?? '').trim();
  if (!cleaned) return 'U';
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Sidebar({
  collapsed,
  onToggleCollapsed,
  selectedSessionId,
  onNewSession,
  onNav,
  profile,
  recentSessions = [],
  mobile = false,
}: SidebarProps) {
  const router = useRouter();

  const handleNavClick = (route: string) => {
    if (onNav) {
      onNav(route);
    }
  };

  const handleNewSessionClick = () => {
    if (onNewSession) {
      onNewSession();
    } else {
      router.push('/');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.replace('/login');
      router.refresh();
    } catch (error) {
      toast({ variant: 'error', title: 'Đăng xuất thất bại', description: error instanceof Error ? error.message : 'Vui lòng thử lại.' });
    }
  };

  const displayName = profile?.displayName ?? 'Người dùng';
  const email = profile?.email ?? '(chưa đăng nhập)';
  const initials = getInitials(profile?.displayName ?? 'U');

  return (
    <aside
      className={cn(
        'flex h-full min-h-0 flex-col border-r border-sidebar-border bg-sidebar overflow-hidden transition-[width] duration-200 shrink-0',
        mobile ? 'w-full' : collapsed ? 'w-[64px]' : 'w-[240px]'
      )}
    >
      <div className={cn(
        'h-16 flex items-center shrink-0 gap-2',
        collapsed ? 'justify-center px-0' : 'justify-between px-4'
      )}>
        <Link
          href="/"
          aria-label="Actically — Trang chủ"
          className="flex min-w-0 items-center gap-2.5 rounded-md text-foreground"
          onClick={() => handleNavClick('/')}
        >
          <div className="size-8 flex items-center justify-center shrink-0">
            <ActicallyMark className="size-8 rounded-lg" />
          </div>
          {!collapsed && (
            <span
              className="font-bold text-lg text-foreground"
              style={{ letterSpacing: '-0.5px' }}
            >
              Actically
            </span>
          )}
        </Link>
        {!collapsed && <button
          type="button"
          onClick={onToggleCollapsed}
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-popover hover:text-foreground"
          aria-label={mobile ? 'Đóng menu' : 'Thu gọn sidebar'}
          aria-expanded={!collapsed}
        >
          {mobile ? <X className="size-4" /> : <PanelLeftClose className="size-4" />}
        </button>}
      </div>
      {collapsed && <div className="flex justify-center pb-2"><Button variant="ghost" size="icon" aria-label="Mở rộng sidebar" aria-expanded={false} onClick={onToggleCollapsed}><PanelLeftOpen className="size-4" /></Button></div>}

      <div className={cn('px-3 pb-5 pt-2 shrink-0', collapsed && 'px-2')}>
          <Button
            onClick={handleNewSessionClick}
            variant="secondary"
            className={cn(
              'w-full gap-2 border-primary/25 bg-primary/10 text-primary font-medium hover:bg-primary/15',
              collapsed
                ? 'justify-center px-0'
                : 'justify-start px-3'
            )}
            aria-label="Phiên mới"
          >
            <Plus className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Phiên mới</span>}
          </Button>
      </div>

      <nav aria-label="Điều hướng chính" className="sidebar-scroll flex-1 overflow-y-auto px-2 space-y-1 min-h-0">
        {workspaceNavigation.filter(item => item.href !== '/settings').map((item) => (
          <SidebarNavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            collapsed={collapsed}
            onClick={() => handleNavClick(item.href)}
          />
        ))}

        {!collapsed && (
          <>
            <p className="text-muted-foreground uppercase text-xs tracking-wide px-2 mt-6 mb-2 font-semibold">
              Phiên gần đây
            </p>
            {recentSessions.length === 0 ? (
              <p className="text-xs text-muted-foreground px-2">
                Chưa có phiên nào gần đây
              </p>
            ) : (
              <div className="space-y-0.5">
                {recentSessions.slice(0, 5).map((session) => (
                  <RecentSessionItem
                    key={session.id}
                    session={session}
                    selected={session.id === selectedSessionId}
                    onClick={() => handleNavClick(`/sessions/${session.id}`)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </nav>

      <div className="border-t border-sidebar-border p-2 mt-2 shrink-0">
        {(
          <SidebarNavItem
            href="/settings"
            icon={Settings}
            label="Cài đặt"
            collapsed={collapsed}
            onClick={() => handleNavClick('/settings')}
          />
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Mở menu tài khoản"
              className={cn(
                'w-full flex items-center gap-2 py-2 px-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-popover/60 hover:text-foreground transition-colors mt-1',
                collapsed && 'justify-center px-0'
              )}
            >
              <div className="size-9 rounded-full border border-border bg-popover text-foreground flex items-center justify-center font-semibold shrink-0 text-xs">
                {initials}
              </div>
              {!collapsed && (
                <span className="truncate flex-1 text-left flex flex-col min-w-0">
                  <span className="truncate text-foreground text-sm font-medium">
                    {displayName}
                  </span>
                  <span className="truncate text-xs text-muted-foreground font-normal">
                    {email}
                  </span>
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium text-foreground truncate">
                {displayName}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {email}
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                router.push('/settings');
                handleNavClick('/settings');
              }}
              className="cursor-pointer"
            >
              <Settings className="w-4 h-4 mr-2" />
              Cài đặt
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                router.push('/progress');
                handleNavClick('/progress');
              }}
              className="cursor-pointer"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Tiến độ
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
