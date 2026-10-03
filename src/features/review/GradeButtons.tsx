"use client";

import { RotateCcw, BrainCircuit, ThumbsUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reviewRatingSchema } from "@/contracts/dto";
import type { z } from "zod";
type ReviewRating = z.infer<typeof reviewRatingSchema>;

interface GradeButtonsProps {
  disabled?: boolean;
  onGrade: (rating: ReviewRating) => void;
}

const buttons: {
  rating: ReviewRating;
  label: string;
  sub: string;
  variant: "grade-again" | "grade-hard" | "grade-good" | "grade-easy";
  Icon: typeof RotateCcw;
}[] = [
  {
    rating: "again",
    label: "Lại",
    sub: "Chưa nhớ",
    variant: "grade-again",
    Icon: RotateCcw,
  },
  {
    rating: "hard",
    label: "Khó",
    sub: "Khó nhớ",
    variant: "grade-hard",
    Icon: BrainCircuit,
  },
  {
    rating: "good",
    label: "OK",
    sub: "Đã nhớ",
    variant: "grade-good",
    Icon: ThumbsUp,
  },
  {
    rating: "easy",
    label: "Dễ",
    sub: "Nhớ dễ",
    variant: "grade-easy",
    Icon: Sparkles,
  },
];

export default function GradeButtons({
  disabled,
  onGrade,
}: GradeButtonsProps) {
  return (
    <div className="grid grid-cols-4 gap-2 w-full">
      {buttons.map((b) => {
        const Icon = b.Icon;
        return (
          <Button
            key={b.rating}
            variant={b.variant}
            disabled={disabled}
            onClick={() => onGrade(b.rating)}
            className="h-auto py-3 flex-col gap-1"
          >
            <Icon className="h-5 w-5" />
            <div className="text-sm font-bold leading-none">{b.label}</div>
            <div className="text-[10px] opacity-80 font-normal">{b.sub}</div>
          </Button>
        );
      })}
    </div>
  );
}
