"use client";

import { AlertTriangle, TrendingUp, CheckCircle2, CircleDashed } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function ProgressLegend() {
  const items = [
    {
      variant: "weak" as const,
      label: "Cần củng cố",
      icon: AlertTriangle,
      tooltip: "Trong 5 ôn gần nhất của mỗi thẻ: ≥ 2 lượt Again",
    },
    {
      variant: "growing" as const,
      label: "Đang tiến bộ",
      icon: TrendingUp,
      tooltip: "Có bằng chứng ôn tập, không có thẻ cần củng cố và chưa đủ điều kiện Vững",
    },
    {
      variant: "solid" as const,
      label: "Vững",
      icon: CheckCircle2,
      tooltip: "Chủ đề ≥ 3 thẻ, MỌI thẻ đủ điều kiện đều có 5 lần ôn với ≥ 4 Good/Easy VÀ 0 Again",
    },
    {
      variant: "nodata" as const,
      label: "Chưa đủ dữ liệu",
      icon: CircleDashed,
      tooltip: "Chưa có bằng chứng ôn tập nào — không có nghĩa là yếu",
    },
  ];

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <Tooltip key={it.variant}>
            <TooltipTrigger asChild>
              <Badge variant={it.variant} size="sm" tabIndex={0} className="cursor-help">
                <Icon className="w-3 h-3" />
                {it.label}
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-[260px]">
              <p className="text-xs">{it.tooltip}</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
