"use client";

import { TrendingUp, CircleDashed } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import type { TopicProgress } from "@/contracts/dto";
import TopicProgressCard from "./TopicProgressCard";
import ProgressLegend from "./ProgressLegend";

interface ProgressDashboardProps {
  topics: TopicProgress[];
}

export default function ProgressDashboard({ topics }: ProgressDashboardProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-primary shrink-0" />
          <h2 className="text-2xl font-bold tracking-tight">Tiến độ học tập</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Đánh giá dựa trên 5 lần ôn gần nhất của mỗi thẻ theo chính sách reviews-v1.
        </p>
        <ProgressLegend />
      </div>

      {topics.length === 0 ? (
        <EmptyState
          icon={<CircleDashed />}
          title="Chưa có dữ liệu tiến độ"
          description="Bắt đầu học & ôn để thấy đánh giá."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((t) => (
            <TopicProgressCard key={t.studySetId} topic={t} />
          ))}
        </div>
      )}
    </div>
  );
}
