"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { StatCard } from "@/components/ui/stat-card";
import { StatusPill } from "@/components/ui/status-pill";
import { SemestreSelector } from "@/components/ui/semestre-selector";
import { semestreAtual, derivarSemestreTcc, normalizarSemestre, compararSemestres } from "@/lib/semestre";
import { ROTULO_STATUS_TCC } from "@/components/layout/status";
import type { TccResumo } from "@/lib/data/queries";
import {
  Search,
  ChevronRight,
  AlertCircle,
  Users,
  BookOpen,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
} from "lucide-react";

interface OrientadorDashboardClientProps {
  nomeOrientador: string;
  tccs: TccResumo[];
  /** Quando usado como aba dentro do ProfessorDashboard, oculta o h1 próprio */
  ocultarCabecalho?: boolean;
}

type TabFase = "todas" | "1" | "2";

// ── 3 Colunas Solicitadas para o Painel do Orientador ────────────────────────
const COLUNAS_ORIENTADOR = [
  {
    key: "Pendente",
    label: "Pendente",
    cor: "#aeb5c2",
    desc: "Alunos sem entrega (pendente ou fazendo)",
  },
  {
    key: "Em revisão",
    label: "Em revisão",
    cor: "#f0c93a",
    desc: "Alunos que entregaram (em análise ou correção)",
  },
  {
    key: "Concluído",
    label: "Concluído",
    cor: "#52b565",
    desc: "Alunos que concluíram 100% do TCC em que participam",
  },
] as const;

type ColunaOrientadorKey = (typeof COLUNAS_ORIENTADOR)[number]["key"];

/**
 * Regra Solicitada:
 * - Pendente: alunos sem entrega [pendente ou fazendo] (EM_ANDAMENTO inicial)
 * - Em revisão: alunos que entregaram, que o professor esteja ou não corrigindo (AGUARDANDO_BANCA ou submissões ativas)
 * - Concluído: alunos que já concluíram 100% do TCC que participam (TCC 1 ou TCC 2) (APROVADO ou DEFENDIDO)
 */
function mapAlunoParaColunaOrientador(t: TccResumo): ColunaOrientadorKey {
  if (t.statusGeral === "APROVADO" || t.statusGeral === "DEFENDIDO") {
    return "Concluído";
  }
  if (t.statusGeral === "AGUARDANDO_BANCA") {
    return "Em revisão";
  }
  // Se for EM_ANDAMENTO, verificamos se há indicação de revisão ou pendente
  return "Pendente";
}

