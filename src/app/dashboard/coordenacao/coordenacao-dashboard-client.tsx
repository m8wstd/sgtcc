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
} from "lucide-react";

interface CoordenacaoDashboardClientProps {
  nomeUsuario: string;
  perfil: "COORDENACAO" | "ADMIN";
  tccs: TccResumo[];
}

export function CoordenacaoDashboardClient({
  nomeUsuario,
  perfil,
  tccs,
}: CoordenacaoDashboardClientProps) {
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<string>("todos");

  const isAdmin = perfil === "ADMIN";

  const stats = useMemo(() => {
    const totalTccs = tccs.length;
    const emAndamento = tccs.filter((t) => t.statusGeral === "EM_ANDAMENTO").length;
    const aguardandoBanca = tccs.filter((t) => t.statusGeral === "AGUARDANDO_BANCA").length;
    const concluidos = tccs.filter((t) => t.statusGeral === "APROVADO" || t.statusGeral === "DEFENDIDO").length;
    const orientadoresUnicos = new Set(tccs.map((t) => t.orientador_id)).size;

    return { totalTccs, emAndamento, aguardandoBanca, concluidos, orientadoresUnicos };
  }, [tccs]);

  const tccsFiltrados = useMemo(() => {
    return tccs.filter((t) => {
      const matchStatus = statusFiltro === "todos" ? true : t.statusGeral === statusFiltro;
      const termo = busca.toLowerCase();
      const matchBusca =
        !termo ||
        t.titulo.toLowerCase().includes(termo) ||
        t.alunoNome.toLowerCase().includes(termo) ||
        t.orientadorNome.toLowerCase().includes(termo);
      return matchStatus && matchBusca;
    });
  }, [tccs, statusFiltro, busca]);

  return (
    <div className="space-y-8 w-full">
      {/* Cabeçalho Padronizado */}
      <div className="border-b border-[#dfe2e8] pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111a2e]">
          {isAdmin ? "Painel do Administrador" : "Painel da Coordenação de TCC"}
        </h1>
        <p className="text-sm text-[#6b7385] mt-1">
          {isAdmin
            ? `Visão global do sistema e controle operacional acadêmico — Olá, ${nomeUsuario}`
            : `Gestão de orientações, vínculos docentes e acompanhamento geral — Olá, ${nomeUsuario}`}
        </p>
      </div>

      {/* Cards de Métricas Semestrais Padronizados */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          label="Total de TCCs"
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
          label="Docentes Ativos"
          value={stats.orientadoresUnicos}
          variant="green"
          icon={<Users className="w-5 h-5" />}
          className="p-5"
        />
      </div>

      {/* Ações Rápidas de Gestão Institucional */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border border-[#dfe2e8] rounded-[10px] p-5 bg-[#f4f5f7] flex items-start gap-3.5 shadow-2xs">
          <div className="p-2.5 rounded-full bg-blue-100 text-[#1e78f0] shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#111a2e]">Alocação em Lote</h3>
            <p className="text-xs text-[#6b7385] mt-1 leading-relaxed">
              Importação semestral de vínculos aluno ↔ orientador via planilha padrão.
            </p>
          </div>
        </div>

        <div className="border border-[#dfe2e8] rounded-[10px] p-5 bg-[#f4f5f7] flex items-start gap-3.5 shadow-2xs">
          <div className="p-2.5 rounded-full bg-amber-100 text-amber-700 shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#111a2e]">Cronograma & Prazos</h3>
            <p className="text-xs text-[#6b7385] mt-1 leading-relaxed">
              Configuração dos marcos com bloqueio estrito de submissão do semestre.
            </p>
          </div>
        </div>

        <div className="border border-[#dfe2e8] rounded-[10px] p-5 bg-[#f4f5f7] flex items-start gap-3.5 shadow-2xs">
          <div className="p-2.5 rounded-full bg-emerald-100 text-emerald-700 shrink-0">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#111a2e]">Troca de Orientador</h3>
            <p className="text-xs text-[#6b7385] mt-1 leading-relaxed">
              Reatribuição transparente com preservação integral de todo o histórico.
            </p>
          </div>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setStatusFiltro("todos")}
            className={`px-4 py-2 rounded-full text-xs sm:text-[13px] border transition-colors cursor-pointer ${
              statusFiltro === "todos"
                ? "bg-[#0f1b33] text-white border-[#0f1b33] font-medium"
                : "border-[#dfe2e8] bg-white text-[#111a2e] hover:bg-[#f4f5f7]"
            }`}
          >
            Todos os TCCs ({stats.totalTccs})
          </button>
          <button
            type="button"
            onClick={() => setStatusFiltro("EM_ANDAMENTO")}
            className={`px-4 py-2 rounded-full text-xs sm:text-[13px] border transition-colors cursor-pointer ${
              statusFiltro === "EM_ANDAMENTO"
                ? "bg-[#0f1b33] text-white border-[#0f1b33] font-medium"
                : "border-[#dfe2e8] bg-white text-[#111a2e] hover:bg-[#f4f5f7]"
            }`}
          >
            Em Andamento ({stats.emAndamento})
          </button>
          <button
            type="button"
            onClick={() => setStatusFiltro("AGUARDANDO_BANCA")}
            className={`px-4 py-2 rounded-full text-xs sm:text-[13px] border transition-colors cursor-pointer ${
              statusFiltro === "AGUARDANDO_BANCA"
                ? "bg-[#0f1b33] text-white border-[#0f1b33] font-medium"
                : "border-[#dfe2e8] bg-white text-[#111a2e] hover:bg-[#f4f5f7]"
            }`}
          >
            Aguardando Banca ({stats.aguardandoBanca})
          </button>
          <button
            type="button"
            onClick={() => setStatusFiltro("APROVADO")}
            className={`px-4 py-2 rounded-full text-xs sm:text-[13px] border transition-colors cursor-pointer ${
              statusFiltro === "APROVADO"
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
            placeholder="Buscar aluno, orientador ou tema..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#f4f5f7] border border-[#dfe2e8] rounded-full focus:outline-none focus:ring-1 focus:ring-[#1e78f0] focus:bg-white text-[#111a2e]"
          />
        </div>
      </div>

      {/* Lista de TCCs sob Supervisão */}
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
                      <span className="text-[11px] text-[#6b7385]">Registro Semestral</span>
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
