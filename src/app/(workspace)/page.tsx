"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useActicallyClient } from "@/features/client-provider";
import type { LearningSession } from "@/contracts/dto";
import AppLayout from "@/components/layout/AppLayout";
import NewSessionCard from "@/features/session/NewSessionCard";
import { ToastProvider } from "@/components/ui/toast";

function ClientHome() {
  const router = useRouter();
  const client = useActicallyClient();
  const [loaded, setLoaded] = React.useState(false);
  const [sessions, setSessions] = React.useState<LearningSession[]>([]);

  React.useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const list = await client.listSessions({ limit: 10, offset: 0 });
        if (!mounted) return;
        setSessions(list);
        if (list.length > 0) {
          const latest = list.sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )[0];
          router.replace(`/sessions/${latest.id}`);
          return;
        }
      } catch {
        /* ignore - show empty state */
      } finally {
        if (mounted) setLoaded(true);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [client, router]);

  if (!loaded) {
    return (
      <AppLayout>
        <div className="min-h-[50vh]" />
      </AppLayout>
    );
  }

  return (
    <ToastProvider>
      <AppLayout>
        <NewSessionCard recent={sessions} />
      </AppLayout>
    </ToastProvider>
  );
}

export default function Page() {
  return <ClientHome />;
}
