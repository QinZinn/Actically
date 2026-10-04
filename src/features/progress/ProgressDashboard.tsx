"use client";

import { CircleDashed } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
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
      <PageHeader eyebrow="Nhìn lại để học tiếp" title="Tiến độ học tập" description="Xem phần đã vững và phần cần ôn thêm, dựa trên các lần ôn và bài luyện tập đã lưu." />
      <ProgressLegend />

      {topics.length === 0 ? (
        <EmptyState
          icon={<CircleDashed />}
          title="Chưa có dữ liệu tiến độ"
          description="Bắt đầu học & ôn để thấy đánh giá."
        />
      ) : (
        <div className="concept-grid">
          {topics.map((t) => (
            <TopicProgressCard key={t.studySetId} topic={t} />
          ))}
        </div>
      )}
    </div>
  );
}
