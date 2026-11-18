"use client";

import React, { useState } from "react";
import { BookOpen, Award } from "lucide-react";
import { OrientadorDashboardClient } from "@/app/dashboard/orientador/orientador-dashboard-client";
import { AvaliadorDashboardClient } from "@/app/dashboard/avaliador/avaliador-dashboard-client";
import type { TccResumo, TccBanca } from "@/lib/data/queries";

interface ProfessorDashboardClientProps {
  nomeProfessor: string;
  tccsOrientados: TccResumo[];
  tccsBanca: TccBanca[];
}

type Aba = "orientacoes" | "banca";

export function ProfessorDashboardClient({
  nomeProfessor,
  tccsOrientados,
  tccsBanca,
}: ProfessorDashboardClientProps) {
  const [abaAtiva, setAbaAtiva] = useState<Aba>("orientacoes");

  return (
    <div className="space-y-0 w-full">
      {/* Cabeçalho com abas */}
      <div className="border-b border-[#dfe2e8] pb-0">
        <div className="pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111a2e]">
              Olá, Prof. {nomeProfessor}
            </h1>
            <p className="text-sm text-[#6b7385] mt-1">
              Painel unificado — gerencie suas orientações e participações em bancas avaliadoras
            </p>
          </div>
        </div>

        {/* Tabs de navegação */}
        <div className="flex gap-0 -mb-px">
          <button
            type="button"
            onClick={() => setAbaAtiva("orientacoes")}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              abaAtiva === "orientacoes"
                ? "border-[#1e78f0] text-[#1e78f0] bg-blue-50/40"
                : "border-transparent text-[#6b7385] hover:text-[#111a2e] hover:border-[#dfe2e8]"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Minhas Orientações</span>
            {tccsOrientados.length > 0 && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  abaAtiva === "orientacoes"
                    ? "bg-[#1e78f0] text-white"
                    : "bg-[#f4f5f7] text-[#6b7385]"
                }`}
              >
                {tccsOrientados.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva("banca")}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              abaAtiva === "banca"
                ? "border-purple-600 text-purple-700 bg-purple-50/40"
                : "border-transparent text-[#6b7385] hover:text-[#111a2e] hover:border-[#dfe2e8]"
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Banca Avaliadora</span>
            {tccsBanca.length > 0 && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  abaAtiva === "banca"
                    ? "bg-purple-600 text-white"
                    : "bg-[#f4f5f7] text-[#6b7385]"
                }`}
              >
                {tccsBanca.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Conteúdo da aba ativa */}
      <div className="pt-6">
        {abaAtiva === "orientacoes" && (
          <OrientadorDashboardClient
            nomeOrientador={nomeProfessor}
            tccs={tccsOrientados}
            ocultarCabecalho
          />
        )}
        {abaAtiva === "banca" && (
          <AvaliadorDashboardClient
            nomeAvaliador={nomeProfessor}
            tccs={tccsBanca}
            ocultarCabecalho
          />
        )}
      </div>
    </div>
  );
}
