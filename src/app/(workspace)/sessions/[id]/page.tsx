"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { StudyMode, ExtractionResult, StudySet, Message } from "@/contracts/dto";
import AppLayout from "@/components/layout/AppLayout";
import { ToastProvider, toast } from "@/components/ui/toast";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useActicallyClient } from "@/features/client-provider";
import { useSession } from "@/features/session/useSession";
import SessionHeader from "@/features/session/SessionHeader";
import MessageList from "@/features/session/MessageList";
import SessionComposer from "@/features/session/SessionComposer";
import StreamingIndicator from "@/features/session/StreamingIndicator";

interface SessionPageInnerProps {
  sessionId: string;
}

function SessionPageInner({ sessionId }: SessionPageInnerProps) {
  const client = useActicallyClient();
  const router = useRouter();
  const {
    session,
    messages,
    sending,
    error,
    streaming,
    sendMessage,
    cancel,
    finishSession,
    handleRetry,
  } = useSession(sessionId);

  const [mode, setMode] = React.useState<StudyMode>(() => session?.mode ?? "socratic");
  const [studySetId, setStudySetId] = React.useState<string | null>(() => session?.studySetId ?? null);
  const [sourceOpen, setSourceOpen] = React.useState(false);
  const [, setStudySets] = React.useState<StudySet[]>([]);

  React.useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const list = await client.listStudySets();
        if (mounted) setStudySets(list);
      } catch {
        /* ignore */
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [client]);

  React.useEffect(() => {
    if (error) {
      toast({ title: "Lỗi", description: error, variant: "error" });
    }
  }, [error]);

  const handleRename = async (title: string) => {
    if (!session) return;
    try {
      await client.updateSession(session.id, {
        title,
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Có lỗi xảy ra.";
      toast({
        title: "Đổi tên thất bại",
        description: message,
        variant: "error",
      });
    }
  };

  const handleDelete = async () => {
    if (!session) return;
    try {
      await client.deleteSession(session.id);
      toast({ title: "Đã xóa phiên", variant: "info" });
      router.push("/");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Có lỗi xảy ra.";
      toast({
        title: "Xóa thất bại",
        description: message,
        variant: "error",
      });
    }
  };

  const handleEndExtract = async (): Promise<ExtractionResult | void> => {
    return finishSession();
  };

  const handleFollowUpStep = (_msg: Message, stepNumber: number) => {
    sendMessage(mode, `Xin giải thích rõ hơn bước ${stepNumber}`, stepNumber);
  };

  const contextPanel = (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm">
        Khái niệm liên quan (sẽ cập nhật sau khi kết thúc)
      </h3>
      <p className="text-muted text-sm">
        Kết thúc phiên để trích xuất.
      </p>
    </div>
  );

  return (
    <React.Fragment key={session?.id ?? "loading"}>
      <AppLayout contextPanel={contextPanel}>
        <div className="flex flex-col h-[calc(100vh-8rem)] min-h-0">
          {!session ? (
            <div className="space-y-4 p-4">
              <div className="flex justify-between items-center mb-4">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-8 w-40" />
              </div>
              <div className="space-y-5">
                <Skeleton className="h-24 w-3/4 ml-auto" />
                <Skeleton className="h-32 w-4/5" />
                <Skeleton className="h-24 w-2/3 ml-auto" />
              </div>
            </div>
          ) : error && messages.length === 0 ? (
            <div className="p-4">
              <ErrorState
                title="Không thể tải phiên học"
                body={error}
                onRetry={() => router.refresh()}
              />
            </div>
          ) : (
            <>
              <div className="px-4 pt-4">
                <SessionHeader
                  session={session}
                  onRename={handleRename}
                  onDelete={handleDelete}
                  onEndExtractConcepts={handleEndExtract}
                />
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <MessageList
                  messages={messages}
                  onRetry={handleRetry}
                  onFollowUpSolveStep={handleFollowUpStep}
                />
                <StreamingIndicator visible={streaming && sending} />
              </div>
              <SessionComposer
                mode={mode}
                onModeChange={setMode}
                studySetId={studySetId}
                onStudySetChange={setStudySetId}
                onSend={(m, c) => sendMessage(m, c)}
                sending={sending}
                onCancel={cancel}
                sourcePasteOpen={sourceOpen}
                onToggleSourcePaste={() => setSourceOpen((v) => !v)}
              />
            </>
          )}
        </div>
      </AppLayout>
    </React.Fragment>
  );
}

export default function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <ToastProvider>
      <SessionPageParamsWrapper paramsPromise={params} />
    </ToastProvider>
  );
}

function SessionPageParamsWrapper({
  paramsPromise,
}: {
  paramsPromise: Promise<{ id: string }>;
}) {
  const [params, setParams] = React.useState<{ id: string } | null>(null);
  React.useEffect(() => {
    let mounted = true;
    paramsPromise.then((p) => {
      if (mounted) setParams(p);
    });
    return () => {
      mounted = false;
    };
  }, [paramsPromise]);
  if (!params) {
    return (
      <AppLayout>
        <div className="p-8 space-y-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }
  return <SessionPageInner sessionId={params.id} />;
}
