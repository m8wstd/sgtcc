import React from "react";
import Link from "next/link";
import { ArrowLeft, FileText, UploadCloud, MessageSquare, AlertCircle, Clock } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { ProgressBar } from "@/components/ui/progress-bar";
import {
  ROTULO_STATUS_ENTREGA,
  ROTULO_STATUS_TCC,
  formatarData,
  formatarDataHora,
} from "@/components/layout/status";
import type { PainelTcc } from "@/lib/data/queries";

interface TccDetalheClientProps {
  painel: PainelTcc;
  voltarHref: string;
  isAluno: boolean;
  isOrientador: boolean;
}

export function TccDetalheClient({
  painel,
  voltarHref,
  isAluno,
  isOrientador,
}: TccDetalheClientProps) {
  const { tcc, itens } = painel;

  const totalMarcos = itens.length;
  const concluidos = itens.filter((i) => i.statusEfetivo === "CONCLUIDA").length;
  const porcentagemGeral = totalMarcos > 0 ? Math.round((concluidos / totalMarcos) * 100) : 0;

  return (
    <div className="space-y-6 w-full">
      {/* Botão de Retorno */}
      <div>
        <Link
          href={voltarHref}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1e78f0] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar ao Painel
        </Link>
      </div>

      {/* Cabeçalho do TCC */}
      <div className="border border-[#dfe2e8] rounded-[10px] p-6 bg-white shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#1e78f0] uppercase tracking-wider">
                Trabalho de Conclusão de Curso
              </span>
              <StatusPill status={ROTULO_STATUS_TCC[tcc.statusGeral] ?? tcc.statusGeral} />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#111a2e] leading-snug">
              {tcc.titulo}
            </h1>
            <p className="text-xs text-[#6b7385]">
              Aluno: <span className="font-semibold text-[#111a2e]">{tcc.alunoNome}</span> (Matrícula: {tcc.aluno_id}) &bull; Orientador:{" "}
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

      {/* Lista de Marcos, Entregas e Histórico */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#111a2e]">
            Marcos e Histórico de Entregas
          </h2>
          <span className="text-xs text-[#6b7385] font-medium">
            {concluidos} de {totalMarcos} marcos concluídos
          </span>
        </div>

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
                      <span className="font-medium text-[#111a2e]">{formatarData(marco.dataLimite)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill status={statusLabel} />
                  </div>
                </div>

                {/* Conteúdo do Marco */}
                <div className="p-5 sm:p-6 space-y-6">
                  {/* Versões Enviadas */}
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
                        <p className="text-xs text-[#6b7385]">Nenhum arquivo submetido para este marco ainda.</p>
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
                                  Versão {v.numeroVersao} &bull; {v.arquivoUrl.split("/").pop()}
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

                  {/* Feedbacks do Orientador */}
                  {entrega && (
                    <div className="pt-2 border-t border-[#dfe2e8]">
                      <div className="flex items-center gap-1.5 mb-3">
                        <MessageSquare className="w-4 h-4 text-[#6b7385]" />
                        <h4 className="text-xs font-bold text-[#111a2e] uppercase tracking-wider">
                          Feedbacks e Orientações ({feedbacks.length})
                        </h4>
                      </div>

                      {feedbacks.length === 0 ? (
                        <p className="text-xs text-[#6b7385] italic">Nenhum feedback registrado ainda para este marco.</p>
                      ) : (
                        <div className="space-y-2.5">
                          {feedbacks.map((f) => (
                            <div
                              key={f.id}
                              className="p-3.5 rounded-lg bg-[#f4f5f7] border-l-4 border-[#1e78f0] space-y-1"
                            >
                              <div className="flex justify-between items-baseline text-[11px] text-[#6b7385]">
                                <span className="font-semibold text-[#111a2e]">{f.autorNome}</span>
                                <span>{formatarDataHora(f.data)}</span>
                              </div>
                              <p className="text-xs text-[#111a2e]">{f.comentario}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Ações do Orientador (RF04 / US06) */}
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
      </div>
    </div>
  );
}
