"use client";

import * as React from "react";
import { ListOrdered, MessagesSquare, Zap } from "lucide-react";
import type { StudyMode } from "@/contracts/dto";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/client/utils";

interface ModeSelectorProps {
  disabled?: boolean;
  value: StudyMode;
  onChange: (mode: StudyMode) => void;
}

const modes: {
  value: StudyMode;
  label: string;
  icon: React.ReactNode;
}[] = [
  { value: "socratic", label: "Socratic", icon: <MessagesSquare className="w-3.5 h-3.5" /> },
  { value: "solve", label: "Giải bài", icon: <ListOrdered className="w-3.5 h-3.5" /> },
  { value: "ask", label: "Hỏi nhanh", icon: <Zap className="w-3.5 h-3.5" /> },
];

export default function ModeSelector({ value, onChange, disabled }: ModeSelectorProps) {
  return (
    <div className="flex items-center gap-1">
      {modes.map((m) => {
        const selected = value === m.value;
        return (
          <Button
            key={m.value}
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            variant="ghost"
            size="xs"
            onClick={() => onChange(m.value)}
            className={cn(
              "gap-1.5 font-medium h-[26px] rounded-md px-3 py-1 transition-colors",
              selected
                ? "bg-primary/15 text-primary border border-primary/40 hover:bg-primary/20 hover:text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent"
            )}
          >
            {m.icon}
            {m.label}
          </Button>
        );
      })}
    </div>
  );
}
