"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  UploadCloud,
  MessageSquare,
  Clock,
  Columns3,
  List,
} from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { ProgressBar } from "@/components/ui/progress-bar";
import {
  ROTULO_STATUS_ENTREGA,
  ROTULO_STATUS_TCC,
  formatarData,
  formatarDataHora,
} from "@/components/layout/status";
import type { ItemMarco, PainelTcc } from "@/lib/data/queries";
import type { StatusEntrega } from "@/types";

interface TccDetalheClientProps {
  painel: PainelTcc;
  voltarHref: string;
  isAluno: boolean;
  isOrientador: boolean;
}

// ── Kanban ──────────────────────────────────────────────────────────────────

const COLUNAS_KANBAN = [
  { key: "Pendente",        label: "Pendente",        cor: "#aeb5c2" },
  { key: "Em andamento",    label: "Em andamento",    cor: "#5aa5ee" },
  { key: "Para correção",   label: "Para correção",   cor: "#f0c93a" },
  { key: "Em correção",     label: "Em correção",     cor: "#ff7f7f" },
  { key: "Concluído",       label: "Concluído",       cor: "#52b565" },
] as const;

type ColKanban = (typeof COLUNAS_KANBAN)[number]["key"];

function statusParaColuna(status: StatusEntrega): ColKanban {
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

function progressoPorStatus(status: StatusEntrega): number {
  switch (status) {
    case "AGUARDANDO_ENVIO": return 0;
    case "ATRASADA":         return 0;
    case "PRONTA_PARA_REVISAO": return 50;
    case "EM_REVISAO":       return 65;
    case "SOLICITADA_CORRECAO": return 40;
    case "CONCLUIDA":        return 100;
    default:                 return 0;
  }
}

interface KanbanBlocoProps {
  item: ItemMarco;
  idx: number;
  isOrientador: boolean;
}

function KanbanBloco({ item, idx, isOrientador }: KanbanBlocoProps) {
  const { marco, statusEfetivo, feedbacks } = item;
  const progresso = progressoPorStatus(statusEfetivo);
  const atrasado = statusEfetivo === "ATRASADA";
  const ultimoFeedback = feedbacks[0]?.comentario ?? null;

  return (
    <div
      className={`border rounded-[10px] p-3.5 bg-white space-y-2.5 shadow-2xs ${
        atrasado
          ? "border-red-300"
          : "border-[#dfe2e8]"
      }`}
    >
      {/* Cabeçalho do bloco */}
      <div className="flex items-start justify-between gap-1">
        <h4 className="text-[11.5px] font-bold text-[#111a2e] leading-snug">
          {idx + 1}. {marco.titulo}
        </h4>
        {atrasado && (
          <span className="shrink-0 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 rounded px-1.5 py-0.5">
            Atrasado
          </span>
        )}
      </div>

      {/* Barra de progresso */}
      <ProgressBar value={progresso} className="h-1.5" />

      {/* Prazo */}
      <div className="flex items-center gap-1 text-[10.5px] text-[#6b7385]">
        <Clock className="w-3 h-3" />
        <span>{formatarData(marco.dataLimite)}</span>
      </div>

      {/* Último feedback / comentário do orientador */}
      {ultimoFeedback ? (
        <div className="p-2 bg-[#f4f5f7] border-l-2 border-[#1e78f0] rounded-[4px]">
          <b className="block text-[10px] text-[#6b7385] uppercase tracking-wider mb-0.5">
            Comentário do orientador
          </b>
          <p className="text-[11px] text-[#111a2e] line-clamp-2 leading-relaxed">
            {ultimoFeedback}
          </p>
        </div>
      ) : (
        <div className="p-2 bg-[#f4f5f7] rounded-[4px]">
          <p className="text-[10.5px] text-[#9aa0ad] italic">Sem comentários ainda.</p>
        </div>
      )}

      {/* Botões de ação do orientador */}
      {isOrientador && statusEfetivo !== "CONCLUIDA" && (
        <div className="flex gap-1.5 pt-1">
          <button
            type="button"
            className="flex-1 py-1 rounded border border-[#dfe2e8] bg-white text-[10.5px] font-semibold text-[#111a2e] hover:bg-[#f4f5f7] transition-colors"
          >
            Solicitar Correção
          </button>
          <button
            type="button"
            className="flex-1 py-1 rounded bg-[#1e78f0] hover:bg-[#1666d3] text-white text-[10.5px] font-semibold transition-colors"
          >
            Concluir
          </button>
        </div>
      )}
    </div>
  );
}

function KanbanView({
  itens,
  isOrientador,
}: {
  itens: ItemMarco[];
  isOrientador: boolean;
}) {
  return (
    /* Scroll horizontal em telas menores, 5 colunas lado a lado em desktop */
    <div className="w-full overflow-x-auto pb-4">
      <div className="grid grid-cols-5 gap-3.5 min-w-[700px]">
        {COLUNAS_KANBAN.map((col) => {
          const blocos = itens.filter(
            (item) => statusParaColuna(item.statusEfetivo) === col.key
          );
          return (
            <div
              key={col.key}
              className="bg-[#f4f5f7] rounded-[12px] p-3 border-t-4 flex flex-col gap-3 min-h-[200px] shadow-2xs"
              style={{ borderTopColor: col.cor }}
            >
              {/* Cabeçalho da coluna */}
              <div className="flex items-center justify-between text-xs font-bold text-[#111a2e] px-1">
                <span>{col.label}</span>
                <span className="bg-white border border-[#dfe2e8] rounded-full px-2 py-0.5 text-[11px] font-bold">
                  {blocos.length}
                </span>
              </div>

              {blocos.length === 0 ? (
                <p className="text-xs text-[#6b7385] text-center py-6 italic">
                  Nenhum bloco
                </p>
              ) : (
                blocos.map((item, i) => (
                  <KanbanBloco
                    key={item.marco.id}
                    item={item}
                    idx={itens.indexOf(item)}
                    isOrientador={isOrientador}
                  />
                ))
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Lista detalhada (view original, mantida) ────────────────────────────────

function ListaDetalhadaView({
  itens,
  isAluno,
  isOrientador,
}: {
  itens: ItemMarco[];
  isAluno: boolean;
  isOrientador: boolean;
}) {
  return (
    <div className="space-y-4">
      {itens.map(({ marco, entrega, statusEfetivo, versoes, feedbacks }, idx) => {
        const statusLabel = ROTULO_STATUS_ENTREGA[statusEfetivo] ?? statusEfetivo;
        const isConcluido = statusEfetivo === "CONCLUIDA";

        return (
          <div
            key={marco.id}
            className="border border-[#dfe2e8] rounded-[10px] bg-white overflow-hidden shadow-xs"
          >
            {/* Topo do Marco */}
            <div className="px-5 py-4 bg-[#f4f5f7] border-b border-[#dfe2e8] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#111a2e]">
                  {idx + 1}. {marco.titulo}
                </h3>
                <p className="text-xs text-[#6b7385] flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-[#6b7385]" /> Prazo limite:{" "}
                  <span className="font-medium text-[#111a2e]">
                    {formatarData(marco.dataLimite)}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill status={statusLabel} />
              </div>
            </div>

            {/* Conteúdo do Marco */}
            <div className="p-5 sm:p-6 space-y-6">
              {/* Versões */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-[#111a2e] uppercase tracking-wider">
                    Versões de Documentos Submetidas ({versoes.length})
                  </h4>
                  {isAluno && !isConcluido && (
                    <span className="text-xs font-medium text-[#1e78f0] flex items-center gap-1 cursor-pointer hover:underline">
                      <UploadCloud className="w-4 h-4" /> Nova versão (.pdf, .docx)
                    </span>
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
                    <h4 className="text-xs font-bold text-[#111a2e] uppercase tracking-wider">
                      Feedbacks e Orientações ({feedbacks.length})
                    </h4>
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

              {/* Ações do Orientador */}
              {isOrientador && (
                <div className="pt-3 border-t border-[#dfe2e8] flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    className="px-3.5 py-1.5 rounded-lg border border-[#dfe2e8] bg-white text-xs font-semibold text-[#111a2e] hover:bg-[#f4f5f7] transition-colors"
                  >
                    Solicitar Correção
                  </button>
                  <button
                    type="button"
                    className="px-3.5 py-1.5 rounded-lg bg-[#1e78f0] hover:bg-[#1666d3] text-white text-xs font-semibold transition-colors shadow-xs"
                  >
                    Marcar como Concluído
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Componente principal ────────────────────────────────────────────────────

export function TccDetalheClient({
  painel,
  voltarHref,
  isAluno,
  isOrientador,
}: TccDetalheClientProps) {
  const { tcc, itens, outrosTccsDoAluno = [] } = painel;
  const [viewMode, setViewMode] = useState<"kanban" | "lista">("kanban");

  const totalMarcos = itens.length;
  const concluidos = itens.filter((i) => i.statusEfetivo === "CONCLUIDA").length;
  const porcentagemGeral =
    totalMarcos > 0 ? Math.round((concluidos / totalMarcos) * 100) : 0;

  return (
    <div className="space-y-6 w-full">
      {/* Navegação: voltar + seletor de fase */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          href={voltarHref}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1e78f0] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar ao Painel
        </Link>

        {outrosTccsDoAluno.length > 1 && (
          <div className="flex items-center gap-1.5 bg-[#f4f5f7] p-1 rounded-lg border border-[#dfe2e8]">
            <span className="text-[11px] font-semibold text-[#6b7385] px-2">
              Fase do Aluno:
            </span>
            {outrosTccsDoAluno.map((outro, i) => {
              const ativo = outro.id === tcc.id;
              const rotulo = outro.fase ? `TCC ${outro.fase}` : `TCC ${i + 1}`;
              return (
                <Link
                  key={outro.id}
                  href={`/dashboard/tcc/${outro.id}`}
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

      {/* Cabeçalho do TCC */}
      <div className="border border-[#dfe2e8] rounded-[10px] p-6 bg-white shadow-xs">
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
            <h1 className="text-xl sm:text-2xl font-bold text-[#111a2e] leading-snug">
              {tcc.titulo}
            </h1>
            <p className="text-xs text-[#6b7385]">
              Aluno:{" "}
              <span className="font-semibold text-[#111a2e]">{tcc.alunoNome}</span>{" "}
              (Matrícula: {tcc.aluno_id}) &bull; Orientador:{" "}
              <span className="font-semibold text-[#111a2e]">{tcc.orientadorNome}</span>
            </p>
          </div>

          <div className="min-w-[180px] space-y-1.5 bg-[#f4f5f7] p-3.5 rounded-lg border border-[#dfe2e8]">
            <div className="flex justify-between items-baseline text-xs">
              <span className="text-[#6b7385] font-medium">Progresso Geral</span>
              <b className="text-lg font-bold text-[#111a2e]">{porcentagemGeral}%</b>
            </div>
            <ProgressBar value={porcentagemGeral} className="h-2" />
          </div>
        </div>
      </div>

      {/* Toolbar: título da seção + seletor de view */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-[#111a2e]">
            Marcos e Blocos de Trabalho
          </h2>
          <p className="text-xs text-[#6b7385]">
            {concluidos} de {totalMarcos} marcos concluídos
          </p>
        </div>

        <div className="flex items-center gap-1 bg-[#f4f5f7] p-1 rounded-lg border border-[#dfe2e8]">
          <button
            type="button"
            onClick={() => setViewMode("kanban")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all ${
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all ${
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

      {/* Conteúdo: Kanban ou Lista */}
      {viewMode === "kanban" ? (
        <KanbanView itens={itens} isOrientador={isOrientador} />
      ) : (
        <ListaDetalhadaView
          itens={itens}
          isAluno={isAluno}
          isOrientador={isOrientador}
        />
      )}
    </div>
  );
}
