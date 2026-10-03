"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getClient } from "@/lib/client";
import type { TopicProgress } from "@/contracts/dto";
import ProgressDashboard from "@/features/progress/ProgressDashboard";

function ProgressSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-full max-w-xl" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-28" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="shadow">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <Skeleton className="h-5 flex-1" />
                <Skeleton className="h-7 w-28 shrink-0" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 mb-4">
                <Skeleton className="h-3 w-36" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-40" />
              </div>
              <div className="flex flex-col gap-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ProgressInner() {
  const [topics, setTopics] = useState<TopicProgress[] | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const client = getClient();
      const data = await client.getProgress();
      if (mounted) setTopics(data);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return topics === null ? (
    <ProgressSkeleton />
  ) : (
    <ProgressDashboard topics={topics} />
  );
}

export default function ProgressPage() {
  return (
    <AppLayout>
      <ProgressInner />
    </AppLayout>
  );
}
