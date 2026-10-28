"use client";

import React from "react";
import Link from "next/link";
import { StatCard } from "@/components/ui/stat-card";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { TccResumo, PainelTcc } from "@/lib/data/queries";
import { Calendar, MessageSquare, ArrowRight } from "lucide-react";
import { SALAS_ETAPAS_MOCK } from "./dados-etapas";

interface AlunoDashboardClientProps {
  nomeAluno: string;
  tccs: TccResumo[];
  detalhesPrincipal: PainelTcc | null;
}

const COLUNAS_KANBAN = [
  { key: "Pendente", label: "Pendente", corBorda: "#aeb5c2" },
  { key: "Em andamento", label: "Em andamento", corBorda: "#5aa5ee" },
  { key: "Para correção", label: "Para correção", corBorda: "#f0c93a" },
  { key: "Em correção", label: "Em correção", corBorda: "#ff7f7f" },
  { key: "Concluído", label: "Concluído", corBorda: "#52b565" },
] as const;

export function AlunoDashboardClient({
  nomeAluno,
  tccs,
}: AlunoDashboardClientProps) {
  const tccPrincipal = tccs[0] ?? null;
  const blocos = SALAS_ETAPAS_MOCK;

  const totalBlocos = blocos.length;
  const mediaProgressoGeral =
    totalBlocos > 0 ? Math.round(blocos.reduce((acc, b) => acc + b.progresso, 0) / totalBlocos) : 0;
  const concluidos = blocos.filter((b) => b.progresso === 100).length;

  return (
    <div className="space-y-8 w-full">
      {/* Cabeçalho */}
      <div className="border-b border-[#dfe2e8] pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111a2e]">
          Olá, {nomeAluno}
        </h1>
        <p className="text-sm text-[#6b7385] mt-1">
          Acompanhe o andamento do seu TCC. Clique em qualquer etapa para entrar na sala com as postagens do professor e envio.
        </p>
      </div>

      {/* Stats Cards com as métricas do protótipo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          label="Conclusão Geral"
          value={`${mediaProgressoGeral}%`}
          variant="green"
          className="p-5"
        />
        <StatCard
          label="Blocos Concluídos"
          value={`${concluidos} de ${totalBlocos}`}
          variant="blue"
          className="p-5"
        />
        <StatCard
          label="Próxima Entrega"
          value="07/10/2026"
          variant="yellow"
          icon={<Calendar className="w-5 h-5" />}
          className="p-5"
        />
        <StatCard
          label="Comentários Recebidos"
          value={blocos.filter((b) => b.progresso > 0).length}
          variant="red"
          icon={<MessageSquare className="w-5 h-5" />}
          className="p-5"
        />
      </div>

      {/* Cabeçalho do TCC do aluno */}
      <div className="border border-[#dfe2e8] rounded-[10px] p-6 bg-white shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-[#1e78f0] uppercase tracking-wider">
              {tccPrincipal ? "Trabalho de Conclusão de Curso" : "TCC em Elaboração"}
            </span>
            <h2 className="text-xl font-bold text-[#111a2e] mt-1">
              {tccPrincipal?.titulo ?? "Inteligência Artificial Aplicada à Educação"}
            </h2>
            <p className="text-xs text-[#6b7385] mt-1">
              Aluno: <span className="font-semibold text-[#111a2e]">{nomeAluno}</span> &bull; Orientação:{" "}
              <span className="font-semibold text-[#111a2e]">
                {tccPrincipal?.orientadorNome ?? "Prof.ª Joana Jordão"}
              </span>
            </p>
          </div>

          <div className="min-w-[190px] space-y-1.5 bg-[#f4f5f7] p-3.5 rounded-lg border border-[#dfe2e8]">
            <div className="flex justify-between items-baseline text-xs">
              <span className="text-[#6b7385] font-medium">Progresso Geral</span>
              <b className="text-xl font-bold text-[#111a2e]">{mediaProgressoGeral}%</b>
            </div>
            <ProgressBar value={mediaProgressoGeral} className="h-2" />
          </div>
        </div>
      </div>

      {/* Estrutura Exata do Protótipo: Colunas Kanban Clicáveis para Páginas */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#111a2e]">
              Etapas e Blocos de Trabalho
            </h3>
            <p className="text-xs text-[#6b7385]">
              Clique em qualquer bloco para acessar a sala da etapa com o mural de postagens do professor e área de submissão.
            </p>
          </div>
        </div>

        {/* Grade de 5 Colunas do Protótipo */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5 overflow-x-auto pb-4 items-start">
          {COLUNAS_KANBAN.map((col) => {
            const blocosDaColuna = blocos.filter((b) => b.statusKanban === col.key);

            return (
              <div
                key={col.key}
                className="bg-[#f4f5f7] rounded-[12px] p-3 border-t-4 flex flex-col gap-3 min-h-[160px] shadow-2xs"
                style={{ borderTopColor: col.corBorda }}
              >
                {/* Topo da Coluna */}
                <div className="flex items-center justify-between text-xs font-bold text-[#111a2e] px-1">
                  <span>{col.label}</span>
                  <span className="bg-white border border-[#dfe2e8] rounded-full px-2 py-0.5 text-[11px] font-bold text-[#111a2e]">
                    {blocosDaColuna.length}
                  </span>
                </div>

                {/* Blocos que Navegam para a Página da Etapa */}
                {blocosDaColuna.length === 0 ? (
                  <p className="text-xs text-[#6b7385] text-center py-6 italic">
                    Nenhum bloco
                  </p>
                ) : (
                  blocosDaColuna.map((bloco) => (
                    <Link
                      key={bloco.slug}
                      href={`/dashboard/aluno/etapa/${bloco.slug}`}
                      className="text-left w-full border border-[#dfe2e8] rounded-[10px] p-3.5 bg-white hover:border-[#1e78f0] hover:shadow-xs transition-all cursor-pointer group block"
                    >
                      <div className="flex items-start justify-between gap-1 mb-2">
                        <h4 className="text-xs font-bold text-[#111a2e] group-hover:text-[#1e78f0] transition-colors leading-snug">
                          {bloco.titulo}
                        </h4>
                        <ArrowRight className="w-3.5 h-3.5 text-[#6b7385] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </div>

                      {/* Barra de Progresso do Bloco */}
                      <ProgressBar value={bloco.progresso} className="h-1.5 mb-2" />

                      {/* Métricas do Bloco */}
                      <div className="flex justify-between items-center text-[11px] text-[#6b7385] mb-2.5 font-medium">
                        <span>{bloco.progresso}% concluído</span>
                        <span>Entrega {bloco.dataEntrega}</span>
                      </div>

                      {/* Comentário da Orientadora */}
                      <div className="p-2.5 bg-[#f4f5f7] border-l-2 border-[#1e78f0] rounded-[4px] text-[11.5px] text-[#111a2e]">
                        <b className="block text-[10px] text-[#6b7385] uppercase tracking-wider mb-0.5">
                          Comentário da orientadora
                        </b>
                        <p className="line-clamp-2 leading-relaxed text-[#111a2e]">
                          {bloco.comentarioOrientadora}
                        </p>
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
