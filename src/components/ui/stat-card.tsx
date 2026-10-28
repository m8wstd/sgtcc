import React from "react";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  label: string;
  value: string | number;
  variant?: "blue" | "yellow" | "green" | "red" | "neutral";
  className?: string;
  icon?: React.ReactNode;
}

const variantStyles = {
  blue: "bg-[#8ec5ff] text-[#111a2e]",
  yellow: "bg-[#ffd84d] text-[#111a2e]",
  green: "bg-[#86d994] text-[#111a2e]",
  red: "bg-[#ff7f7f] text-[#111a2e]",
  neutral: "bg-[#d5d9e0] text-[#111a2e]",
};

export function StatCard({ label, value, variant = "neutral", className, icon }: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-[6px] p-4 flex flex-col justify-between transition-transform duration-150 shadow-xs",
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[26px] font-bold leading-tight tracking-tight">{value}</span>
        {icon && <span className="opacity-75">{icon}</span>}
      </div>
      <span className="text-xs font-semibold text-[#111a2e]/90">{label}</span>
    </div>
  );
}
