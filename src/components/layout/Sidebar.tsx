'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  BrainCircuit,
  FilePenLine,
  LayoutGrid,
  Library,
  TrendingUp,
  Settings,
  Plus,
  LogOut,
  ChevronLeft,
  ChevronRight,
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

interface SidebarProps {
  profile?: UserProfile | null;
  recentSessions?: LearningSession[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
  selectedSessionId?: string;
  onNewSession?: () => void;
  onNav?: (route: string) => void;
}

interface NavItem {
  href: string;
  icon: typeof BrainCircuit;
  label: string;
  badgeNumber?: number;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', icon: BrainCircuit, label: 'Học với AI' },
  { href: '/practice', icon: FilePenLine, label: 'Tự kiểm tra' },
  { href: '/review', icon: LayoutGrid, label: 'Ôn tập' },
  { href: '/knowledge', icon: Library, label: 'Kho kiến thức' },
  { href: '/progress', icon: TrendingUp, label: 'Tiến độ' },
];

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
        'flex flex-col bg-sidebar h-screen border-r border-sidebar-border sticky top-0 overflow-hidden transition-[width] duration-200 shrink-0',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <div className={cn(
        'h-14 flex items-center shrink-0 relative',
        collapsed ? 'justify-center px-0' : 'justify-between px-4'
      )}>
        <Link
          href="/"
          className="flex items-center gap-2 shrink-0"
          onClick={() => handleNavClick('/')}
        >
          <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-primary" />
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
        <button
          type="button"
          onClick={onToggleCollapsed}
          className={cn(
            'absolute top-1/2 -translate-y-1/2 z-10 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-popover transition-colors',
            collapsed
              ? 'right-0 focus-visible:ring-2 focus-visible:ring-primary'
              : 'right-2'
          )}
          aria-label={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
          aria-expanded={!collapsed}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      <div className={cn('px-2 shrink-0', collapsed && 'px-1')}>
          <Button
            onClick={handleNewSessionClick}
            variant="ghost"
            size="sm"
            className={cn(
              'w-full gap-2 text-foreground font-medium',
              collapsed
                ? 'justify-center px-0 h-9'
                : 'justify-start px-2 mt-1'
            )}
            aria-label="Phiên mới"
          >
            <Plus className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Phiên mới</span>}
          </Button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
        {NAV_ITEMS.map((item) => (
          <SidebarNavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            badgeNumber={item.badgeNumber}
            collapsed={collapsed}
            onClick={() => handleNavClick(item.href)}
          />
        ))}

        {!collapsed && (
          <>
            <p className="text-muted-foreground uppercase text-xs tracking-wide px-2 mt-6 mb-2 font-semibold">
              Gần đây
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
        {!collapsed && (
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
              className={cn(
                'w-full flex items-center gap-2 py-2 px-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-popover/60 hover:text-foreground transition-colors mt-1',
                collapsed && 'justify-center px-0'
              )}
            >
              <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0 text-sm">
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
