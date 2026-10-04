'use client';

import { useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import {
  Menu,
  Search,
  Settings,
  LogOut,
  ChartNoAxesCombined,
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { getClient } from '@/lib/client';
import { signOut } from '@/lib/client/auth';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import GlobalSearchDialog from '@/components/search/GlobalSearchDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { UserProfile } from '@/contracts/dto';
import { cn } from '@/lib/client/utils';
import { workspaceNavigation } from './navigation';

interface TopbarProps {
  profile?: UserProfile | null;
  breadcrumbs?: ReactNode;
  title?: string;
  onOpenSidebar?: () => void;
  children?: ReactNode;
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

export default function Topbar({
  breadcrumbs,
  title,
  onOpenSidebar,
  children,
  profile,
}: TopbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const section = workspaceNavigation.find(item => item.href === pathname) ?? workspaceNavigation[0];
  const SectionIcon = section.icon;
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await signOut();
      router.replace('/login');
      router.refresh();
    } catch (error) {
      toast({ variant: 'error', title: 'Đăng xuất thất bại', description: error instanceof Error ? error.message : 'Vui lòng thử lại.' });
    }
  }, [router]);

  const displayName = profile?.displayName ?? 'Người dùng';
  const email = profile?.email ?? '(chưa đăng nhập)';
  const initials = getInitials(profile?.displayName ?? 'U');
  const client = getClient();

  return (
    <>
      <header
        className={cn(
          'z-10 bg-sidebar/60 border-b border-border h-16 flex items-center px-4 sm:px-6 lg:px-8 gap-3 shrink-0'
        )}
      >
        {onOpenSidebar && (
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden -ml-2"
            onClick={onOpenSidebar}
            aria-label="Mở menu"
          >
            <Menu className="w-5 h-5" />
          </Button>
        )}

        <div className="flex-1 min-w-0 flex items-center gap-3">
          {breadcrumbs || <><SectionIcon className="hidden size-[18px] text-muted-foreground sm:block" /><span className="truncate text-sm font-medium text-foreground">{title ?? section.label}</span></>}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {children}
          <Button
            variant="secondary"
            onClick={() => setSearchOpen(true)}
            aria-label="Tìm kiếm (Ctrl+K)"
            title="Tìm kiếm (Ctrl+K)"
            className="size-10 px-0 sm:w-auto sm:gap-3 sm:px-3"
          >
            <Search className="w-5 h-5" />
            <span className="hidden text-sm font-normal text-muted-foreground sm:inline">Tìm kiếm</span>
            <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground lg:inline">Ctrl K</kbd>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Tài khoản" className="relative">
                <div className="size-8 rounded-full border border-border bg-popover text-foreground flex items-center justify-center font-semibold text-xs">
                  {initials}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
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
                onClick={() => router.push('/settings')}
                className="cursor-pointer"
              >
                <Settings className="w-4 h-4 mr-2" />
                Cài đặt
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push('/progress')}
                className="cursor-pointer"
              >
                <ChartNoAxesCombined className="size-4 mr-2" />
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
      </header>
      <GlobalSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        client={client}
      />
    </>
  );
}