export function OrientadorDashboardClient({ nomeOrientador, tccs, ocultarCabecalho }: OrientadorDashboardClientProps) {
  // Lista de semestres disponíveis a partir dos TCCs do orientador (sempre incluindo o semestre atual)
  const semestresDisponiveis = useMemo(() => {
    const setS = new Set<string>();
    setS.add(semestreAtual());
    tccs.forEach((t) => {
      setS.add(derivarSemestreTcc(t));
    });
    return Array.from(setS).sort(compararSemestres);
  }, [tccs]);

  const [semestreAtivo, setSemestreAtivo] = useState<string>(semestreAtual());
  const [faseAtiva, setFaseAtiva] = useState<TabFase>("todas");
  const [cursoAtivo, setCursoAtivo] = useState<string>("todos");
  const [statusAtivo, setStatusAtivo] = useState<"todos" | "Pendente" | "Em revisão" | "Concluído">("todos");
  const [busca, setBusca] = useState("");
  const [exibirPendente, setExibirPendente] = useState(true);
  const [exibirConcluido, setExibirConcluido] = useState(false);

  // TCCs pertencentes ao semestre ativo selecionado
  const tccsDoSemestre = useMemo(() => {
    return tccs.filter((t) => derivarSemestreTcc(t) === semestreAtivo);
  }, [tccs, semestreAtivo]);

  const cursosDisponiveis = useMemo(() => {
    const setC = new Set<string>();
    tccsDoSemestre.forEach((t) => {
      if (t.curso) setC.add(t.curso);
    });
    return Array.from(setC);
  }, [tccsDoSemestre]);

  const stats = useMemo(() => {
    const total = tccsDoSemestre.length;
    const pendente = tccsDoSemestre.filter((t) => mapAlunoParaColunaOrientador(t) === "Pendente").length;
    const emRevisao = tccsDoSemestre.filter((t) => mapAlunoParaColunaOrientador(t) === "Em revisão").length;
    const concluidos = tccsDoSemestre.filter((t) => mapAlunoParaColunaOrientador(t) === "Concluído").length;
    return { total, pendente, emRevisao, concluidos };
  }, [tccsDoSemestre]);

  const tccsFiltrados = useMemo(() => {
    return tccsDoSemestre.filter((t) => {
      const matchFase =
        faseAtiva === "todas"
          ? true
          : faseAtiva === "1"
          ? t.fase === 1 || !t.fase
          : t.fase === 2;
      const matchCurso = cursoAtivo === "todos" ? true : t.curso === cursoAtivo;
      const col = mapAlunoParaColunaOrientador(t);
      const matchStatus = statusAtivo === "todos" ? true : col === statusAtivo;
      const termo = busca.toLowerCase();
      const matchBusca =
        !termo ||
        t.titulo.toLowerCase().includes(termo) ||
        t.alunoNome.toLowerCase().includes(termo) ||
        t.aluno_id.toLowerCase().includes(termo);

      return matchFase && matchCurso && matchStatus && matchBusca;
    });
  }, [tccsDoSemestre, faseAtiva, cursoAtivo, statusAtivo, busca]);

  return (
    <div className="space-y-6 w-full">
      {/* Cabeçalho — oculto quando usado como aba no painel unificado */}
      {!ocultarCabecalho && (
        <div className="mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111a2e]">
            Painel de Orientações
          </h1>
          <p className="text-sm text-[#6b7385] mt-1">
            Acompanhamento dos seus orientandos por status de entrega no semestre selecionado
          </p>
        </div>
      )}
      <div className={`flex justify-end pb-4 ${!ocultarCabecalho ? "border-b border-[#dfe2e8] mb-6" : "mb-4"}`}>
        <SemestreSelector
          semestreAtivo={semestreAtivo}
          semestresDisponiveis={semestresDisponiveis}
          onChange={setSemestreAtivo}
        />
      </div>

      {/* Stats Cards com as 3 métricas principais e atalhos de filtro */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          label="Total de Orientandos"
          value={stats.total}
          variant="primary"
          icon={<Users className="w-5 h-5" />}
          className="p-5"
          onClick={() => setStatusAtivo("todos")}
          active={statusAtivo === "todos"}
        />
        <StatCard
          label="Pendente (Sem Entrega)"
          value={stats.pendente}
          variant="neutral"
          icon={<Clock className="w-5 h-5" />}
          className="p-5"
          onClick={() => setStatusAtivo(statusAtivo === "Pendente" ? "todos" : "Pendente")}
          active={statusAtivo === "Pendente"}
        />
        <StatCard
          label="Em Revisão"
          value={stats.emRevisao}
          variant="yellow"
          icon={<BookOpen className="w-5 h-5" />}
          className="p-5"
          onClick={() => setStatusAtivo(statusAtivo === "Em revisão" ? "todos" : "Em revisão")}
          active={statusAtivo === "Em revisão"}
        />
        <StatCard
          label="TCCs Concluídos"
          value={stats.concluidos}
          variant="green"
          icon={<CheckCircle2 className="w-5 h-5" />}
          className="p-5"
          onClick={() => setStatusAtivo(statusAtivo === "Concluído" ? "todos" : "Concluído")}
          active={statusAtivo === "Concluído"}
        />
      </div>

      {/* Controles: Fase, Curso, Busca e Alternância Kanban */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Abas TCC 1 vs TCC 2 */}
          <div className="flex items-center gap-1 bg-[#f4f5f7] p-1 rounded-lg border border-[#dfe2e8]">
            <button
              type="button"
              onClick={() => setFaseAtiva("todas")}
              className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                faseAtiva === "todas" ? "bg-[#0f1b33] text-white shadow-xs" : "text-[#111a2e] hover:bg-white"
              }`}
            >
              Todas as Fases
            </button>
            <button
              type="button"
              onClick={() => setFaseAtiva("1")}
              className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                faseAtiva === "1" ? "bg-[#1e78f0] text-white shadow-xs" : "text-[#111a2e] hover:bg-white"
              }`}
            >
              TCC 1
            </button>
            <button
              type="button"
              onClick={() => setFaseAtiva("2")}
              className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                faseAtiva === "2" ? "bg-[#1e78f0] text-white shadow-xs" : "text-[#111a2e] hover:bg-white"
              }`}
            >
              TCC 2
            </button>
          </div>

          {/* Filtro por Curso */}
          {cursosDisponiveis.length > 0 && (
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
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Busca */}
          <div className="relative flex-1 sm:w-64 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#6b7385]" />
            <input
              type="text"
              placeholder="Buscar por aluno ou tema..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#f4f5f7] border border-[#dfe2e8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e78f0] focus:bg-white text-[#111a2e]"
            />
          </div>

          {/* Alternador de Visão de Colunas */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setExibirPendente((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                exibirPendente
                  ? "bg-[#d5d9e0] text-[#111a2e] border-[#c0c5cd]"
                  : "bg-white text-[#6b7385] border-[#dfe2e8] hover:text-[#111a2e]"
              }`}
            >
              {exibirPendente ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>Pendentes ({stats.pendente})</span>
            </button>

            <button
              type="button"
              onClick={() => setExibirConcluido((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                exibirConcluido
                  ? "bg-[#86d994] text-[#111a2e] border-[#6bc77b]"
                  : "bg-white text-[#6b7385] border-[#dfe2e8] hover:text-[#111a2e]"
              }`}
            >
              {exibirConcluido ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>Concluídos ({stats.concluidos})</span>
            </button>
          </div>
        </div>
      </div>

      {/* KANBAN DO ORIENTADOR: Totalmente responsivo no mobile (grid de 1 coluna em mobile, 2 em tablet e 3 em desktop) */}
      <div className="w-full pb-4">
        <div
          className={`grid gap-4 w-full grid-cols-1 sm:grid-cols-2 ${
            exibirPendente && exibirConcluido
              ? "lg:grid-cols-3"
              : exibirPendente || exibirConcluido
              ? "lg:grid-cols-2"
              : "lg:grid-cols-1"
          }`}
        >
            {COLUNAS_ORIENTADOR
              .filter((col) => {
                if (col.key === "Pendente" && !exibirPendente) return false;
                if (col.key === "Concluído" && !exibirConcluido) return false;
                return true;
              })
              .map((col) => {
                const alunosNaColuna = tccsFiltrados.filter(
                  (t) => mapAlunoParaColunaOrientador(t) === col.key
                );

              return (
                <div
                  key={col.key}
                  className="bg-[#f4f5f7] rounded-[12px] p-3.5 border-t-4 flex flex-col gap-3 min-h-[240px] shadow-2xs"
                  style={{ borderTopColor: col.cor }}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-[#111a2e] px-1">
                    <span>{col.label}</span>
                    <span className="bg-white border border-[#dfe2e8] rounded-full px-2 py-0.5 text-[11px] font-bold">
                      {alunosNaColuna.length}
                    </span>
                  </div>

                  {alunosNaColuna.length === 0 ? (
                    <p className="text-xs text-[#6b7385] text-center py-10 italic">
                      Nenhum aluno
                    </p>
                  ) : (
                    alunosNaColuna.map((t) => (
                      <Link
                        key={t.id}
                        href={`/dashboard/tcc/${t.id}`}
                        className="block border border-[#dfe2e8] rounded-[10px] p-3.5 bg-white space-y-2.5 shadow-2xs transition-all hover:border-[#1e78f0] hover:shadow-xs cursor-pointer group text-left"
                      >
                        {/* Nome do Aluno */}
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

                        {/* Tema do TCC */}
                        <p className="text-[11.5px] text-[#111a2e] font-medium line-clamp-2 leading-relaxed">
                          {t.titulo}
                        </p>

                        {/* Rodapé do Card */}
                        <div className="pt-2 border-t border-[#f4f5f7] flex justify-between items-center text-[10.5px] text-[#6b7385]">
                          <span>{t.curso ?? "Graduação"}</span>
                          <span className="font-semibold text-[#1e78f0]">Ver Etapas &rarr;</span>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </div>
    </div>
  );
}
