"use client";
import * as React from "react";
import { useActicallyClient } from "@/features/client-provider";
import type { LearningSession } from "@/contracts/dto";
import AppLayout from "@/components/layout/AppLayout";
import NewSessionCard from "@/features/session/NewSessionCard";
import { ErrorState } from "@/components/ui/error-state";
export default function Page() {
  const client = useActicallyClient();
  const [sessions, setSessions] = React.useState<LearningSession[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [retry, setRetry] = React.useState(0);
  React.useEffect(() => {
    let active = true;
    client.listSessions({ limit: 100, offset: 0 }).then(list => { if (active) { setSessions(list); setError(null); } })
      .catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [client, retry]);
  return <AppLayout>{error ? <ErrorState title="Không tải được lịch sử" body={error} onRetry={() => setRetry(v => v + 1)} /> :
    sessions === null ? <p role="status">Đang tải phiên học…</p> : <NewSessionCard recent={sessions} />}</AppLayout>;
}
