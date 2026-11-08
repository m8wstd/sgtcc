import React from "react";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  label: string;
  value: string | number;
  variant?: "primary" | "navy" | "blue" | "yellow" | "green" | "red" | "neutral";
  className?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
}

// Cores originais com leve transparência (70%) e sutil efeito glass equilibrado
const variantStyles = {
  primary: "bg-[#0f1b33] border-[#0f1b33] text-white",
  navy: "bg-[#0f1b33] border-[#0f1b33] text-white",
  blue: "bg-[#8ec5ff]/70 border-[#6daeff]/80 text-[#111a2e]",
  yellow: "bg-[#ffd84d]/70 border-[#f0c52e]/80 text-[#111a2e]",
  green: "bg-[#86d994]/70 border-[#6bc77b]/80 text-[#111a2e]",
  red: "bg-[#ff7f7f]/70 border-[#f46868]/80 text-[#111a2e]",
  neutral: "bg-[#d5d9e0]/70 border-[#c0c5cd]/80 text-[#111a2e]",
};

export function StatCard({
  label,
  value,
  variant = "neutral",
  className,
  icon,
  onClick,
  active,
}: StatCardProps) {
  const isClickable = Boolean(onClick);

  return (
    <div
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      style={{
        boxShadow: active
          ? "0 10px 24px -2px rgba(30, 120, 240, 0.22), 0 0 0 1px rgba(255, 255, 255, 0.6) inset"
          : "0 4px 12px -2px rgba(15, 27, 51, 0.05), 0 0 0 1px rgba(255, 255, 255, 0.45) inset",
      }}
      className={cn(
        "relative rounded-2xl p-3 sm:p-4 flex flex-col justify-between border backdrop-blur-md transition-all duration-200 select-none min-w-0 w-full overflow-hidden",
        variantStyles[variant],
        isClickable &&
          "cursor-pointer hover:scale-[1.02] hover:opacity-95 active:scale-[0.98] focus:outline-none",
        active
          ? "ring-2 ring-[#1e78f0] border-[#1e78f0] scale-[1.02]"
          : "hover:border-slate-400/60",
        className
      )}
    >
      <div className="flex items-center justify-between gap-1 mb-1 sm:mb-1.5 min-w-0">
        <span className="text-xl sm:text-2xl md:text-[28px] font-bold leading-none tracking-tight truncate">
          {value}
        </span>
        {icon && (
          <span
            className={cn(
              "p-1 sm:p-1.5 rounded-lg sm:rounded-xl shadow-2xs transition-colors shrink-0",
              variant === "primary" || variant === "navy"
                ? "bg-white/15 text-white"
                : active
                ? "text-[#1e78f0] bg-white/70"
                : "opacity-85 text-[#111a2e] bg-white/50"
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-1 min-w-0">
        <span
          className={cn(
            "text-[11px] sm:text-xs font-semibold leading-tight line-clamp-2 break-words",
            variant === "primary" || variant === "navy" ? "text-white/90" : "text-[#111a2e]/90"
          )}
        >
          {label}
        </span>
        {active && (
          <span className="w-1.5 h-1.5 rounded-full bg-[#1e78f0] shrink-0 animate-pulse ml-1" />
        )}
      </div>
    </div>
  );
}
