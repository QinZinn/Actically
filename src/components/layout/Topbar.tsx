'use client';

import type { ReactNode } from 'react';
import {
  Menu,
  Search,
  UserCircle2,
  Settings,
  LogOut,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
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
  breadcrumbs?: ReactNode;
  title?: string;
  onOpenGlobalSearch: () => void;
  onOpenSidebar?: () => void;
  userProfile?: Partial<UserProfile>;
  children?: ReactNode;
}

export default function Topbar({
  breadcrumbs,
  title,
  onOpenGlobalSearch,
  onOpenSidebar,
  userProfile,
  children,
}: TopbarProps) {
  const router = useRouter();

  return (
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
          onClick={onOpenGlobalSearch}
          aria-label="Tìm kiếm"
        >
          <Search className="w-5 h-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Tài khoản">
              <UserCircle2 className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium text-foreground truncate">
                {userProfile?.displayName || 'Người dùng'}
              </p>
              {userProfile?.email && (
                <p className="text-xs text-muted-foreground truncate">
                  {userProfile.email}
                </p>
              )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => router.push('/settings')}
              className="cursor-pointer"
            >
              <Settings className="w-4 h-4 mr-2" />
              Cài đặt
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => router.push('/login')}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
