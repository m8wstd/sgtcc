"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { StatCard } from "@/components/ui/stat-card";
import { StatusPill } from "@/components/ui/status-pill";
import { ROTULO_STATUS_TCC } from "@/components/layout/status";
import type { TccResumo } from "@/lib/data/queries";
import {
  Search,
  ChevronRight,
  Award,
  FileText,
  CheckCircle2,
  Columns3,
  List,
  Clock,
  User,
} from "lucide-react";

interface AvaliadorDashboardClientProps {
  nomeAvaliador: string;
  tccs: TccResumo[];
}

// ── Colunas Kanban da Banca Avaliadora ──────────────────────────────────────
const COLUNAS_KANBAN_BANCA = [
  { key: "Pendente", label: "Pendente", cor: "#aeb5c2", desc: "Aluno ainda não enviou à banca" },
  { key: "Para corrigir", label: "Para corrigir", cor: "#f0c93a", desc: "Enviado e aguardando avaliação" },
  { key: "Em correção", label: "Em correção", cor: "#ff7f7f", desc: "Avaliador corrigindo / com ressalvas" },
  { key: "Concluído", label: "Concluído", cor: "#52b565", desc: "Banca finalizada e aprovada" },
] as const;

type ColunaBancaKey = (typeof COLUNAS_KANBAN_BANCA)[number]["key"];

function mapTccParaColunaBanca(t: TccResumo): ColunaBancaKey {
  if (t.statusGeral === "APROVADO" || t.statusGeral === "DEFENDIDO") {
    return "Concluído";
  }
  if (t.statusGeral === "REPROVADO") {
    return "Em correção";
  }
  if (t.statusGeral === "AGUARDANDO_BANCA") {
    return "Para corrigir";
  }
  // EM_ANDAMENTO
  return "Pendente";
}

