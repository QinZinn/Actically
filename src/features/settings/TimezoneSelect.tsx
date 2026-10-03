"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import type { UserProfile } from "@/contracts/dto";

interface TimezoneSelectProps {
  tz: string;
  onSave: (tz: string) => Promise<UserProfile>;
}

const TIMEZONE_OPTIONS: string[] = [
  "Asia/Ho_Chi_Minh",
  "Africa/Abidjan",
  "America/New_York",
  "Europe/London",
  "Europe/Paris",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Bangkok",
  "Asia/Hong_Kong",
  "Australia/Sydney",
];

function validateTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export default function TimezoneSelect({ tz, onSave }: TimezoneSelectProps) {
  const [value, setValue] = useState(tz);
  const [saving, setSaving] = useState(false);

  const dirty = value !== tz;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty || saving) return;
    if (!validateTimezone(value)) {
      toast({ variant: "error", title: "Múi giờ không hợp lệ" });
      return;
    }
    setSaving(true);
    try {
      await onSave(value);
      toast({ variant: "success", title: "Đã lưu múi giờ" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast({
        variant: "error",
        title: "Lưu thất bại",
        description: message ?? "Không thể lưu cài đặt.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Múi giờ
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tz-select">Chọn múi giờ</Label>
            <select
              id="tz-select"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="flex h-[38px] w-full rounded-lg border border-input bg-sidebar/50 px-3 text-sm shadow-sm transition-colors placeholder:text-muted-foreground outline-none ring-0 focus:border-primary focus:shadow-[0_0_0_3px_var(--focus-halo)] duration-150 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {TIMEZONE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Thời gian ôn tập hàng đợi và ngày tháng hiển thị theo múi giờ bạn chọn.
            </p>
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              variant="primary"
              disabled={!dirty || saving}
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
