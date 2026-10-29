import React from "react";
import { cn } from "@/lib/utils";

export interface StatusPillProps {
  status: string;
  className?: string;
}

export function getStatusVariant(status: string): "green" | "yellow" | "red" | "blue" | "neutral" {
  const s = status.toLowerCase();
  if (
    s.includes("conclu") ||
    s.includes("aprovad") ||
    s.includes("corrigid") ||
    s.includes("enviad")
  ) {
    return "green";
  }
  if (
    s.includes("revis") ||
    s.includes("aguardando revis") ||
    s.includes("para corre") ||
    s.includes("pronta")
  ) {
    return "yellow";
  }
  if (
    s.includes("atrasad") ||
    s.includes("reprovad") ||
    s.includes("solicitada") ||
    s.includes("em corre") ||
    s.includes("erro") ||
    s.includes("problema")
  ) {
    return "red";
  }
  if (s.includes("andamento") || s.includes("banca") || s.includes("defendid")) {
    return "blue";
  }
  return "neutral";
}

const pillVariantStyles = {
  green: "bg-[#86d994] text-[#111a2e]",
  yellow: "bg-[#ffd84d] text-[#111a2e]",
  red: "bg-[#ff7f7f] text-[#111a2e]",
  blue: "bg-[#8ec5ff] text-[#111a2e]",
  neutral: "bg-[#d5d9e0] text-[#111a2e]",
};

export function StatusPill({ status, className }: StatusPillProps) {
  const variant = getStatusVariant(status);
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center px-3 py-1 rounded-tl-[5px] rounded-br-[5px] rounded-tr-[10px] rounded-bl-[10px] text-[11px] font-semibold text-[#111a2e] whitespace-nowrap tracking-tight shadow-xs",
        pillVariantStyles[variant],
        className
      )}
    >
      {status}
    </span>
  );
}
