"use client";

import * as React from "react";
import { CheckCircle2, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import MarkdownRenderer from "@/components/markdown/MarkdownRenderer";

interface ComprehensionCheckProps {
  check: string;
  onAnswer?: (ans: string) => Promise<boolean>;
}

export default function ComprehensionCheck({
  check,
  onAnswer,
}: ComprehensionCheckProps) {
  const [answer, setAnswer] = React.useState("");
  const [sending, setSending] = React.useState(false);

  const handleSubmit = async () => {
    if (!answer.trim() || !onAnswer || sending) return;
    setSending(true);
    try { if (await onAnswer(answer.trim())) setAnswer(""); }
    finally { setSending(false); }
  };

  return (
    <Card className="mt-4 p-4 w-full border border-border">
      <div className="flex items-center gap-2 mb-3">
        <Badge variant="default" className="text-sm gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Kiểm tra hiểu
        </Badge>
      </div>
      <div className="mb-3">
        <MarkdownRenderer>{check}</MarkdownRenderer>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-end">
        <Textarea
          rows={2}
          aria-label="Câu trả lời kiểm tra hiểu"
          maxLength={16000}
          placeholder="Trả lời ngắn gọn của bạn…"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          className="flex-1 resize-none"
        />
        <Button size="sm" onClick={handleSubmit} disabled={!answer.trim() || !onAnswer || sending}>
          <Send className="w-4 h-4" />
          Gửi câu trả lời
        </Button>
      </div>
    </Card>
  );
}
