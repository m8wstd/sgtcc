"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { StatCard } from "@/components/ui/stat-card";
import { StatusPill } from "@/components/ui/status-pill";
import { SemestreSelector } from "@/components/ui/semestre-selector";
import { semestreAtual, derivarSemestreTcc, compararSemestres } from "@/lib/semestre";
import { formatarData } from "@/components/layout/status";
import { ROTULO_DECISAO, ROTULO_ETAPA_BANCA, type EtapaBanca } from "@/lib/banca/status";
import type { TccBanca } from "@/lib/data/queries";
import {
  Search,
  ChevronRight,
  Award,
  FileText,
  CheckCircle2,
  PenLine,
  CalendarClock,
  Clock,
  Eye,
  EyeOff,
} from "lucide-react";

interface AvaliadorDashboardClientProps {
  nomeAvaliador: string;
  tccs: TccBanca[];
  ocultarCabecalho?: boolean;
}

// ── Colunas do Kanban: etapa do TCC do ponto de vista deste avaliador ───────
// Cores alinhadas exatamente com a paleta dos stickers (StatCard & StatusPill):
// Neutral (#d5d9e0), Yellow (#ffd84d), Blue (#8ec5ff), Green (#86d994)
const COLUNAS_KANBAN_BANCA: { key: EtapaBanca; cor: string; desc: string }[] = [
  { key: "AGUARDANDO_ENVIO", cor: "#d5d9e0", desc: "Aluno ainda não enviou a versão final" },
  { key: "PRONTA_PARA_AVALIAR", cor: "#ffd84d", desc: "Versão final disponível, falta sua avaliação" },
  { key: "EM_AVALIACAO", cor: "#8ec5ff", desc: "Você salvou um rascunho" },
  { key: "AVALIADA", cor: "#86d994", desc: "Avaliação finalizada" },
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

export function AvaliadorDashboardClient({ nomeAvaliador, tccs, ocultarCabecalho }: AvaliadorDashboardClientProps) {
  const semestresDisponiveis = useMemo(() => {
    const setS = new Set<string>();
    setS.add(semestreAtual());
    tccs.forEach((t) => {
      setS.add(derivarSemestreTcc(t));
    });
    return Array.from(setS).sort(compararSemestres);
  }, [tccs]);

  const [semestreAtivo, setSemestreAtivo] = useState<string>(semestreAtual());
  const [busca, setBusca] = useState("");
  const [tabFase, setTabFase] = useState<"todas" | "1" | "2">("todas");
  const [cursoAtivo, setCursoAtivo] = useState<string>("todos");
  const [filtroEtapa, setFiltroEtapa] = useState<EtapaBanca | "todas">("todas");
  const [exibirAvaliadasKanban, setExibirAvaliadasKanban] = useState(false);
  const [exibirAguardandoEnvio, setExibirAguardandoEnvio] = useState(false);

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
    const conta = (e: EtapaBanca) => tccsDoSemestre.filter((t) => t.etapa === e).length;
    return {
      total: tccsDoSemestre.length,
      aguardandoEnvio: conta("AGUARDANDO_ENVIO"),
      paraAvaliar: conta("PRONTA_PARA_AVALIAR"),
      emAvaliacao: conta("EM_AVALIACAO"),
      avaliadas: conta("AVALIADA"),
    };
  }, [tccsDoSemestre]);

  const tccsFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return tccsDoSemestre.filter((t) => {
      const matchFase = tabFase === "todas" ? true : tabFase === "1" ? t.fase === 1 || !t.fase : t.fase === 2;
      const matchCurso = cursoAtivo === "todos" ? true : t.curso === cursoAtivo;
      const matchEtapa = filtroEtapa === "todas" || t.etapa === filtroEtapa;
      const matchBusca =
        !termo ||
        t.titulo.toLowerCase().includes(termo) ||
        t.alunoNome.toLowerCase().includes(termo) ||
        t.aluno_id.toLowerCase().includes(termo) ||
        t.orientadorNome.toLowerCase().includes(termo);
      return matchFase && matchCurso && matchEtapa && matchBusca;
    });
  }, [tccsDoSemestre, tabFase, cursoAtivo, filtroEtapa, busca]);

  return (
    <div className="space-y-6 w-full">
      {!ocultarCabecalho && (
        <div className="mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111a2e]">Olá, Prof. {nomeAvaliador}</h1>
          <p className="text-sm text-[#6b7385] mt-1">
            Trabalhos em que você participa da banca examinadora (TCC 1 e TCC 2), ordenados pela defesa mais próxima.
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

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard
          label="Total de Bancas"
          value={stats.total}
          variant="primary"
          icon={<Award className="w-4 h-4" />}
          className="p-3 sm:p-4"
          onClick={() => {
            setFiltroEtapa("todas");
            setExibirAvaliadasKanban(true);
            setExibirAguardandoEnvio(true);
          }}
          active={filtroEtapa === "todas"}
        />
        <StatCard
          label="Aguardando Envio"
          value={stats.aguardandoEnvio}
          variant="neutral"
          icon={<Clock className="w-4 h-4" />}
          className="p-3 sm:p-4"
          onClick={() => {
            if (filtroEtapa === "AGUARDANDO_ENVIO") {
              setFiltroEtapa("todas");
            } else {
              setFiltroEtapa("AGUARDANDO_ENVIO");
              setExibirAguardandoEnvio(true);
            }
          }}
          active={filtroEtapa === "AGUARDANDO_ENVIO"}
        />
        <StatCard
          label="Para Avaliar"
          value={stats.paraAvaliar}
          variant="yellow"
          icon={<FileText className="w-4 h-4" />}
          className="p-3 sm:p-4"
          onClick={() => {
            setFiltroEtapa(filtroEtapa === "PRONTA_PARA_AVALIAR" ? "todas" : "PRONTA_PARA_AVALIAR");
          }}
          active={filtroEtapa === "PRONTA_PARA_AVALIAR"}
        />
        <StatCard
          label="Em Avaliação (rascunho)"
          value={stats.emAvaliacao}
          variant="blue"
          icon={<PenLine className="w-4 h-4" />}
          className="p-3 sm:p-4"
          onClick={() => {
            setFiltroEtapa(filtroEtapa === "EM_AVALIACAO" ? "todas" : "EM_AVALIACAO");
          }}
          active={filtroEtapa === "EM_AVALIACAO"}
        />
        <StatCard
          label="Avaliadas"
          value={stats.avaliadas}
          variant="green"
          icon={<CheckCircle2 className="w-4 h-4" />}
          className="p-3 sm:p-4"
          active={filtroEtapa === "AVALIADA"}
        />
      </div>

      {/* Barra de Filtros e Busca no mesmo alinhamento do Orientador */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Abas TCC 1 vs TCC 2 */}
          <div className="flex items-center gap-1 bg-[#f4f5f7] p-1 rounded-lg border border-[#dfe2e8]">
            <button
              type="button"
              onClick={() => setTabFase("todas")}
              className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                tabFase === "todas" ? "bg-[#0f1b33] text-white shadow-xs" : "text-[#111a2e] hover:bg-white"
              }`}
            >
              Todas as Fases
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

          {filtroEtapa !== "todas" && (
            <button
              type="button"
              onClick={() => {
                setFiltroEtapa("todas");
                setExibirAguardandoEnvio(true);
                setExibirAvaliadasKanban(true);
              }}
              className="text-[11px] font-semibold text-[#1e78f0] hover:underline cursor-pointer"
            >
              Limpar filtro de etapa
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Busca */}
          <div className="relative flex-1 sm:w-64 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#6b7385]" />
            <input
              type="text"
              placeholder="Buscar por aluno, tema ou orientador..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#f4f5f7] border border-[#dfe2e8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e78f0] focus:bg-white text-[#111a2e]"
            />
          </div>

          {/* Alternadores de Visão de Colunas (alinhados igual ao Orientador) */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setExibirAguardandoEnvio((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                exibirAguardandoEnvio
                  ? "bg-[#d5d9e0] text-[#111a2e] border-[#c0c5cd]"
                  : "bg-white text-[#6b7385] border-[#dfe2e8] hover:text-[#111a2e]"
              }`}
              title="Exibir/ocultar coluna Aguardando Envio"
            >
              {exibirAguardandoEnvio ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>Aguardando Envio ({stats.aguardandoEnvio})</span>
            </button>

            <button
              type="button"
              onClick={() => setExibirAvaliadasKanban((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                exibirAvaliadasKanban
                  ? "bg-[#86d994] text-[#111a2e] border-[#72c27f]"
                  : "bg-white text-[#6b7385] border-[#dfe2e8] hover:text-[#111a2e]"
              }`}
              title="Exibir/ocultar coluna Avaliadas"
            >
              {exibirAvaliadasKanban ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>Avaliadas ({stats.avaliadas})</span>
            </button>
          </div>
        </div>
      </div>

      {tccs.length === 0 ? (
        <div className="border border-[#dfe2e8] rounded-[10px] bg-white p-10 text-center text-sm text-[#6b7385]">
          Você ainda não foi vinculado(a) a nenhuma banca neste semestre. A coordenação faz esse vínculo.
        </div>
      ) : (
        <div className="space-y-4">

          <div className="w-full pb-4">
            {/* Grid flexível: Em telas pequenas empilha ordenadamente em coluna única limpa; em md+ vira colunas lado a lado */}
            <div
              className={`grid gap-4 w-full grid-cols-1 sm:grid-cols-2 ${
                exibirAguardandoEnvio && exibirAvaliadasKanban
                  ? "lg:grid-cols-4"
                  : (exibirAguardandoEnvio || exibirAvaliadasKanban)
                  ? "lg:grid-cols-3"
                  : "lg:grid-cols-2"
              }`}
            >
              {COLUNAS_KANBAN_BANCA.filter((col) => {
                if (col.key === "AGUARDANDO_ENVIO" && !exibirAguardandoEnvio && filtroEtapa !== "AGUARDANDO_ENVIO") {
                  return false;
                }
                if (col.key === "AVALIADA" && !exibirAvaliadasKanban && filtroEtapa !== "AVALIADA") {
                  return false;
                }
                return true;
              }).map((col) => {
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
                            href={`/dashboard/tcc/${t.id}/banca`}
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
        </div>
      )}
    </div>
  );
}
