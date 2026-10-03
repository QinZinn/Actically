'use client';

import { useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import {
  Menu,
  Search,
  Settings,
  LogOut,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
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
          'sticky top-0 z-10 backdrop-blur bg-background/80 border-b border-border h-14 flex items-center px-8 gap-4 shrink-0'
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
          {breadcrumbs || (
            title && (
              <h1 className="text-lg font-semibold text-foreground truncate">
                {title}
              </h1>
            )
          )}
          {children}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSearchOpen(true)}
            aria-label="Tìm kiếm (Ctrl+K)"
            title="Tìm kiếm (Ctrl+K)"
          >
            <Search className="w-5 h-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Tài khoản" className="relative">
                <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
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
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>
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
