'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/client/utils';

interface SidebarNavItemProps {
  href: string;
  icon: LucideIcon;
  label: string;
  badgeNumber?: number;
  selected?: boolean;
  collapsed?: boolean;
  onClick?: () => void;
}

export default function SidebarNavItem({
  href,
  icon: Icon,
  label,
  badgeNumber,
  selected: selectedProp,
  collapsed = false,
  onClick,
}: SidebarNavItemProps) {
  const pathname = usePathname();

  const isSelected =
    selectedProp !== undefined
      ? selectedProp
      : pathname === href || pathname.startsWith(href + '/');

  const content = (
    <div
      className={cn(
        'relative flex items-center h-[38px] px-3 rounded-lg gap-[9px] text-sm font-medium transition-colors w-full',
        isSelected
          ? 'bg-popover text-foreground [&_svg]:text-primary'
          : 'text-muted-foreground hover:bg-popover/60 hover:text-foreground',
        collapsed && 'justify-center px-0'
      )}
    >
      <Icon className="w-5 h-5 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
      {!collapsed && badgeNumber !== undefined && badgeNumber > 0 && (
        <span className="absolute right-2 inline-flex items-center justify-center px-2 h-[22px] rounded-full bg-popover text-primary text-[11px] font-semibold">
          {badgeNumber}
        </span>
      )}
    </div>
  );

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  if (collapsed) {
    return (
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <Link href={href} onClick={handleClick} className="block">
            {content}
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Link href={href} onClick={handleClick} className="block">
      {content}
    </Link>
  );
}
