"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  MessageSquare,
  Clock,
  Columns3,
  List,
  FileText,
  UploadCloud,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { StatusPill } from "@/components/ui/status-pill";
import { ProgressBar } from "@/components/ui/progress-bar";
import {
  ROTULO_STATUS_ENTREGA,
  ROTULO_STATUS_TCC,
  formatarData,
  formatarDataHora,
} from "@/components/layout/status";
import type { ItemMarco, TccResumo } from "@/lib/data/queries";
import type { StatusEntrega } from "@/types";

// ── Colunas Kanban Fidedignas ao Protótipo ──────────────────────────────────
export const COLUNAS_KANBAN = [
  { key: "Pendente", label: "Pendente", cor: "#aeb5c2" },
  { key: "Em andamento", label: "Em andamento", cor: "#5aa5ee" },
  { key: "Para correção", label: "Para correção", cor: "#f0c93a" },
  { key: "Em correção", label: "Em correção", cor: "#ff7f7f" },
  { key: "Concluído", label: "Concluído", cor: "#52b565" },
] as const;

export type ColunaKanbanKey = (typeof COLUNAS_KANBAN)[number]["key"];

export function mapStatusParaColuna(status: StatusEntrega): ColunaKanbanKey {
  switch (status) {
    case "AGUARDANDO_ENVIO":
    case "ATRASADA":
      return "Pendente";
    case "PRONTA_PARA_REVISAO":
      return "Em andamento";
    case "EM_REVISAO":
      return "Para correção";
    case "SOLICITADA_CORRECAO":
      return "Em correção";
    case "CONCLUIDA":
      return "Concluído";
    default:
      return "Pendente";
  }
}

export function progressoEstimadoPorStatus(status: StatusEntrega): number {
  switch (status) {
    case "AGUARDANDO_ENVIO":
    case "ATRASADA":
      return 0;
    case "PRONTA_PARA_REVISAO":
      return 50;
    case "EM_REVISAO":
      return 70;
    case "SOLICITADA_CORRECAO":
      return 40;
    case "CONCLUIDA":
      return 100;
    default:
      return 0;
  }
}

export function slugDoMarco(titulo: string, idx: number): string {
  const t = titulo.toLowerCase();
  if (t.includes("introdu")) return "introducao";
  if (t.includes("referenc") || t.includes("teor")) return "referencial-teorico";
  if (t.includes("metod")) return "metodologia";
  if (t.includes("result")) return "resultados";
  if (t.includes("conclu")) return "conclusao";
  const fallback = ["introducao", "referencial-teorico", "metodologia", "resultados", "conclusao"];
  return fallback[idx % fallback.length];
}

export interface PainelTccModularProps {
  tcc: TccResumo;
  itens: ItemMarco[];
  papel: "orientador" | "aluno";
  saudacaoNome?: string;
  subtitulo?: string;
  voltarHref?: string;
  voltarLabel?: string;
  outrosTccs?: TccResumo[];
  onTrocarTccHref?: (tccId: string) => string;
}

