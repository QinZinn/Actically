"use client";

import { useState } from "react";
import { UserCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import type { UserProfile } from "@/contracts/dto";
import type { ProfileUpdate } from "@/contracts/requests";

interface ProfileSectionProps {
  profile: UserProfile;
  onSave: (input: ProfileUpdate) => Promise<UserProfile>;
}

function getInitials(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ProfileSection({ profile, onSave }: ProfileSectionProps) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [saving, setSaving] = useState(false);

  const dirty = displayName !== profile.displayName;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty || saving) return;
    const trimmed = displayName.trim();
    if (!trimmed || trimmed.length > 120) return;
    setSaving(true);
    try {
      await onSave({ displayName: trimmed });
      toast({ variant: "success", title: "Đã lưu hồ sơ" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast({
        variant: "error",
        title: "Lưu thất bại",
        description: message ?? "Không thể lưu hồ sơ.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCircle2 className="w-5 h-5 text-primary" />
          Thông tin cá nhân
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="flex flex-col gap-5">
          <div className="flex gap-5 items-start">
            <div
              className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold shrink-0 select-none"
              aria-hidden
            >
              {getInitials(displayName)}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="display-name">Tên hiển thị</Label>
                <Input
                  id="display-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={120}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email ?? ""}
                  placeholder={profile.email ? undefined : "(chưa liên kết)"}
                  disabled
                />
              </div>
            </div>
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
