"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { StatCard } from "@/components/ui/stat-card";
import { StatusPill } from "@/components/ui/status-pill";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ROTULO_STATUS_TCC } from "@/components/layout/status";
import type { TccResumo } from "@/lib/data/queries";
import { Search, ChevronRight, AlertCircle, Users, BookOpen } from "lucide-react";

interface OrientadorDashboardClientProps {
  nomeOrientador: string;
  tccs: TccResumo[];
}

type TabFiltro = "todos" | "EM_ANDAMENTO" | "AGUARDANDO_BANCA" | "APROVADO" | "REPROVADO";
type TabFase = "todas" | "1" | "2";

export function OrientadorDashboardClient({ nomeOrientador, tccs }: OrientadorDashboardClientProps) {
  const [faseAtiva, setFaseAtiva] = useState<TabFase>("todas");
  const [cursoAtivo, setCursoAtivo] = useState<string>("todos");
  const [filtro, setFiltro] = useState<TabFiltro>("todos");
  const [busca, setBusca] = useState("");

  const cursosDisponiveis = useMemo(() => {
    const setC = new Set<string>();
    tccs.forEach((t) => {
      if (t.curso) setC.add(t.curso);
    });
    return Array.from(setC);
  }, [tccs]);

  const stats = useMemo(() => {
    const total = tccs.length;
    const emAndamento = tccs.filter((t) => t.statusGeral === "EM_ANDAMENTO").length;
    const aguardandoBanca = tccs.filter((t) => t.statusGeral === "AGUARDANDO_BANCA").length;
    const aprovados = tccs.filter((t) => t.statusGeral === "APROVADO" || t.statusGeral === "DEFENDIDO").length;
    return { total, emAndamento, aguardandoBanca, aprovados };
  }, [tccs]);

  const tccsFiltrados = useMemo(() => {
    return tccs.filter((t) => {
      const matchFase =
        faseAtiva === "todas"
          ? true
          : faseAtiva === "1"
          ? t.fase === 1 || !t.fase
          : t.fase === 2;
      const matchCurso = cursoAtivo === "todos" ? true : t.curso === cursoAtivo;
      const matchFiltro = filtro === "todos" ? true : t.statusGeral === filtro;
      const termo = busca.toLowerCase();
      const matchBusca =
        !termo ||
        t.titulo.toLowerCase().includes(termo) ||
        t.alunoNome.toLowerCase().includes(termo) ||
        t.aluno_id.toLowerCase().includes(termo);
      return matchFase && matchCurso && matchFiltro && matchBusca;
    });
  }, [tccs, faseAtiva, cursoAtivo, filtro, busca]);

  return (
    <div className="space-y-8 w-full">
      {/* Cabeçalho Padronizado */}
      <div className="border-b border-[#dfe2e8] pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111a2e]">
          Olá, Prof. {nomeOrientador}
        </h1>
        <p className="text-sm text-[#6b7385] mt-1">
          Painel centralizado de gestão e acompanhamento de alunos orientandos no semestre atual
        </p>
      </div>

      {/* Stats Cards Padronizados */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          label="Total de Orientandos"
          value={stats.total}
          variant="blue"
          icon={<Users className="w-5 h-5" />}
          className="p-5"
        />
        <StatCard
          label="Em Andamento"
          value={stats.emAndamento}
          variant="yellow"
          icon={<BookOpen className="w-5 h-5" />}
          className="p-5"
        />
        <StatCard
          label="Aguardando Banca"
          value={stats.aguardandoBanca}
          variant="neutral"
          icon={<AlertCircle className="w-5 h-5" />}
          className="p-5"
        />
        <StatCard
          label="Concluídos / Defendidos"
          value={stats.aprovados}
          variant="green"
          className="p-5"
        />
      </div>

      {/* Abas de Fase (TCC 1 vs TCC 2) e Filtro de Curso do Protótipo */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#f4f5f7] border border-[#dfe2e8]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#6b7385] uppercase tracking-wide mr-1">
            Fase:
          </span>
          <button
            type="button"
            onClick={() => setFaseAtiva("todas")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              faseAtiva === "todas"
                ? "bg-[#0f1b33] text-white shadow-xs"
                : "bg-white text-[#111a2e] border border-[#dfe2e8] hover:bg-slate-50"
            }`}
          >
            Todas as Fases
          </button>
          <button
            type="button"
            onClick={() => setFaseAtiva("1")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              faseAtiva === "1"
                ? "bg-[#1e78f0] text-white shadow-xs"
                : "bg-white text-[#111a2e] border border-[#dfe2e8] hover:bg-slate-50"
            }`}
          >
            TCC 1
          </button>
          <button
            type="button"
            onClick={() => setFaseAtiva("2")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              faseAtiva === "2"
                ? "bg-[#1e78f0] text-white shadow-xs"
                : "bg-white text-[#111a2e] border border-[#dfe2e8] hover:bg-slate-50"
            }`}
          >
            TCC 2
          </button>
        </div>

        {/* Filtro por Curso (protótipo da professora) */}
        {cursosDisponiveis.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#6b7385]">Curso:</span>
            <select
              value={cursoAtivo}
              onChange={(e) => setCursoAtivo(e.target.value)}
              className="text-xs bg-white border border-[#dfe2e8] rounded-lg px-3 py-1.5 font-medium text-[#111a2e] focus:outline-none focus:ring-1 focus:ring-[#1e78f0]"
            >
              <option value="todos">Todos os Cursos</option>
              {cursosDisponiveis.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Controles de Filtro por Status e Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setFiltro("todos")}
            className={`px-4 py-2 rounded-full text-xs sm:text-[13px] border transition-colors cursor-pointer ${
              filtro === "todos"
                ? "bg-[#0f1b33] text-white border-[#0f1b33] font-medium"
                : "border-[#dfe2e8] bg-white text-[#111a2e] hover:bg-[#f4f5f7]"
            }`}
          >
            Todos ({stats.total})
          </button>
          <button
            type="button"
            onClick={() => setFiltro("EM_ANDAMENTO")}
            className={`px-4 py-2 rounded-full text-xs sm:text-[13px] border transition-colors cursor-pointer ${
              filtro === "EM_ANDAMENTO"
                ? "bg-[#0f1b33] text-white border-[#0f1b33] font-medium"
                : "border-[#dfe2e8] bg-white text-[#111a2e] hover:bg-[#f4f5f7]"
            }`}
          >
            Em Andamento ({stats.emAndamento})
          </button>
          <button
            type="button"
            onClick={() => setFiltro("AGUARDANDO_BANCA")}
            className={`px-4 py-2 rounded-full text-xs sm:text-[13px] border transition-colors cursor-pointer ${
              filtro === "AGUARDANDO_BANCA"
                ? "bg-[#0f1b33] text-white border-[#0f1b33] font-medium"
                : "border-[#dfe2e8] bg-white text-[#111a2e] hover:bg-[#f4f5f7]"
            }`}
          >
            Aguardando Banca ({stats.aguardandoBanca})
          </button>
          <button
            type="button"
            onClick={() => setFiltro("APROVADO")}
            className={`px-4 py-2 rounded-full text-xs sm:text-[13px] border transition-colors cursor-pointer ${
              filtro === "APROVADO"
                ? "bg-[#0f1b33] text-white border-[#0f1b33] font-medium"
                : "border-[#dfe2e8] bg-white text-[#111a2e] hover:bg-[#f4f5f7]"
            }`}
          >
            Aprovados ({stats.aprovados})
          </button>
        </div>

        {/* Input de Busca */}
        <div className="relative min-w-[220px] sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#6b7385]" />
          <input
            type="text"
            placeholder="Buscar por aluno ou tema..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#f4f5f7] border border-[#dfe2e8] rounded-full focus:outline-none focus:ring-1 focus:ring-[#1e78f0] focus:bg-white text-[#111a2e]"
          />
        </div>
      </div>

      {/* Lista de Orientandos */}
      <div className="border border-[#dfe2e8] rounded-[10px] overflow-hidden bg-white shadow-xs">
        <div className="hidden md:grid grid-cols-[1.4fr_1.8fr_1fr_120px_40px] gap-4 px-6 py-3 bg-[#f4f5f7] border-b border-[#dfe2e8] text-xs font-semibold text-[#6b7385]">
          <span>Aluno</span>
          <span>Tema / Título</span>
          <span>Progresso</span>
          <span>Status</span>
          <span className="text-right">Ação</span>
        </div>

        {tccsFiltrados.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#6b7385]">
            Nenhum orientando encontrado para o filtro selecionado.
          </div>
        ) : (
          <div className="divide-y divide-[#dfe2e8]">
            {tccsFiltrados.map((t) => {
              const statusRotulo = ROTULO_STATUS_TCC[t.statusGeral] ?? t.statusGeral;
              const estimativaProgresso =
                t.statusGeral === "APROVADO" || t.statusGeral === "DEFENDIDO"
                  ? 100
                  : t.statusGeral === "AGUARDANDO_BANCA"
                  ? 85
                  : 45;

              return (
                <Link
                  key={t.id}
                  href={`/dashboard/tcc/${t.id}`}
                  className="block p-4 sm:px-6 sm:py-4 hover:bg-[#f4f5f7] transition-colors group"
                >
                  <div className="hidden md:grid grid-cols-[1.4fr_1.8fr_1fr_120px_40px] gap-4 items-center">
                    <div className="min-w-0">
                      <b className="block text-sm font-semibold text-[#111a2e] truncate group-hover:text-[#1e78f0] transition-colors">
                        {t.alunoNome}
                      </b>
                      <small className="text-xs text-[#6b7385]">Matrícula: {t.aluno_id}</small>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs text-[#111a2e] font-medium truncate">{t.titulo}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-bold text-[#1e78f0] bg-blue-50 px-1.5 py-0.2 rounded">
                          {t.fase ? `TCC ${t.fase}` : "TCC 1"}
                        </span>
                        {t.curso && (
                          <span className="text-[11px] text-[#6b7385] truncate">
                            &bull; {t.curso}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1 pr-2">
                      <ProgressBar value={estimativaProgresso} className="h-2" />
                      <div className="flex justify-between text-[11px] text-[#6b7385] font-mono">
                        <span>{estimativaProgresso}%</span>
                      </div>
                    </div>

                    <div>
                      <StatusPill status={statusRotulo} />
                    </div>

                    <div className="flex justify-end">
                      <ChevronRight className="w-4 h-4 text-[#6b7385] group-hover:text-[#1e78f0] group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>

                  {/* Visão Mobile */}
                  <div className="flex md:hidden flex-col gap-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <b className="text-sm font-semibold text-[#111a2e] block group-hover:text-[#1e78f0]">
                          {t.alunoNome}
                        </b>
                        <small className="text-xs text-[#6b7385]">Matrícula: {t.aluno_id}</small>
                      </div>
                      <StatusPill status={statusRotulo} />
                    </div>

                    <p className="text-xs text-[#111a2e] line-clamp-2">{t.titulo}</p>

                    <div className="pt-1 space-y-1">
                      <div className="flex justify-between text-[11px] text-[#6b7385]">
                        <span>Progresso estimado</span>
                        <span className="font-semibold">{estimativaProgresso}%</span>
                      </div>
                      <ProgressBar value={estimativaProgresso} className="h-2" />
                    </div>
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
