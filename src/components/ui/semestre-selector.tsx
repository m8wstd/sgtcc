"use client";

import React from "react";
import { Calendar } from "lucide-react";
import { formatarSemestre } from "@/lib/semestre";

interface SemestreSelectorProps {
  semestreAtivo: string;
  semestresDisponiveis: string[];
  onChange: (semestre: string) => void;
  className?: string;
  compacto?: boolean;
}

export function SemestreSelector({
  semestreAtivo,
  semestresDisponiveis,
  onChange,
  className = "",
}: SemestreSelectorProps) {
  if (!semestresDisponiveis.length) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="flex items-center gap-1.5 text-xs font-semibold text-[#6b7385] shrink-0">
        <Calendar className="w-3.5 h-3.5 text-[#1e78f0]" />
        <span>Semestre:</span>
      </span>
      <select
        value={semestreAtivo}
        onChange={(e) => onChange(e.target.value)}
        className="text-xs bg-white border border-[#dfe2e8] rounded-lg px-3 py-1.5 font-medium text-[#111a2e] focus:outline-none focus:ring-1 focus:ring-[#1e78f0] cursor-pointer shadow-2xs"
      >
        {semestresDisponiveis.map((sem) => (
          <option key={sem} value={sem}>
            {formatarSemestre(sem)}
          </option>
        ))}
      </select>
    </div>
  );
}
