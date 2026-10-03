"use client";

import { Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function TechnicalAttribution() {
  return (
    <Card className="bg-muted/40 border border-border">
      <CardContent className="pt-6 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Info className="w-5 h-5 text-muted-foreground shrink-0" />
          <h3 className="font-semibold text-foreground">Thông tin công nghệ</h3>
        </div>
        <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
          <p>
            Giao diện: Next.js 16, React 19, Tailwind 4, shadcn/ui (Radix primitives), Be Vietnam Pro, lucide-react.
          </p>
          <p>
            Toán học: KaTeX (STIX Two Math).
          </p>
          <p>
            AI backend: có thể sử dụng NVIDIA Nemotron qua Nebius Token Factory.
          </p>
          <p>
            Lưu ý: Actically KHÔNG liên kết với NVIDIA. Không hiển thị logo NVIDIA thương mại.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
