"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { reviewRatingSchema } from "@/contracts/dto";
import type { ReviewPresentation } from "@/contracts/dto";
import type { z } from "zod";
import Flashcard from "./Flashcard";
import GradeButtons from "./GradeButtons";

type ReviewRating = z.infer<typeof reviewRatingSchema>;

interface ReviewSessionProps {
  grading?: boolean;
  presentations: ReviewPresentation[];
  index: number;
  onGrade: (idx: number, rating: ReviewRating) => void;
}

export default function ReviewSession({
  presentations,
  index,
  onGrade,
  grading = false,
}: ReviewSessionProps) {
  const [revealed, setRevealed] = useState(false);
  const current = presentations[index];
  const total = presentations.length;

  if (!current) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        Hết thẻ trong hàng đợi.
      </div>
    );
  }

  const handleGrade = (rating: ReviewRating) => {
    onGrade(index, rating);
  };

  return (
    <div className="flex flex-col gap-4 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Badge variant="solid" size="md">
            {index + 1} / {total}
          </Badge>
          <span className="text-sm text-muted-foreground">{revealed ? "Bạn nhớ được đến đâu?" : "Thử trả lời trước khi lật thẻ"}</span>
        </div>
      </div>

      <div className="pt-2">
        <Flashcard
          card={current.card}
          revealed={revealed}
          onReveal={() => setRevealed(true)}
        />
      </div>

      {!revealed ? (
        <Button
          variant="secondary"
          className="w-full mt-3 py-4 h-auto text-sm gap-2"
          onClick={() => setRevealed(true)}
        >
          <Eye className="h-5 w-5" />
          Hiện đáp án
        </Button>
      ) : (
        <div className="pt-2">
          <GradeButtons disabled={grading} onGrade={handleGrade} />
        </div>
      )}
    </div>
  );
}
