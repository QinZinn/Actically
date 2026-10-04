"use client";

import { Database, Cpu } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ConnectionTilesProps {
  connections: {
    database: "connected" | "unavailable";
    ai: "configured" | "unavailable";
  };
}

export default function ConnectionTiles({ connections }: ConnectionTilesProps) {
  const aiConfigured = connections.ai === "configured";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Card>
        <CardContent className="pt-6 flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary shrink-0" />
              <h3 className="font-semibold">Cơ sở dữ liệu</h3>
            </div>
            <Badge
              variant={connections.database === "connected" ? "solid" : "nodata"}
              size="sm"
            >
              {connections.database === "connected" ? "Đã kết nối" : "Chưa kết nối"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Lưu dữ liệu người dùng, phiên học và khái niệm.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-primary shrink-0" />
              <h3 className="font-semibold">AI / Đánh giá</h3>
            </div>
            <Badge
              variant={aiConfigured ? "solid" : "nodata"}
              size="sm"
            >
              {aiConfigured ? "Đã cấu hình" : "Chưa cấu hình"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {aiConfigured ? "Dịch vụ AI đã được cấu hình cho các phiên học và đánh giá." : "Dịch vụ AI chưa được cấu hình. Phản hồi trong chế độ mẫu chỉ dùng để minh họa."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
