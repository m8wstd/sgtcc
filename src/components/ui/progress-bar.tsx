import React from "react";
import { cn } from "@/lib/utils";

export interface ProgressBarProps {
  value: number; // 0 to 100
  className?: string;
  barClassName?: string;
}

export function ProgressBar({ value, className, barClassName }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={cn("h-[7px] w-full bg-[#dfe2e8] rounded-[4px] overflow-hidden", className)}>
      <div
        className={cn("h-full bg-[#1e78f0] rounded-[4px] transition-all duration-300", barClassName)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
