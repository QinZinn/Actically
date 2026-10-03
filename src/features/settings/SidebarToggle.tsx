"use client";

import { useEffect, useRef, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { UserProfile } from "@/contracts/dto";

interface SidebarToggleProps {
  collapsed: boolean;
  onChange: (b: boolean) => Promise<UserProfile>;
}

export default function SidebarToggle({ collapsed, onChange }: SidebarToggleProps) {
  const [optimistic, setOptimistic] = useState(collapsed);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const pendingRef = useRef<boolean | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setOptimistic(collapsed);
    });
  }, [collapsed]);

  async function saveValue(val: boolean) {
    savingRef.current = true;
    try {
      await onChange(val);
    } catch {
      setOptimistic(collapsed);
    } finally {
      savingRef.current = false;
      const pending = pendingRef.current;
      pendingRef.current = null;
      if (pending !== null) {
        const next = pending;
        setOptimistic(next);
        scheduleSave(next);
      }
    }
  }

  function scheduleSave(val: boolean) {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (savingRef.current) {
        pendingRef.current = val;
      } else {
        saveValue(val);
      }
    }, 500);
  }

  function handleCheckedChange(next: boolean) {
    setOptimistic(next);
    scheduleSave(next);
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex flex-col gap-1">
        <Label htmlFor="sidebar-toggle" className="cursor-pointer">
          Thu gọn thanh điều hướng mặc định
        </Label>
      </div>
      <Switch
        id="sidebar-toggle"
        checked={optimistic}
        onCheckedChange={handleCheckedChange}
      />
    </div>
  );
}
