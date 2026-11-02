"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { StatCard } from "@/components/ui/stat-card";
import { StatusPill } from "@/components/ui/status-pill";
import { formatarData } from "@/components/layout/status";
import { ROTULO_DECISAO, ROTULO_ETAPA_BANCA, type EtapaBanca } from "@/lib/banca/status";
import type { TccBanca } from "@/lib/data/queries";
import {
  Search,
  ChevronRight,
  Award,
  FileText,
  CheckCircle2,
  Columns3,
  List,
  PenLine,
  CalendarClock,
} from "lucide-react";

interface AvaliadorDashboardClientProps {
  nomeAvaliador: string;
  tccs: TccBanca[];
}

// ── Colunas do Kanban: etapa do TCC do ponto de vista deste avaliador ───────
const COLUNAS_KANBAN_BANCA: { key: EtapaBanca; cor: string; desc: string }[] = [
  { key: "AGUARDANDO_ENVIO", cor: "#aeb5c2", desc: "Aluno ainda não enviou a versão final" },
  { key: "PRONTA_PARA_AVALIAR", cor: "#f0c93a", desc: "Versão final disponível, falta sua avaliação" },
  { key: "EM_AVALIACAO", cor: "#8ec5ff", desc: "Você salvou um rascunho" },
  { key: "AVALIADA", cor: "#52b565", desc: "Avaliação finalizada" },
];

const DIA_MS = 24 * 60 * 60 * 1000;

/** "em 6 dias", "hoje", "há 3 dias" — só para dar urgência visual ao card. */
function prazoDefesa(defesaEm: string | Date | undefined): { texto: string; urgente: boolean } | null {
  if (!defesaEm) return null;
  const dias = Math.ceil((new Date(defesaEm).getTime() - Date.now()) / DIA_MS);
  if (dias < 0) return { texto: `Defesa há ${-dias} ${-dias === 1 ? "dia" : "dias"}`, urgente: false };
  if (dias === 0) return { texto: "Defesa hoje", urgente: true };
  return { texto: `Defesa em ${dias} ${dias === 1 ? "dia" : "dias"}`, urgente: dias <= 7 };
}

function ResumoAvaliacao({ t }: { t: TccBanca }) {
  if (t.etapa !== "AVALIADA" || !t.avaliacao) return null;
  return (
    <span className="text-[10.5px] font-semibold text-emerald-700">
      Nota {t.avaliacao.nota?.toLocaleString("pt-BR")}
      {t.avaliacao.decisao ? ` · ${ROTULO_DECISAO[t.avaliacao.decisao]}` : ""}
    </span>
  );
}

