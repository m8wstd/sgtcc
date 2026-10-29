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
  PlusCircle,
  X,
  Check,
  Building,
} from "lucide-react";

interface CoordenacaoDashboardClientProps {
  nomeUsuario: string;
  perfil: "COORDENACAO" | "ADMIN";
  tccs: TccResumo[];
}

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

  // Modais de Gestão da Coordenação
  const [modalAlocacao, setModalAlocacao] = useState(false);
  const [modalCronograma, setModalCronograma] = useState(false);
  const [modalTrocaOrientador, setModalTrocaOrientador] = useState(false);
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
    const concluidos = tccs.filter((t) => t.statusGeral === "APROVADO" || t.statusGeral === "DEFENDIDO").length;
    const orientadoresUnicos = new Set(tccs.map((t) => t.orientadorNome)).size;

    return { totalTccs, emAndamento, aguardandoBanca, concluidos, orientadoresUnicos };
  }, [tccs]);

  const tccsFiltrados = useMemo(() => {
    return tccs.filter((t) => {
      const matchStatus = statusFiltro === "todos" ? true : t.statusGeral === statusFiltro;
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
    setModalTrocaOrientador(false);
    setNovoOrientadorNome("");
    setAlertaSucesso("Orientador reatribuído com sucesso! Histórico acadêmico preservado (RN02).");
    setTimeout(() => setAlertaSucesso(null), 5000);
  };

  return (
    <div className="space-y-6 w-full">
      {/* Cabeçalho */}
      <div className="border-b border-[#dfe2e8] pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111a2e]">
          Painel da Coordenação de TCC
        </h1>
        <p className="text-sm text-[#6b7385] mt-1">
          Gestão centralizada de orientações, alocações semestrais, prazos institucionais e resolução de conflitos &bull; Olá, {nomeUsuario}
        </p>
      </div>

      {alertaSucesso && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{alertaSucesso}</span>
        </div>
      )}

      {/* Cards de Métricas da Coordenação */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          label="Total de Orientações"
          value={stats.totalTccs}
          variant="blue"
          icon={<GraduationCap className="w-5 h-5" />}
          className="p-5"
        />
        <StatCard
          label="Em Andamento"
          value={stats.emAndamento}
          variant="yellow"
          className="p-5"
        />
        <StatCard
          label="Aguardando Banca"
          value={stats.aguardandoBanca}
          variant="neutral"
          className="p-5"
        />
        <StatCard
          label="Docentes Orientadores"
          value={stats.orientadoresUnicos}
          variant="green"
          icon={<Users className="w-5 h-5" />}
          className="p-5"
        />
      </div>

      {/* Ações da Coordenação de TCC */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => setModalAlocacao(true)}
          className="text-left border border-[#dfe2e8] rounded-[10px] p-5 bg-[#f4f5f7] hover:bg-white hover:border-[#1e78f0] transition-all cursor-pointer shadow-2xs group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-full bg-blue-100 text-[#1e78f0] shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-[#111a2e] group-hover:text-[#1e78f0]">
              Alocação de Orientadores
            </h3>
          </div>
          <p className="text-xs text-[#6b7385] leading-relaxed">
            Distribuir orientandos e lotes semestrais de docentes por curso.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setModalCronograma(true)}
          className="text-left border border-[#dfe2e8] rounded-[10px] p-5 bg-[#f4f5f7] hover:bg-white hover:border-[#1e78f0] transition-all cursor-pointer shadow-2xs group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-full bg-amber-100 text-amber-700 shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-[#111a2e] group-hover:text-[#1e78f0]">
              Cronograma Semestral
            </h3>
          </div>
          <p className="text-xs text-[#6b7385] leading-relaxed">
            Gerenciar datas institucionais de submissão e bancas avaliadoras.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setModalTrocaOrientador(true)}
          className="text-left border border-[#dfe2e8] rounded-[10px] p-5 bg-[#f4f5f7] hover:bg-white hover:border-[#1e78f0] transition-all cursor-pointer shadow-2xs group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-full bg-emerald-100 text-emerald-700 shrink-0">
              <Settings className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-[#111a2e] group-hover:text-[#1e78f0]">
              Troca de Orientador (RN02)
            </h3>
          </div>
          <p className="text-xs text-[#6b7385] leading-relaxed">
            Transferir aluno para outro docente preservando histórico de entregas.
          </p>
        </button>
      </div>

      {/* Modal / Formulário de Troca de Orientador */}
      {modalTrocaOrientador && (
        <form
          onSubmit={handleSalvarTroca}
          className="border-2 border-[#1e78f0] rounded-[10px] p-5 bg-white shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between border-b border-[#dfe2e8] pb-3">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-[#1e78f0]" />
              <h3 className="text-sm font-bold text-[#111a2e]">
                Troca de Orientador com Preservação de Histórico (RN02)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setModalTrocaOrientador(false)}
              className="text-[#6b7385] hover:text-[#111a2e] cursor-pointer"
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
                    {t.alunoNome} — {t.titulo} (Orientador Atual: {t.orientadorNome})
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
                className="w-full px-3 py-2 text-xs border border-[#dfe2e8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e78f0]"
              />
            </div>
          </div>

          <p className="text-[11.5px] text-[#6b7385] bg-[#f4f5f7] p-3 rounded-lg">
            <b>Regra RN02:</b> Caso o aluno mude de orientador, todas as entregas anteriores, comentários e arquivos já submetidos serão mantidos intactos e disponibilizados imediatamente para o novo docente.
          </p>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#dfe2e8]">
            <button
              type="button"
              onClick={() => setModalTrocaOrientador(false)}
              className="px-4 py-1.5 rounded-lg border border-[#dfe2e8] bg-white text-xs font-semibold text-[#6b7385] hover:bg-[#f4f5f7] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-1.5 bg-[#1e78f0] hover:bg-[#1666d3] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              Efetivar Troca de Orientador
            </button>
          </div>
        </form>
      )}

      {/* Modal Informativo de Cronograma */}
      {modalCronograma && (
        <div className="border-2 border-[#1e78f0] rounded-[10px] p-5 bg-white shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#dfe2e8] pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#1e78f0]" />
              <h3 className="text-sm font-bold text-[#111a2e]">
                Cronograma Institucional do Semestre (2026/2)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setModalCronograma(false)}
              className="text-[#6b7385] hover:text-[#111a2e] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2 text-xs text-[#111a2e]">
            <div className="flex justify-between p-2.5 bg-[#f4f5f7] rounded-lg">
              <b>1. Submissão da Introdução e Objetivos</b>
              <span>15/07/2026</span>
            </div>
            <div className="flex justify-between p-2.5 bg-[#f4f5f7] rounded-lg">
              <b>2. Referencial Teórico e Revisão Bibliográfica</b>
              <span>12/08/2026</span>
            </div>
            <div className="flex justify-between p-2.5 bg-[#f4f5f7] rounded-lg">
              <b>3. Metodologia e Instrumentos</b>
              <span>09/09/2026</span>
            </div>
            <div className="flex justify-between p-2.5 bg-[#f4f5f7] rounded-lg">
              <b>4. Apresentação dos Resultados</b>
              <span>07/10/2026</span>
            </div>
            <div className="flex justify-between p-2.5 bg-[#f4f5f7] rounded-lg">
              <b>5. Entrega Final da Monografia à Banca</b>
              <span>30/11/2026</span>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Alocação de Orientadores */}
      {modalAlocacao && (
        <div className="border-2 border-[#1e78f0] rounded-[10px] p-5 bg-white shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#dfe2e8] pb-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[#1e78f0]" />
              <h3 className="text-sm font-bold text-[#111a2e]">
                Alocação e Lotes Semestrais de Orientadores (RN01)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setModalAlocacao(false)}
              className="text-[#6b7385] hover:text-[#111a2e] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-[#6b7385]">
            O sistema gerencia lotes de mais de 20 orientandos por docente de forma centralizada.
          </p>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setModalAlocacao(false)}
              className="px-4 py-1.5 bg-[#1e78f0] text-white text-xs font-semibold rounded-lg"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Barra de Filtros de Curso, Fase e Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
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

          {/* Status Geral */}
          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value)}
            className="text-xs bg-white border border-[#dfe2e8] rounded-lg px-3 py-1.5 font-medium text-[#111a2e] focus:outline-none focus:ring-1 focus:ring-[#1e78f0]"
          >
            <option value="todos">Todos os Status</option>
            <option value="EM_ANDAMENTO">Em Andamento</option>
            <option value="AGUARDANDO_BANCA">Aguardando Banca</option>
            <option value="APROVADO">Aprovados / Finalizados</option>
          </select>
        </div>

        <div className="relative min-w-[220px] sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#6b7385]" />
          <input
            type="text"
            placeholder="Buscar aluno, orientador ou tema..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#f4f5f7] border border-[#dfe2e8] rounded-full focus:outline-none focus:ring-1 focus:ring-[#1e78f0] focus:bg-white text-[#111a2e]"
          />
        </div>
      </div>

      {/* Lista Limpa e Direta de Trabalhos */}
      <div className="border border-[#dfe2e8] rounded-[10px] overflow-hidden bg-white shadow-xs">
        <div className="hidden md:grid grid-cols-[1.5fr_2fr_1.4fr_120px_40px] gap-4 px-6 py-3 bg-[#f4f5f7] border-b border-[#dfe2e8] text-xs font-semibold text-[#6b7385]">
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
                  className="block p-4 sm:px-6 sm:py-4 hover:bg-[#f4f5f7] transition-colors group"
                >
                  <div className="hidden md:grid grid-cols-[1.5fr_2fr_1.4fr_120px_40px] gap-4 items-center">
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
