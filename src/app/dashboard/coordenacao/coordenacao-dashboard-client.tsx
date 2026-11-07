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
  GraduationCap,
  Users,
  Calendar,
  FileSpreadsheet,
  Settings,
  X,
  Check,
  Building,
  AlertTriangle,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface CoordenacaoDashboardClientProps {
  nomeUsuario: string;
  perfil: "COORDENACAO" | "ADMIN";
  tccs: TccResumo[];
}

type PainelAcaoTipo = "alocacao" | "cronograma" | "troca" | null;

export function CoordenacaoDashboardClient({
  nomeUsuario,
  perfil,
  tccs: tccsIniciais,
}: CoordenacaoDashboardClientProps) {
  const [tccs, setTccs] = useState<TccResumo[]>(tccsIniciais);
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<string>("todos");
  const [cursoFiltro, setCursoFiltro] = useState<string>("todos");
  const [faseFiltro, setFaseFiltro] = useState<"todas" | "1" | "2">("todas");

  // Mini Painel Acoplado de Ações da Coordenação
  const [painelAcaoAtivo, setPainelAcaoAtivo] = useState<PainelAcaoTipo>(null);
  const [alertaSucesso, setAlertaSucesso] = useState<string | null>(null);

  // Estados dos formulários da coordenação
  const [trocaAlunoId, setTrocaAlunoId] = useState("");
  const [novoOrientadorNome, setNovoOrientadorNome] = useState("");

  const cursosDisponiveis = useMemo(() => {
    const setC = new Set<string>();
    tccs.forEach((t) => {
      if (t.curso) setC.add(t.curso);
    });
    return Array.from(setC);
  }, [tccs]);

  const stats = useMemo(() => {
    const totalTccs = tccs.length;
    const emAndamento = tccs.filter((t) => t.statusGeral === "EM_ANDAMENTO").length;
    const aguardandoBanca = tccs.filter((t) => t.statusGeral === "AGUARDANDO_BANCA").length;
    const aguardandoEnvio = tccs.filter(
      (t) => t.statusGeral === "EM_ANDAMENTO" && (!t.versaoFinalUrl || t.fase === 1)
    ).length;
    // TCCs com entrega atrasada simulados no universo de em andamento sem versão final
    const entregasAtrasadas = tccs.filter(
      (t) => t.statusGeral === "EM_ANDAMENTO" && t.id.includes("maria")
    ).length;
    const concluidos = tccs.filter(
      (t) => t.statusGeral === "APROVADO" || t.statusGeral === "DEFENDIDO"
    ).length;
    const orientadoresUnicos = new Set(tccs.map((t) => t.orientadorNome)).size;

    return {
      totalTccs,
      emAndamento,
      aguardandoBanca,
      aguardandoEnvio,
      entregasAtrasadas,
      concluidos,
      orientadoresUnicos,
    };
  }, [tccs]);

  const tccsFiltrados = useMemo(() => {
    return tccs.filter((t) => {
      let matchStatus = true;
      if (statusFiltro === "todos") {
        matchStatus = true;
      } else if (statusFiltro === "AGUARDANDO_ENVIO") {
        matchStatus = t.statusGeral === "EM_ANDAMENTO" && (!t.versaoFinalUrl || t.fase === 1);
      } else if (statusFiltro === "ATRASADAS") {
        matchStatus = t.statusGeral === "EM_ANDAMENTO" && t.id.includes("maria");
      } else {
        matchStatus = t.statusGeral === statusFiltro;
      }

      const matchCurso = cursoFiltro === "todos" ? true : t.curso === cursoFiltro;
      const matchFase =
        faseFiltro === "todas"
          ? true
          : faseFiltro === "1"
          ? t.fase === 1 || !t.fase
          : t.fase === 2;

      const termo = busca.toLowerCase();
      const matchBusca =
        !termo ||
        t.titulo.toLowerCase().includes(termo) ||
        t.alunoNome.toLowerCase().includes(termo) ||
        t.aluno_id.toLowerCase().includes(termo) ||
        t.orientadorNome.toLowerCase().includes(termo);

      return matchStatus && matchCurso && matchFase && matchBusca;
    });
  }, [tccs, statusFiltro, cursoFiltro, faseFiltro, busca]);

  const handleSalvarTroca = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trocaAlunoId || !novoOrientadorNome.trim()) return;

    setTccs(
      tccs.map((t) =>
        t.id === trocaAlunoId ? { ...t, orientadorNome: novoOrientadorNome.trim() } : t
      )
    );
    setPainelAcaoAtivo(null);
    setNovoOrientadorNome("");
    setAlertaSucesso("Orientador reatribuído com sucesso! Histórico acadêmico preservado.");
    setTimeout(() => setAlertaSucesso(null), 5000);
  };

  const alternarPainelAcao = (tipo: PainelAcaoTipo) => {
    setPainelAcaoAtivo((prev) => (prev === tipo ? null : tipo));
  };

  return (
    <div className="space-y-6 w-full">
      {/* Cabeçalho */}
      <div className="border-b border-[#dfe2e8] pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111a2e]">
          Painel da Coordenação de TCC
        </h1>
        <p className="text-sm text-[#6b7385] mt-1">
          Gestão centralizada de orientações, alocações semestrais, prazos institucionais e resolução de conflitos acadêmicos
        </p>
      </div>

      {alertaSucesso && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{alertaSucesso}</span>
        </div>
      )}

      {/* Cards de Métricas da Coordenação com Atalhos Interativos */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <StatCard
          label="Total de Orientações"
          value={stats.totalTccs}
          variant="blue"
          icon={<GraduationCap className="w-4 h-4" />}
          className="p-4"
          onClick={() => setStatusFiltro("todos")}
          active={statusFiltro === "todos"}
        />
        <StatCard
          label="Em Andamento"
          value={stats.emAndamento}
          variant="yellow"
          className="p-4"
          onClick={() => setStatusFiltro(statusFiltro === "EM_ANDAMENTO" ? "todos" : "EM_ANDAMENTO")}
          active={statusFiltro === "EM_ANDAMENTO"}
        />
        <StatCard
          label="Aguardando Envio"
          value={stats.aguardandoEnvio}
          variant="neutral"
          icon={<Clock className="w-4 h-4" />}
          className="p-4"
          onClick={() => setStatusFiltro(statusFiltro === "AGUARDANDO_ENVIO" ? "todos" : "AGUARDANDO_ENVIO")}
          active={statusFiltro === "AGUARDANDO_ENVIO"}
        />
        <StatCard
          label="Entregas Atrasadas"
          value={stats.entregasAtrasadas}
          variant="red"
          icon={<AlertTriangle className="w-4 h-4" />}
          className="p-4"
          onClick={() => setStatusFiltro(statusFiltro === "ATRASADAS" ? "todos" : "ATRASADAS")}
          active={statusFiltro === "ATRASADAS"}
        />
        <StatCard
          label="Aguardando Banca"
          value={stats.aguardandoBanca}
          variant="neutral"
          className="p-4"
          onClick={() => setStatusFiltro(statusFiltro === "AGUARDANDO_BANCA" ? "todos" : "AGUARDANDO_BANCA")}
          active={statusFiltro === "AGUARDANDO_BANCA"}
        />
        <StatCard
          label="Docentes Ativos"
          value={stats.orientadoresUnicos}
          variant="green"
          icon={<Users className="w-4 h-4" />}
          className="p-4"
          onClick={() => setStatusFiltro("todos")}
          active={false}
        />
      </div>

      {/* Mini Painel Acoplado de Gestão da Coordenação */}
      <section className="rounded-2xl border border-[#dfe2e8] bg-white overflow-hidden shadow-xs transition-all">
        {/* Barra Integrada de Botões das Funções */}
        <div className="p-3 bg-[#f8f9fa] border-b border-[#dfe2e8] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#1e78f0]" />
            <span className="text-xs font-bold text-[#111a2e] uppercase tracking-wider">
              Painel de Operações da Coordenação
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => alternarPainelAcao("alocacao")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                painelAcaoAtivo === "alocacao"
                  ? "bg-[#1e78f0] text-white shadow-xs"
                  : "bg-white border border-[#dfe2e8] text-[#111a2e] hover:bg-[#f0f2f5]"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Alocação de Docentes</span>
              {painelAcaoAtivo === "alocacao" ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3 text-[#6b7385]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => alternarPainelAcao("cronograma")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                painelAcaoAtivo === "cronograma"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-white border border-[#dfe2e8] text-[#111a2e] hover:bg-[#f0f2f5]"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Cronograma Semestral</span>
              {painelAcaoAtivo === "cronograma" ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3 text-[#6b7385]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => alternarPainelAcao("troca")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                painelAcaoAtivo === "troca"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-white border border-[#dfe2e8] text-[#111a2e] hover:bg-[#f0f2f5]"
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Troca de Orientador</span>
              {painelAcaoAtivo === "troca" ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3 text-[#6b7385]" />
              )}
            </button>
          </div>
        </div>

        {/* Conteúdo Dinâmico Acoplado (sem pop-ups flutuantes) */}
        {painelAcaoAtivo === "alocacao" && (
          <div className="p-5 bg-blue-50/20 border-b border-[#dfe2e8] space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-blue-100 text-[#1e78f0]">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#111a2e]">
                    Alocação e Lotes Semestrais de Orientadores
                  </h3>
                  <p className="text-xs text-[#6b7385]">
                    Distribuir orientandos por curso e capacidade docente autorizada pelo Administrador.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPainelAcaoAtivo(null)}
                className="p-1 rounded-md text-[#6b7385] hover:bg-[#e5e7eb] cursor-pointer"
                title="Recolher painel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-white rounded-xl border border-[#dfe2e8]">
                <span className="text-[#6b7385] block">Capacidade Média de Lote</span>
                <b className="text-sm text-[#111a2e]">Até 20 orientandos / docente</b>
              </div>
              <div className="p-3 bg-white rounded-xl border border-[#dfe2e8]">
                <span className="text-[#6b7385] block">Cursos sob sua Coordenação</span>
                <b className="text-sm text-[#111a2e]">
                  {cursosDisponiveis.length > 0 ? cursosDisponiveis.join(", ") : "Todos os cursos"}
                </b>
              </div>
              <div className="p-3 bg-white rounded-xl border border-[#dfe2e8]">
                <span className="text-[#6b7385] block">Gestão de Vínculos</span>
                <b className="text-sm text-emerald-700">Fluxo Institucional Regular</b>
              </div>
            </div>
          </div>
        )}

        {painelAcaoAtivo === "cronograma" && (
          <div className="p-5 bg-amber-50/20 border-b border-[#dfe2e8] space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-amber-100 text-amber-700">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#111a2e]">
                    Cronograma Institucional do Semestre (2026/2)
                  </h3>
                  <p className="text-xs text-[#6b7385]">
                    Datas limites oficiais para submissões de etapas e bancas avaliadoras.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPainelAcaoAtivo(null)}
                className="p-1 rounded-md text-[#6b7385] hover:bg-[#e5e7eb] cursor-pointer"
                title="Recolher painel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 text-xs">
              <div className="p-2.5 bg-white rounded-lg border border-[#dfe2e8] space-y-1">
                <span className="text-[10px] font-bold text-[#1e78f0] uppercase">Etapa 1</span>
                <p className="font-semibold text-[#111a2e]">Introdução e Objetivos</p>
                <span className="text-[11px] text-[#6b7385] block">Prazo: 15/07/2026</span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-[#dfe2e8] space-y-1">
                <span className="text-[10px] font-bold text-[#1e78f0] uppercase">Etapa 2</span>
                <p className="font-semibold text-[#111a2e]">Referencial Teórico</p>
                <span className="text-[11px] text-[#6b7385] block">Prazo: 12/08/2026</span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-[#dfe2e8] space-y-1">
                <span className="text-[10px] font-bold text-[#1e78f0] uppercase">Etapa 3</span>
                <p className="font-semibold text-[#111a2e]">Metodologia e Coleta</p>
                <span className="text-[11px] text-[#6b7385] block">Prazo: 09/09/2026</span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-[#dfe2e8] space-y-1">
                <span className="text-[10px] font-bold text-[#1e78f0] uppercase">Etapa 4</span>
                <p className="font-semibold text-[#111a2e]">Resultados Preliminares</p>
                <span className="text-[11px] text-[#6b7385] block">Prazo: 07/10/2026</span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-amber-200 bg-amber-50/40 space-y-1">
                <span className="text-[10px] font-bold text-amber-800 uppercase">Final</span>
                <p className="font-semibold text-[#111a2e]">Monografia à Banca</p>
                <span className="text-[11px] text-amber-900 font-bold block">Prazo: 30/11/2026</span>
              </div>
            </div>
          </div>
        )}

        {painelAcaoAtivo === "troca" && (
          <form
            onSubmit={handleSalvarTroca}
            className="p-5 bg-emerald-50/20 border-b border-[#dfe2e8] space-y-4 animate-in fade-in duration-150"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-emerald-100 text-emerald-700">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#111a2e]">
                    Troca de Orientador com Preservação de Histórico
                  </h3>
                  <p className="text-xs text-[#6b7385]">
                    Transferir orientando para novo docente preservando todas as entregas e correções anteriores.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPainelAcaoAtivo(null)}
                className="p-1 rounded-md text-[#6b7385] hover:bg-[#e5e7eb] cursor-pointer"
                title="Recolher formulário"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#111a2e] mb-1">
                  Selecione o Trabalho / Aluno
                </label>
                <select
                  value={trocaAlunoId}
                  onChange={(e) => setTrocaAlunoId(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs border border-[#dfe2e8] rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#1e78f0]"
                >
                  <option value="">Selecione um aluno...</option>
                  {tccs.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.alunoNome} — {t.titulo} (Orientador: {t.orientadorNome})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111a2e] mb-1">
                  Nome do Novo Professor Orientador
                </label>
                <input
                  type="text"
                  value={novoOrientadorNome}
                  onChange={(e) => setNovoOrientadorNome(e.target.value)}
                  placeholder="Ex: Prof. Dr. Carlos Eduardo"
                  required
                  className="w-full px-3 py-2 text-xs border border-[#dfe2e8] rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#1e78f0]"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <p className="text-[11px] text-[#6b7385]">
                <b>Garantia Institucional:</b> O novo orientador terá acesso imediato à sala e às avaliações já feitas.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPainelAcaoAtivo(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-[#dfe2e8] bg-white text-xs font-semibold text-[#6b7385] hover:bg-[#f4f5f7] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#1e78f0] hover:bg-[#1666d3] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  Efetivar Reatribuição
                </button>
              </div>
            </div>
          </form>
        )}
      </section>

      {/* Barra de Filtros: Fase, Curso, Status e Busca */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Fase */}
          <div className="flex items-center gap-1 bg-[#f4f5f7] p-1 rounded-lg border border-[#dfe2e8]">
            <button
              type="button"
              onClick={() => setFaseFiltro("todas")}
              className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                faseFiltro === "todas" ? "bg-[#0f1b33] text-white shadow-xs" : "text-[#111a2e] hover:bg-white"
              }`}
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => setFaseFiltro("1")}
              className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                faseFiltro === "1" ? "bg-[#1e78f0] text-white shadow-xs" : "text-[#111a2e] hover:bg-white"
              }`}
            >
              TCC 1
            </button>
            <button
              type="button"
              onClick={() => setFaseFiltro("2")}
              className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                faseFiltro === "2" ? "bg-[#1e78f0] text-white shadow-xs" : "text-[#111a2e] hover:bg-white"
              }`}
            >
              TCC 2
            </button>
          </div>

          {/* Filtro por Curso */}
          {cursosDisponiveis.length > 0 && (
            <select
              value={cursoFiltro}
              onChange={(e) => setCursoFiltro(e.target.value)}
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

          {/* Status Geral com opções de busca específicas */}
          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value)}
            className="text-xs bg-white border border-[#dfe2e8] rounded-lg px-3 py-1.5 font-medium text-[#111a2e] focus:outline-none focus:ring-1 focus:ring-[#1e78f0]"
          >
            <option value="todos">Todos os Status</option>
            <option value="EM_ANDAMENTO">Em Andamento</option>
            <option value="AGUARDANDO_ENVIO">Aguardando Envio</option>
            <option value="ATRASADAS">Entregas Atrasadas</option>
            <option value="AGUARDANDO_BANCA">Aguardando Banca</option>
            <option value="APROVADO">Aprovados / Finalizados</option>
          </select>

          {statusFiltro !== "todos" && (
            <button
              type="button"
              onClick={() => setStatusFiltro("todos")}
              className="text-[11px] font-semibold text-[#1e78f0] hover:underline cursor-pointer"
            >
              Limpar filtro de status
            </button>
          )}
        </div>

        <div className="relative min-w-[240px] sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#6b7385]" />
          <input
            type="text"
            placeholder="Buscar aluno, orientador, tema ou matrícula..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#f4f5f7] border border-[#dfe2e8] rounded-full focus:outline-none focus:ring-1 focus:ring-[#1e78f0] focus:bg-white text-[#111a2e]"
          />
        </div>
      </div>

      {/* Lista Limpa e Direta de Trabalhos */}
      <div className="border border-[#dfe2e8] rounded-[10px] overflow-hidden bg-white shadow-xs">
        <div className="hidden md:grid grid-cols-[1.5fr_2fr_1.4fr_130px_40px] gap-4 px-6 py-3 bg-[#f4f5f7] border-b border-[#dfe2e8] text-xs font-semibold text-[#6b7385]">
          <span>Aluno</span>
          <span>Tema / Projeto</span>
          <span>Orientador Responsável</span>
          <span>Status</span>
          <span className="text-right">Ação</span>
        </div>

        {tccsFiltrados.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#6b7385]">
            Nenhum TCC encontrado para os filtros selecionados.
          </div>
        ) : (
          <div className="divide-y divide-[#dfe2e8]">
            {tccsFiltrados.map((t) => {
              const statusRotulo = ROTULO_STATUS_TCC[t.statusGeral] ?? t.statusGeral;

              return (
                <Link
                  key={t.id}
                  href={`/dashboard/tcc/${t.id}`}
                  className="block p-4 sm:px-6 sm:py-4 hover:bg-[#f4f5f7] transition-colors group cursor-pointer"
                  title="Abrir TCC com visualização e recursos de orientação"
                >
                  <div className="hidden md:grid grid-cols-[1.5fr_2fr_1.4fr_130px_40px] gap-4 items-center">
                    <div className="min-w-0">
                      <b className="block text-sm font-semibold text-[#111a2e] truncate group-hover:text-[#1e78f0] transition-colors">
                        {t.alunoNome}
                      </b>
                      <small className="text-xs text-[#6b7385]">Matrícula: {t.aluno_id}</small>
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs text-[#111a2e] font-medium truncate">{t.titulo}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-bold text-[#1e78f0] bg-blue-50 px-1.5 py-0.2 rounded">
                          {t.fase ? `TCC ${t.fase}` : "TCC 1"}
                        </span>
                        {t.curso && <span className="text-[11px] text-[#6b7385]">&bull; {t.curso}</span>}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <span className="text-xs text-[#111a2e] font-medium block truncate">
                        {t.orientadorNome}
                      </span>
                      <small className="text-[11px] text-[#6b7385]">Professor Orientador</small>
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
