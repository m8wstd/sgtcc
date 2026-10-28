"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { StatCard } from "@/components/ui/stat-card";
import { StatusPill } from "@/components/ui/status-pill";
import { ROTULO_STATUS_TCC } from "@/components/layout/status";
import type { TccResumo } from "@/lib/data/queries";
import { Search, ChevronRight, Award, FileText, CheckCircle2 } from "lucide-react";

interface AvaliadorDashboardClientProps {
  nomeAvaliador: string;
  tccs: TccResumo[];
}

export function AvaliadorDashboardClient({ nomeAvaliador, tccs }: AvaliadorDashboardClientProps) {
  const [busca, setBusca] = useState("");
  const [tab, setTab] = useState<"todos" | "AGUARDANDO_BANCA" | "DEFENDIDO">("todos");

  const stats = useMemo(() => {
    const total = tccs.length;
    const paraAvaliar = tccs.filter((t) => t.statusGeral === "AGUARDANDO_BANCA" || t.statusGeral === "EM_ANDAMENTO").length;
    const concluidos = tccs.filter((t) => t.statusGeral === "APROVADO" || t.statusGeral === "DEFENDIDO").length;
    return { total, paraAvaliar, concluidos };
  }, [tccs]);

  const tccsFiltrados = useMemo(() => {
    return tccs.filter((t) => {
      const matchTab =
        tab === "todos"
          ? true
          : tab === "AGUARDANDO_BANCA"
          ? t.statusGeral === "AGUARDANDO_BANCA" || t.statusGeral === "EM_ANDAMENTO"
          : t.statusGeral === "APROVADO" || t.statusGeral === "DEFENDIDO";

      const termo = busca.toLowerCase();
      const matchBusca =
        !termo ||
        t.titulo.toLowerCase().includes(termo) ||
        t.alunoNome.toLowerCase().includes(termo) ||
        t.orientadorNome.toLowerCase().includes(termo);

      return matchTab && matchBusca;
    });
  }, [tccs, tab, busca]);

  return (
    <div className="space-y-8 w-full">
      {/* Cabeçalho Padronizado */}
      <div className="border-b border-[#dfe2e8] pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111a2e]">
          Olá, Prof. {nomeAvaliador}
        </h1>
        <p className="text-sm text-[#6b7385] mt-1">
          Painel centralizado de avaliação de bancas de TCC e monografias atribuídas a você
        </p>
      </div>

      {/* Stats Cards Padronizados */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-5">
        <StatCard
          label="Total de Bancas"
          value={stats.total}
          variant="blue"
          icon={<Award className="w-5 h-5" />}
          className="p-5"
        />
        <StatCard
          label="Prontos para Avaliar"
          value={stats.paraAvaliar}
          variant="yellow"
          icon={<FileText className="w-5 h-5" />}
          className="p-5"
        />
        <StatCard
          label="Bancas Concluídas"
          value={stats.concluidos}
          variant="green"
          icon={<CheckCircle2 className="w-5 h-5" />}
          className="p-5"
        />
      </div>

      {/* Controles de Filtro e Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setTab("todos")}
            className={`px-4 py-2 rounded-full text-xs sm:text-[13px] border transition-colors cursor-pointer ${
              tab === "todos"
                ? "bg-[#0f1b33] text-white border-[#0f1b33] font-medium"
                : "border-[#dfe2e8] bg-white text-[#111a2e] hover:bg-[#f4f5f7]"
            }`}
          >
            Todas as Bancas ({stats.total})
          </button>
          <button
            type="button"
            onClick={() => setTab("AGUARDANDO_BANCA")}
            className={`px-4 py-2 rounded-full text-xs sm:text-[13px] border transition-colors cursor-pointer ${
              tab === "AGUARDANDO_BANCA"
                ? "bg-[#0f1b33] text-white border-[#0f1b33] font-medium"
                : "border-[#dfe2e8] bg-white text-[#111a2e] hover:bg-[#f4f5f7]"
            }`}
          >
            Prontos / Em Aberto ({stats.paraAvaliar})
          </button>
          <button
            type="button"
            onClick={() => setTab("DEFENDIDO")}
            className={`px-4 py-2 rounded-full text-xs sm:text-[13px] border transition-colors cursor-pointer ${
              tab === "DEFENDIDO"
                ? "bg-[#0f1b33] text-white border-[#0f1b33] font-medium"
                : "border-[#dfe2e8] bg-white text-[#111a2e] hover:bg-[#f4f5f7]"
            }`}
          >
            Finalizados ({stats.concluidos})
          </button>
        </div>

        <div className="relative min-w-[220px] sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#6b7385]" />
          <input
            type="text"
            placeholder="Buscar por aluno, tema ou orientador..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#f4f5f7] border border-[#dfe2e8] rounded-full focus:outline-none focus:ring-1 focus:ring-[#1e78f0] focus:bg-white text-[#111a2e]"
          />
        </div>
      </div>

      {/* Lista de Trabalhos para Avaliação */}
      <div className="border border-[#dfe2e8] rounded-[10px] overflow-hidden bg-white shadow-xs">
        <div className="hidden md:grid grid-cols-[1.5fr_2fr_1.2fr_110px_40px] gap-4 px-6 py-3 bg-[#f4f5f7] border-b border-[#dfe2e8] text-xs font-semibold text-[#6b7385]">
          <span>Aluno</span>
          <span>Tema do TCC</span>
          <span>Orientador</span>
          <span>Status</span>
          <span className="text-right">Ação</span>
        </div>

        {tccsFiltrados.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#6b7385]">
            Nenhum trabalho de banca encontrado.
          </div>
        ) : (
          <div className="divide-y divide-[#dfe2e8]">
            {tccsFiltrados.map((t) => {
              const statusRotulo = ROTULO_STATUS_TCC[t.statusGeral] ?? t.statusGeral;

              return (
                <Link
                  key={t.id}
                  href={`/dashboard/tcc/${t.id}`}
                  className="block p-4 sm:px-6 sm:py-4 hover:bg-[#f4f5f7] transition-colors group"
                >
                  <div className="hidden md:grid grid-cols-[1.5fr_2fr_1.2fr_110px_40px] gap-4 items-center">
                    <div className="min-w-0">
                      <b className="block text-sm font-semibold text-[#111a2e] truncate group-hover:text-[#1e78f0] transition-colors">
                        {t.alunoNome}
                      </b>
                      <small className="text-xs text-[#6b7385]">Matrícula: {t.aluno_id}</small>
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs text-[#111a2e] font-medium truncate">{t.titulo}</p>
                      <span className="text-[11px] text-[#6b7385]">Versão de Avaliação</span>
                    </div>

                    <div className="min-w-0">
                      <span className="text-xs text-[#111a2e] block truncate font-medium">{t.orientadorNome}</span>
                      <small className="text-[11px] text-[#6b7385]">Orientador Docente</small>
                    </div>

                    <div>
                      <StatusPill status={statusRotulo} />
                    </div>

                    <div className="flex justify-end">
                      <ChevronRight className="w-4 h-4 text-[#6b7385] group-hover:text-[#1e78f0] group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>

                  <div className="flex md:hidden flex-col gap-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <b className="text-sm font-semibold text-[#111a2e] block group-hover:text-[#1e78f0]">
                          {t.alunoNome}
                        </b>
                        <small className="text-xs text-[#6b7385]">Orientador: {t.orientadorNome}</small>
                      </div>
                      <StatusPill status={statusRotulo} />
                    </div>
                    <p className="text-xs text-[#111a2e] line-clamp-2">{t.titulo}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