export function PainelTccModular({
  tcc,
  itens,
  papel,
  saudacaoNome,
  subtitulo,
  voltarHref,
  voltarLabel,
  outrosTccs = [],
  onTrocarTccHref,
}: PainelTccModularProps) {
  const isOrientador = papel === "orientador";
  const [viewMode, setViewMode] = useState<"kanban" | "lista">("kanban");

  const totalMarcos = itens.length;
  const concluidos = itens.filter((i) => i.statusEfetivo === "CONCLUIDA").length;
  const porcentagemGeral =
    totalMarcos > 0
      ? Math.round(
          itens.reduce((acc, i) => acc + progressoEstimadoPorStatus(i.statusEfetivo), 0) /
            totalMarcos
        )
      : 0;

  const totalComentarios = itens.reduce((acc, i) => acc + i.feedbacks.length, 0);

  // Próxima entrega
  const proximoNaoConcluido = itens.find((i) => i.statusEfetivo !== "CONCLUIDA");
  const proximaEntregaTexto = proximoNaoConcluido
    ? formatarData(proximoNaoConcluido.marco.dataLimite)
    : "Concluído";

  return (
    <div className="space-y-6 w-full">
      {/* Topo / Barra de Navegação */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {voltarHref ? (
          <Link
            href={voltarHref}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1e78f0] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> {voltarLabel ?? "Voltar"}
          </Link>
        ) : (
          <div />
        )}

        {/* Seletor de TCC */}
        {outrosTccs.length > 1 && (
          <div className="flex items-center gap-1.5 bg-[#f4f5f7] p-1 rounded-lg border border-[#dfe2e8]">
            <span className="text-[11px] font-semibold text-[#6b7385] px-2">
              Fase do Aluno:
            </span>
            {outrosTccs.map((outro, i) => {
              const ativo = outro.id === tcc.id;
              const rotulo = outro.fase ? `TCC ${outro.fase}` : `TCC ${i + 1}`;
              const href = onTrocarTccHref ? onTrocarTccHref(outro.id) : `/dashboard/tcc/${outro.id}`;

              return (
                <Link
                  key={outro.id}
                  href={href}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                    ativo
                      ? "bg-[#0f1b33] text-white shadow-xs"
                      : "text-[#111a2e] hover:bg-white"
                  }`}
                >
                  {rotulo}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Saudação */}
      {saudacaoNome && (
        <div className="border-b border-[#dfe2e8] pb-3">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111a2e]">
            {isOrientador ? `Acompanhamento &bull; ${tcc.alunoNome}` : `Olá, ${saudacaoNome}`}
          </h1>
          <p className="text-sm text-[#6b7385] mt-1">
            {subtitulo ??
              (isOrientador
                ? "Clique no cartão da etapa para abrir a sala, postar materiais, orientar e avaliar."
                : "Acompanhe o andamento do seu TCC. Clique no cartão da etapa para acessar a sala.")}
          </p>
        </div>
      )}

      {/* Stats Cards com as métricas do protótipo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          label="Conclusão Geral"
          value={`${porcentagemGeral}%`}
          variant="green"
          className="p-5"
        />
        <StatCard
          label="Blocos Concluídos"
          value={`${concluidos} de ${totalMarcos}`}
          variant="blue"
          className="p-5"
        />
        <StatCard
          label="Próxima Entrega"
          value={proximaEntregaTexto}
          variant="yellow"
          icon={<Calendar className="w-5 h-5" />}
          className="p-5"
        />
        <StatCard
          label="Comentários Registrados"
          value={totalComentarios}
          variant="red"
          icon={<MessageSquare className="w-5 h-5" />}
          className="p-5"
        />
      </div>

      {/* Cabeçalho do Trabalho / Informações do TCC */}
      <div className="border border-[#dfe2e8] rounded-[10px] p-6 bg-white shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-[#1e78f0] uppercase tracking-wider">
                {tcc.fase ? `TCC ${tcc.fase}` : "Trabalho de Conclusão de Curso"}
              </span>
              {tcc.curso && (
                <span className="text-[11px] font-semibold bg-blue-50 text-[#1e78f0] px-2 py-0.5 rounded border border-blue-100">
                  {tcc.curso}
                </span>
              )}
              <StatusPill status={ROTULO_STATUS_TCC[tcc.statusGeral] ?? tcc.statusGeral} />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#111a2e] leading-snug">
              {tcc.titulo}
            </h2>
            <p className="text-xs text-[#6b7385]">
              Aluno: <span className="font-semibold text-[#111a2e]">{tcc.alunoNome}</span> (Matrícula: {tcc.aluno_id}) &bull; Orientador:{" "}
              <span className="font-semibold text-[#111a2e]">{tcc.orientadorNome}</span>
            </p>
          </div>

          <div className="min-w-[190px] space-y-1.5 bg-[#f4f5f7] p-3.5 rounded-lg border border-[#dfe2e8]">
            <div className="flex justify-between items-baseline text-xs">
              <span className="text-[#6b7385] font-medium">Progresso Geral</span>
              <b className="text-lg font-bold text-[#111a2e]">{porcentagemGeral}%</b>
            </div>
            <ProgressBar value={porcentagemGeral} className="h-2" />
          </div>
        </div>
      </div>

      {/* Barra de Ferramentas / Alternância Kanban vs Lista */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-[#111a2e]">
            Etapas e Blocos de Trabalho
          </h3>
          <p className="text-xs text-[#6b7385]">
            Clique em qualquer etapa para acessar a sala e realizar as ações.
          </p>
        </div>

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

      {/* Visualização Kanban: O card inteiro é um Link clicável para a página da etapa */}
      {viewMode === "kanban" ? (
        <div className="w-full overflow-x-auto pb-4">
          <div className="grid grid-cols-5 gap-3.5 min-w-[760px]">
            {COLUNAS_KANBAN.map((col) => {
              const blocosDaColuna = itens.filter(
                (item) => mapStatusParaColuna(item.statusEfetivo) === col.key
              );

              return (
                <div
                  key={col.key}
                  className="bg-[#f4f5f7] rounded-[12px] p-3 border-t-4 flex flex-col gap-3 min-h-[200px] shadow-2xs"
                  style={{ borderTopColor: col.cor }}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-[#111a2e] px-1">
                    <span>{col.label}</span>
                    <span className="bg-white border border-[#dfe2e8] rounded-full px-2 py-0.5 text-[11px] font-bold">
                      {blocosDaColuna.length}
                    </span>
                  </div>

                  {blocosDaColuna.length === 0 ? (
                    <p className="text-xs text-[#6b7385] text-center py-6 italic">
                      Nenhum bloco
                    </p>
                  ) : (
                    blocosDaColuna.map((item) => {
                      const idx = itens.indexOf(item);
                      const slug = slugDoMarco(item.marco.titulo, idx);
                      const etapaHref = isOrientador
                        ? `/dashboard/tcc/${tcc.id}/etapa/${slug}`
                        : `/dashboard/aluno/etapa/${slug}`;
                      const progresso = progressoEstimadoPorStatus(item.statusEfetivo);
                      const atrasado = item.statusEfetivo === "ATRASADA";
                      const ultimoFeedback = item.feedbacks[0]?.comentario ?? null;

                      return (
                        <Link
                          key={item.marco.id}
                          href={etapaHref}
                          className={`block border rounded-[10px] p-3.5 bg-white space-y-2.5 shadow-2xs transition-all hover:border-[#1e78f0] hover:shadow-xs cursor-pointer group text-left ${
                            atrasado ? "border-red-300" : "border-[#dfe2e8]"
                          }`}
                        >
                          {/* Cabeçalho do bloco */}
                          <div className="flex items-start justify-between gap-1">
                            <h4 className="text-[12.5px] font-bold text-[#111a2e] group-hover:text-[#1e78f0] transition-colors leading-snug">
                              {idx + 1}. {item.marco.titulo}
                            </h4>
                            {atrasado && (
                              <span className="shrink-0 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 rounded px-1.5 py-0.5">
                                Atrasado
                              </span>
                            )}
                          </div>

                          {/* Progresso do Bloco */}
                          <ProgressBar value={progresso} className="h-1.5" />

                          {/* Métricas do Bloco */}
                          <div className="flex justify-between items-center text-[11px] text-[#6b7385] font-medium">
                            <span>{progresso}% concluído</span>
                            <span>Prazo {formatarData(item.marco.dataLimite)}</span>
                          </div>

                          {/* Comentário da Orientadora / Orientador (Fiel ao protótipo) */}
                          <div className="p-2.5 bg-[#f4f5f7] border-l-2 border-[#1e78f0] rounded-[4px] text-[11.5px] text-[#111a2e]">
                            <b className="block text-[10px] text-[#6b7385] uppercase tracking-wider mb-0.5">
                              Comentário da orientadora
                            </b>
                            <p className="line-clamp-2 leading-relaxed text-[#111a2e]">
                              {ultimoFeedback ?? (progresso === 0 ? "Bloco ainda não iniciado." : "Aguardando nova revisão.")}
                            </p>
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
        /* Visualização em Lista */
        <div className="space-y-4">
          {itens.map(({ marco, entrega, statusEfetivo, versoes, feedbacks }, idx) => {
            const statusLabel = ROTULO_STATUS_ENTREGA[statusEfetivo] ?? statusEfetivo;
            const isConcluido = statusEfetivo === "CONCLUIDA";
            const slug = slugDoMarco(marco.titulo, idx);
            const etapaHref = isOrientador
              ? `/dashboard/tcc/${tcc.id}/etapa/${slug}`
              : `/dashboard/aluno/etapa/${slug}`;

            return (
              <div
                key={marco.id}
                className="border border-[#dfe2e8] rounded-[10px] bg-white overflow-hidden shadow-xs"
              >
                <div className="px-5 py-4 bg-[#f4f5f7] border-b border-[#dfe2e8] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-[#111a2e]">
                      {idx + 1}. {marco.titulo}
                    </h4>
                    <p className="text-xs text-[#6b7385] flex items-center gap-1.5 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-[#6b7385]" /> Prazo limite:{" "}
                      <span className="font-medium text-[#111a2e]">
                        {formatarData(marco.dataLimite)}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={etapaHref}
                      className="px-3 py-1 rounded-md bg-white border border-[#dfe2e8] hover:border-[#1e78f0] text-[#1e78f0] text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <span>Entrar na Sala da Etapa</span>
                    </Link>
                    <StatusPill status={statusLabel} />
                  </div>
                </div>

                <div className="p-5 sm:p-6 space-y-6">
                  {/* Versões */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-xs font-bold text-[#111a2e] uppercase tracking-wider">
                        Versões de Documentos Submetidas ({versoes.length})
                      </h5>
                      {!isOrientador && !isConcluido && (
                        <Link
                          href={etapaHref}
                          className="text-xs font-medium text-[#1e78f0] flex items-center gap-1 cursor-pointer hover:underline"
                        >
                          <UploadCloud className="w-4 h-4" /> Nova versão na Sala
                        </Link>
                      )}
                    </div>

                    {versoes.length === 0 ? (
                      <div className="p-4 rounded-lg border border-dashed border-[#dfe2e8] text-center bg-[#fafbfc]">
                        <p className="text-xs text-[#6b7385]">
                          Nenhum arquivo submetido para este marco ainda.
                        </p>
                      </div>
                    ) : (
                      <ul className="divide-y divide-[#dfe2e8] border border-[#dfe2e8] rounded-lg overflow-hidden bg-white">
                        {versoes.map((v) => (
                          <li
                            key={v.id}
                            className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-[#f4f5f7] transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <FileText className="w-4 h-4 text-[#1e78f0] shrink-0" />
                              <div className="truncate">
                                <span className="text-xs font-semibold text-[#111a2e]">
                                  Versão {v.numeroVersao} &bull;{" "}
                                  {v.arquivoUrl.split("/").pop()}
                                </span>
                                <span className="block text-[11px] text-[#6b7385]">
                                  Enviado em {formatarDataHora(v.dataUpload)}
                                </span>
                              </div>
                            </div>
                            <span className="text-xs font-medium text-[#1e78f0] hover:underline cursor-pointer">
                              Visualizar
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Feedbacks */}
                  {entrega && (
                    <div className="pt-2 border-t border-[#dfe2e8]">
                      <div className="flex items-center gap-1.5 mb-3">
                        <MessageSquare className="w-4 h-4 text-[#6b7385]" />
                        <h5 className="text-xs font-bold text-[#111a2e] uppercase tracking-wider">
                          Feedbacks e Orientações ({feedbacks.length})
                        </h5>
                      </div>

                      {feedbacks.length === 0 ? (
                        <p className="text-xs text-[#6b7385] italic">
                          Nenhum feedback registrado ainda para este marco.
                        </p>
                      ) : (
                        <div className="space-y-2.5">
                          {feedbacks.map((f) => (
                            <div
                              key={f.id}
                              className="p-3.5 rounded-lg bg-[#f4f5f7] border-l-4 border-[#1e78f0] space-y-1"
                            >
                              <div className="flex justify-between items-baseline text-[11px] text-[#6b7385]">
                                <span className="font-semibold text-[#111a2e]">
                                  {f.autorNome}
                                </span>
                                <span>{formatarDataHora(f.data)}</span>
                              </div>
                              <p className="text-xs text-[#111a2e]">{f.comentario}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