export function AvaliadorDashboardClient({ nomeAvaliador, tccs }: AvaliadorDashboardClientProps) {
  const [busca, setBusca] = useState("");
  const [viewMode, setViewMode] = useState<"kanban" | "lista">("kanban");
  const [tabFase, setTabFase] = useState<"todas" | "1" | "2">("todas");
  const [filtroEtapa, setFiltroEtapa] = useState<EtapaBanca | "todas">("todas");

  const stats = useMemo(() => {
    const conta = (e: EtapaBanca) => tccs.filter((t) => t.etapa === e).length;
    return {
      total: tccs.length,
      paraAvaliar: conta("PRONTA_PARA_AVALIAR"),
      emAvaliacao: conta("EM_AVALIACAO"),
      avaliadas: conta("AVALIADA"),
    };
  }, [tccs]);

  const tccsFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return tccs.filter((t) => {
      const matchFase = tabFase === "todas" ? true : tabFase === "1" ? t.fase === 1 || !t.fase : t.fase === 2;
      const matchEtapa = filtroEtapa === "todas" || t.etapa === filtroEtapa;
      const matchBusca =
        !termo ||
        t.titulo.toLowerCase().includes(termo) ||
        t.alunoNome.toLowerCase().includes(termo) ||
        t.aluno_id.toLowerCase().includes(termo) ||
        t.orientadorNome.toLowerCase().includes(termo);
      return matchFase && matchEtapa && matchBusca;
    });
  }, [tccs, tabFase, filtroEtapa, busca]);

  const hrefSala = (t: TccBanca) => `/dashboard/tcc/${t.id}/banca`;

  return (
    <div className="space-y-6 w-full">
      <div className="border-b border-[#dfe2e8] pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111a2e]">Olá, Prof. {nomeAvaliador}</h1>
        <p className="text-sm text-[#6b7385] mt-1">
          Trabalhos em que você participa da banca examinadora (TCC 1 e TCC 2), ordenados pela defesa mais próxima.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard label="Total de Bancas" value={stats.total} variant="blue" icon={<Award className="w-5 h-5" />} className="p-5" />
        <StatCard label="Para Avaliar" value={stats.paraAvaliar} variant="yellow" icon={<FileText className="w-5 h-5" />} className="p-5" />
        <StatCard label="Em Avaliação (rascunho)" value={stats.emAvaliacao} variant="neutral" icon={<PenLine className="w-5 h-5" />} className="p-5" />
        <StatCard label="Avaliadas" value={stats.avaliadas} variant="green" icon={<CheckCircle2 className="w-5 h-5" />} className="p-5" />
      </div>

      {/* Controles */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#f4f5f7] p-1 rounded-lg border border-[#dfe2e8]">
            <span className="text-[11px] font-semibold text-[#6b7385] px-2">Fase:</span>
            {(["todas", "1", "2"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setTabFase(f)}
                className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                  tabFase === f
                    ? f === "todas"
                      ? "bg-[#0f1b33] text-white shadow-xs"
                      : "bg-[#1e78f0] text-white shadow-xs"
                    : "text-[#111a2e] hover:bg-white"
                }`}
              >
                {f === "todas" ? "Todas" : `TCC ${f}`}
              </button>
            ))}
          </div>

          <select
            aria-label="Filtrar por etapa"
            value={filtroEtapa}
            onChange={(e) => setFiltroEtapa(e.target.value as EtapaBanca | "todas")}
            className="px-3 py-2 text-xs bg-[#f4f5f7] border border-[#dfe2e8] rounded-lg text-[#111a2e] focus:outline-none focus:ring-1 focus:ring-[#1e78f0]"
          >
            <option value="todas">Todas as etapas</option>
            {COLUNAS_KANBAN_BANCA.map((c) => (
              <option key={c.key} value={c.key}>
                {ROTULO_ETAPA_BANCA[c.key]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative min-w-[200px] sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#6b7385]" />
            <input
              type="text"
              placeholder="Buscar por aluno, tema ou orientador..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#f4f5f7] border border-[#dfe2e8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e78f0] focus:bg-white text-[#111a2e]"
            />
          </div>

          <div className="flex items-center gap-1 bg-[#f4f5f7] p-1 rounded-lg border border-[#dfe2e8]">
            {([
              ["kanban", "Kanban", Columns3],
              ["lista", "Lista", List],
            ] as const).map(([modo, rotulo, Icone]) => (
              <button
                key={modo}
                type="button"
                onClick={() => setViewMode(modo)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === modo ? "bg-white text-[#111a2e] shadow-xs" : "text-[#6b7385] hover:text-[#111a2e]"
                }`}
              >
                <Icone className="w-3.5 h-3.5" />
                {rotulo}
              </button>
            ))}
          </div>
        </div>
      </div>

      {tccs.length === 0 ? (
        <div className="border border-[#dfe2e8] rounded-[10px] bg-white p-10 text-center text-sm text-[#6b7385]">
          Você ainda não foi vinculado(a) a nenhuma banca neste semestre. A coordenação faz esse vínculo.
        </div>
      ) : viewMode === "kanban" ? (
        <div className="w-full overflow-x-auto pb-4">
          <div className="grid grid-cols-4 gap-4 min-w-[860px]">
            {COLUNAS_KANBAN_BANCA.map((col) => {
              const naColuna = tccsFiltrados.filter((t) => t.etapa === col.key);
              return (
                <div
                  key={col.key}
                  className="bg-[#f4f5f7] rounded-[12px] p-3.5 border-t-4 flex flex-col gap-3 min-h-[220px] shadow-2xs"
                  style={{ borderTopColor: col.cor }}
                >
                  <div className="px-1">
                    <div className="flex items-center justify-between text-xs font-bold text-[#111a2e]">
                      <span>{ROTULO_ETAPA_BANCA[col.key]}</span>
                      <span className="bg-white border border-[#dfe2e8] rounded-full px-2 py-0.5 text-[11px] font-bold">
                        {naColuna.length}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-[#6b7385] mt-0.5">{col.desc}</p>
                  </div>

                  {naColuna.length === 0 ? (
                    <p className="text-xs text-[#6b7385] text-center py-8 italic">Nenhum trabalho</p>
                  ) : (
                    naColuna.map((t) => {
                      const prazo = prazoDefesa(t.defesaEm);
                      return (
                        <Link
                          key={t.id}
                          href={hrefSala(t)}
                          className="block border border-[#dfe2e8] rounded-[10px] p-3.5 bg-white space-y-2.5 shadow-2xs transition-all hover:border-[#1e78f0] hover:shadow-xs cursor-pointer group text-left"
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div>
                              <b className="text-[13px] font-bold text-[#111a2e] block group-hover:text-[#1e78f0] transition-colors leading-snug">
                                {t.alunoNome}
                              </b>
                              <span className="text-[10.5px] text-[#6b7385]">Matrícula: {t.aluno_id}</span>
                            </div>
                            <span className="text-[10px] font-bold text-[#1e78f0] bg-blue-50 px-1.5 py-0.5 rounded shrink-0">
                              {t.fase ? `TCC ${t.fase}` : "TCC 1"}
                            </span>
                          </div>

                          <p className="text-[11.5px] text-[#111a2e] font-medium line-clamp-2 leading-relaxed">{t.titulo}</p>

                          {prazo && (
                            <div
                              className={`flex items-center gap-1.5 text-[10.5px] font-semibold ${
                                prazo.urgente && t.etapa !== "AVALIADA" ? "text-red-600" : "text-[#6b7385]"
                              }`}
                            >
                              <CalendarClock className="w-3.5 h-3.5" />
                              <span>
                                {prazo.texto} · {formatarData(t.defesaEm)}
                              </span>
                            </div>
                          )}

                          <div className="pt-2 border-t border-[#f4f5f7] flex justify-between items-center gap-2 text-[10.5px] text-[#6b7385]">
                            <span className="truncate">Orientador: {t.orientadorNome}</span>
                            <ResumoAvaliacao t={t} />
                          </div>
                        </Link>
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="border border-[#dfe2e8] rounded-[10px] overflow-hidden bg-white shadow-xs">
          <div className="hidden md:grid grid-cols-[1.4fr_2fr_1.1fr_1fr_150px_40px] gap-4 px-6 py-3 bg-[#f4f5f7] border-b border-[#dfe2e8] text-xs font-semibold text-[#6b7385]">
            <span>Aluno</span>
            <span>Tema do Projeto Final</span>
            <span>Orientador</span>
            <span>Defesa</span>
            <span>Situação</span>
            <span className="text-right">Ação</span>
          </div>

          {tccsFiltrados.length === 0 ? (
            <div className="p-10 text-center text-sm text-[#6b7385]">Nenhum trabalho encontrado com esses filtros.</div>
          ) : (
            <div className="divide-y divide-[#dfe2e8]">
              {tccsFiltrados.map((t) => {
                const prazo = prazoDefesa(t.defesaEm);
                const rotulo = ROTULO_ETAPA_BANCA[t.etapa];
                return (
                  <Link key={t.id} href={hrefSala(t)} className="block p-4 sm:px-6 sm:py-4 hover:bg-[#f4f5f7] transition-colors group">
                    <div className="hidden md:grid grid-cols-[1.4fr_2fr_1.1fr_1fr_150px_40px] gap-4 items-center">
                      <div className="min-w-0">
                        <b className="block text-sm font-semibold text-[#111a2e] truncate group-hover:text-[#1e78f0] transition-colors">
                          {t.alunoNome}
                        </b>
                        <small className="text-xs text-[#6b7385]">Matrícula: {t.aluno_id}</small>
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs text-[#111a2e] font-medium truncate">{t.titulo}</p>
                        <span className="text-[11px] text-[#1e78f0] font-semibold">
                          {t.fase ? `TCC ${t.fase}` : "TCC 1"}
                          {t.curso ? ` • ${t.curso}` : ""}
                        </span>
                      </div>

                      <span className="text-xs text-[#111a2e] block truncate font-medium">{t.orientadorNome}</span>

                      <div className="text-xs">
                        <span className="block text-[#111a2e] font-medium">{formatarData(t.defesaEm)}</span>
                        {prazo && (
                          <small className={prazo.urgente && t.etapa !== "AVALIADA" ? "text-red-600 font-semibold" : "text-[#6b7385]"}>
                            {prazo.texto}
                          </small>
                        )}
                      </div>

                      <div className="space-y-1">
                        <StatusPill status={rotulo} />
                        <div>
                          <ResumoAvaliacao t={t} />
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <ChevronRight className="w-4 h-4 text-[#6b7385] group-hover:text-[#1e78f0] group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>

                    <div className="flex md:hidden flex-col gap-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <b className="text-sm font-semibold text-[#111a2e] block group-hover:text-[#1e78f0]">{t.alunoNome}</b>
                          <small className="text-xs text-[#6b7385]">Orientador: {t.orientadorNome}</small>
                        </div>
                        <StatusPill status={rotulo} />
                      </div>
                      <p className="text-xs text-[#111a2e] line-clamp-2">{t.titulo}</p>
                      {prazo && <small className="text-[11px] text-[#6b7385]">{prazo.texto} · {formatarData(t.defesaEm)}</small>}
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
