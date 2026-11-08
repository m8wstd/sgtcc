"use client";

import React from "react";
import type { TccResumo, PainelTcc, ItemMarco } from "@/lib/data/queries";
import { PainelTccModular } from "@/components/tcc-view/painel-tcc-modular";

interface AlunoDashboardClientProps {
  nomeAluno: string;
  tccs: TccResumo[];
  detalhesPrincipal: PainelTcc | null;
  tccIdAtivo?: string | null;
}

export function AlunoDashboardClient({
  nomeAluno,
  tccs,
  detalhesPrincipal,
  tccIdAtivo,
}: AlunoDashboardClientProps) {
  const tccPrincipal = tccs.find((t) => t.id === tccIdAtivo) ?? tccs[0] ?? null;

  // Itens reais do banco de dados (vindos de getPainelTcc)
  const itens: ItemMarco[] = detalhesPrincipal?.itens ?? [];

  const tccMock: TccResumo = tccPrincipal ?? {
    id: "tcc-principal",
    titulo: "Trabalho de Conclusão de Curso",
    aluno_id: "aluno",
    orientador_id: "orientador",
    statusGeral: "EM_ANDAMENTO",
    alunoNome: nomeAluno,
    orientadorNome: "Orientador",
    fase: 1,
    curso: "Graduação",
  };

  return (
    <PainelTccModular
      tcc={tccMock}
      itens={itens}
      papel="aluno"
      saudacaoNome={nomeAluno}
      subtitulo="Acompanhe o andamento do seu TCC. Selecione a disciplina e clique nas etapas para acessar a sala."
      outrosTccs={tccs}
      onTrocarTccHref={(tccId) => `/dashboard/aluno?tcc=${tccId}`}
    />
  );
}
