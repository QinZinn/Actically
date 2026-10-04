"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { getClient } from "@/lib/client";
import type { UserProfile } from "@/contracts/dto";
import type { ProfileUpdate } from "@/contracts/requests";
import ProfileSection from "@/features/settings/ProfileSection";
import TimezoneSelect from "@/features/settings/TimezoneSelect";
import SidebarToggle from "@/features/settings/SidebarToggle";
import ConnectionTiles from "@/features/settings/ConnectionTiles";
import TechnicalAttribution from "@/features/settings/TechnicalAttribution";

function SettingsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="flex gap-5 items-start">
            <Skeleton className="w-16 h-16 rounded-full shrink-0" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </div>
          <div className="flex justify-end mt-5">
            <Skeleton className="h-8 w-16" />
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader><Skeleton className="h-6 w-24" /></CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-5 w-full max-w-xs" />
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card><CardContent className="pt-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
        <Card><CardContent className="pt-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
      </div>
      <Card><CardContent className="pt-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
    </div>
  );
}

function SettingsInner() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const client = getClient();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const p = await client.getProfile();
      if (mounted) setProfile(p);
    })().catch(e => { if (mounted) setError(e.message); });
    return () => { mounted = false; };
  }, [client, retry]);

  async function handleSaveProfile(input: ProfileUpdate): Promise<UserProfile> {
    const next = await client.updateProfile(input);
    setProfile(next);
    window.dispatchEvent(new Event("actically:profile-changed"));
    return next;
  }

  async function handleSaveTz(tz: string): Promise<UserProfile> {
    return handleSaveProfile({ timezone: tz });
  }

  async function handleSidebarChange(collapsed: boolean): Promise<UserProfile> {
    return handleSaveProfile({ sidebarCollapsed: collapsed });
  }

  if (error && !profile) return <ErrorState title="Không tải được hồ sơ" body={error} onRetry={() => setRetry(v => v + 1)} />;
  if (!profile) return <SettingsSkeleton />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Không gian của bạn" title="Cài đặt" description="Quản lý hồ sơ, múi giờ và tùy chọn hiển thị của Actically." />

      <ProfileSection profile={profile} onSave={handleSaveProfile} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TimezoneSelect tz={profile.timezone} onSave={handleSaveTz} />
        <Card>
          <CardContent className="pt-6">
            <SidebarToggle
              collapsed={profile.sidebarCollapsed}
              onChange={handleSidebarChange}
            />
          </CardContent>
        </Card>
      </div>

      <ConnectionTiles connections={profile.connections} />

      <TechnicalAttribution />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AppLayout>
      <SettingsInner />
    </AppLayout>
  );
}
