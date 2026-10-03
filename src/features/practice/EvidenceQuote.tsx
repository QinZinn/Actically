"use client";

import { BookOpen } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import MarkdownRenderer from "@/components/markdown/MarkdownRenderer";
import type { SourceRef } from "@/contracts/dto";
import { Badge } from "@/components/ui/badge";

interface EvidenceQuoteProps {
  conceptId: string;
  revision: number;
  excerpt: string;
  sourceRefs?: SourceRef[];
}

export default function EvidenceQuote({
  conceptId,
  revision,
  excerpt,
  sourceRefs = [],
}: EvidenceQuoteProps) {
  return (
    <Card className="bg-popover p-2 rounded border-border">
      <div className="text-xs text-muted-foreground mb-1">
        <Link href={`/knowledge?id=${encodeURIComponent(conceptId)}`} className="text-primary underline">Khái niệm r{revision}</Link>
      </div>
      <div className="text-sm">
        <MarkdownRenderer>{excerpt}</MarkdownRenderer>
      </div>
      {sourceRefs.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-border/60">
          <span className="text-xs text-muted-foreground mr-1">Nguồn:</span>
          {sourceRefs.map((sr, idx) => (
            <details
              key={idx}
              className="w-full text-xs"
            >
              <summary className="cursor-pointer">
              <Badge variant="outline" size="sm" className="gap-1">
                <BookOpen className="h-3 w-3" />
                <span className="text-xs">Nguồn #{sr.sourceId.slice(0, 6)} · r{sr.revision}</span>
              </Badge>
              </summary><blockquote className="p-2 border-l-2 border-border whitespace-pre-wrap">{sr.excerpt}</blockquote>
            </details>
          ))}
        </div>
      )}
    </Card>
  );
}