export function AvaliadorDashboardClient({ nomeAvaliador, tccs }: AvaliadorDashboardClientProps) {
  const [busca, setBusca] = useState("");
  const [viewMode, setViewMode] = useState<"kanban" | "lista">("kanban");
  const [tabFase, setTabFase] = useState<"todas" | "1" | "2">("todas");

  const stats = useMemo(() => {
    const total = tccs.length;
    const pendente = tccs.filter((t) => mapTccParaColunaBanca(t) === "Pendente").length;
    const paraCorrigir = tccs.filter((t) => mapTccParaColunaBanca(t) === "Para corrigir").length;
    const emCorrecao = tccs.filter((t) => mapTccParaColunaBanca(t) === "Em correção").length;
    const concluidos = tccs.filter((t) => mapTccParaColunaBanca(t) === "Concluído").length;
    return { total, pendente, paraCorrigir, emCorrecao, concluidos };
  }, [tccs]);

  const tccsFiltrados = useMemo(() => {
    return tccs.filter((t) => {
      const matchFase =
        tabFase === "todas"
          ? true
          : tabFase === "1"
          ? t.fase === 1 || !t.fase
          : t.fase === 2;

      const termo = busca.toLowerCase();
      const matchBusca =
        !termo ||
        t.titulo.toLowerCase().includes(termo) ||
        t.alunoNome.toLowerCase().includes(termo) ||
        t.aluno_id.toLowerCase().includes(termo) ||
        t.orientadorNome.toLowerCase().includes(termo);

      return matchFase && matchBusca;
    });
  }, [tccs, tabFase, busca]);

  return (
    <div className="space-y-6 w-full">
      {/* Cabeçalho */}
      <div className="border-b border-[#dfe2e8] pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111a2e]">
          Olá, Prof. {nomeAvaliador}
        </h1>
        <p className="text-sm text-[#6b7385] mt-1">
          Acompanhamento e avaliação direta dos alunos e projetos finais de banca examinadora (TCC 1 e TCC 2)
        </p>
      </div>

      {/* Stats Cards com as métricas da Banca */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          label="Total de Bancas"
          value={stats.total}
          variant="blue"
          icon={<Award className="w-5 h-5" />}
          className="p-5"
        />
        <StatCard
          label="Para Corrigir"
          value={stats.paraCorrigir}
          variant="yellow"
          icon={<FileText className="w-5 h-5" />}
          className="p-5"
        />
        <StatCard
          label="Em Correção"
          value={stats.emCorrecao}
          variant="red"
          icon={<Clock className="w-5 h-5" />}
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

      {/* Barra de Controles: Filtro de Fase, Busca e Alternância Kanban / Lista */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Abas TCC 1 vs TCC 2 */}
        <div className="flex items-center gap-1.5 bg-[#f4f5f7] p-1 rounded-lg border border-[#dfe2e8]">
          <span className="text-[11px] font-semibold text-[#6b7385] px-2">Fase:</span>
          <button
            type="button"
            onClick={() => setTabFase("todas")}
            className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
              tabFase === "todas" ? "bg-[#0f1b33] text-white shadow-xs" : "text-[#111a2e] hover:bg-white"
            }`}
          >
            Todas
          </button>
          <button
            type="button"
            onClick={() => setTabFase("1")}
            className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
              tabFase === "1" ? "bg-[#1e78f0] text-white shadow-xs" : "text-[#111a2e] hover:bg-white"
            }`}
          >
            TCC 1
          </button>
          <button
            type="button"
            onClick={() => setTabFase("2")}
            className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
              tabFase === "2" ? "bg-[#1e78f0] text-white shadow-xs" : "text-[#111a2e] hover:bg-white"
            }`}
          >
            TCC 2
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Busca */}
          <div className="relative min-w-[200px] sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#6b7385]" />
            <input
              type="text"
              placeholder="Buscar por aluno ou tema..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#f4f5f7] border border-[#dfe2e8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e78f0] focus:bg-white text-[#111a2e]"
            />
          </div>

          {/* Alternador de Visão */}
          <div className="flex items-center gap-1 bg-[#f4f5f7] p-1 rounded-lg border border-[#dfe2e8]">
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "kanban"
                  ? "bg-white text-[#111a2e] shadow-xs"
                  : "text-[#6b7385] hover:text-[#111a2e]"
              }`}
            >
              <Columns3 className="w-3.5 h-3.5" />
              Kanban
            </button>
            <button
              type="button"
              onClick={() => setViewMode("lista")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "lista"
                  ? "bg-white text-[#111a2e] shadow-xs"
                  : "text-[#6b7385] hover:text-[#111a2e]"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Lista
            </button>
          </div>
        </div>
      </div>

      {/* VISÃO KANBAN: Direto com o Nome dos Alunos e Seus Trabalhos */}
      {viewMode === "kanban" ? (
        <div className="w-full overflow-x-auto pb-4">
          <div className="grid grid-cols-4 gap-4 min-w-[760px]">
            {COLUNAS_KANBAN_BANCA.map((col) => {
              const alunosNaColuna = tccsFiltrados.filter(
                (t) => mapTccParaColunaBanca(t) === col.key
              );

              return (
                <div
                  key={col.key}
                  className="bg-[#f4f5f7] rounded-[12px] p-3.5 border-t-4 flex flex-col gap-3 min-h-[220px] shadow-2xs"
                  style={{ borderTopColor: col.cor }}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-[#111a2e] px-1">
                    <span>{col.label}</span>
                    <span className="bg-white border border-[#dfe2e8] rounded-full px-2 py-0.5 text-[11px] font-bold">
                      {alunosNaColuna.length}
                    </span>
                  </div>

                  {alunosNaColuna.length === 0 ? (
                    <p className="text-xs text-[#6b7385] text-center py-8 italic">
                      Nenhum aluno
                    </p>
                  ) : (
                    alunosNaColuna.map((t) => (
                      <Link
                        key={t.id}
                        href={`/dashboard/tcc/${t.id}`}
                        className="block border border-[#dfe2e8] rounded-[10px] p-3.5 bg-white space-y-2.5 shadow-2xs transition-all hover:border-[#1e78f0] hover:shadow-xs cursor-pointer group text-left"
                      >
                        {/* Nome do Aluno em Destaque */}
                        <div className="flex items-start justify-between gap-1">
                          <div>
                            <b className="text-[13px] font-bold text-[#111a2e] block group-hover:text-[#1e78f0] transition-colors leading-snug">
                              {t.alunoNome}
                            </b>
                            <span className="text-[10.5px] text-[#6b7385]">
                              Matrícula: {t.aluno_id}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-[#1e78f0] bg-blue-50 px-1.5 py-0.5 rounded shrink-0">
                            {t.fase ? `TCC ${t.fase}` : "TCC 1"}
                          </span>
                        </div>

                        {/* Tema do Projeto Final */}
                        <p className="text-[11.5px] text-[#111a2e] font-medium line-clamp-2 leading-relaxed">
                          {t.titulo}
                        </p>

                        {/* Informações do Orientador e Curso */}
                        <div className="pt-2 border-t border-[#f4f5f7] flex justify-between items-center text-[10.5px] text-[#6b7385]">
                          <span className="truncate">Orientador: {t.orientadorNome}</span>
                          {t.curso && <span className="shrink-0 font-medium">&bull; {t.curso}</span>}
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* VISÃO LISTA TRADICIONAL */
        <div className="border border-[#dfe2e8] rounded-[10px] overflow-hidden bg-white shadow-xs">
          <div className="hidden md:grid grid-cols-[1.5fr_2fr_1.2fr_120px_40px] gap-4 px-6 py-3 bg-[#f4f5f7] border-b border-[#dfe2e8] text-xs font-semibold text-[#6b7385]">
            <span>Aluno</span>
            <span>Tema do Projeto Final</span>
            <span>Orientador</span>
            <span>Status da Banca</span>
            <span className="text-right">Ação</span>
          </div>

          {tccsFiltrados.length === 0 ? (
            <div className="p-10 text-center text-sm text-[#6b7385]">
              Nenhum trabalho de banca encontrado.
            </div>
          ) : (
            <div className="divide-y divide-[#dfe2e8]">
              {tccsFiltrados.map((t) => {
                const statusBanca = mapTccParaColunaBanca(t);

                return (
                  <Link
                    key={t.id}
                    href={`/dashboard/tcc/${t.id}`}
                    className="block p-4 sm:px-6 sm:py-4 hover:bg-[#f4f5f7] transition-colors group"
                  >
                    <div className="hidden md:grid grid-cols-[1.5fr_2fr_1.2fr_120px_40px] gap-4 items-center">
                      <div className="min-w-0">
                        <b className="block text-sm font-semibold text-[#111a2e] truncate group-hover:text-[#1e78f0] transition-colors">
                          {t.alunoNome}
                        </b>
                        <small className="text-xs text-[#6b7385]">Matrícula: {t.aluno_id}</small>
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs text-[#111a2e] font-medium truncate">{t.titulo}</p>
                        <span className="text-[11px] text-[#1e78f0] font-semibold">
                          {t.fase ? `TCC ${t.fase}` : "TCC 1"} {t.curso ? `&bull; ${t.curso}` : ""}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <span className="text-xs text-[#111a2e] block truncate font-medium">{t.orientadorNome}</span>
                        <small className="text-[11px] text-[#6b7385]">Orientador Docente</small>
                      </div>

                      <div>
                        <StatusPill status={statusBanca} />
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
                        <StatusPill status={statusBanca} />
                      </div>
                      <p className="text-xs text-[#111a2e] line-clamp-2">{t.titulo}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
