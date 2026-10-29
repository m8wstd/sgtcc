"use client";

import React from "react";
import type { PainelTcc } from "@/lib/data/queries";
import { PainelTccModular } from "@/components/tcc-view/painel-tcc-modular";

interface TccDetalheClientProps {
  painel: PainelTcc;
  voltarHref: string;
  isAluno: boolean;
  isOrientador: boolean;
}

export function TccDetalheClient({
  painel,
  voltarHref,
  isOrientador,
}: TccDetalheClientProps) {
  const { tcc, itens, outrosTccsDoAluno = [] } = painel;

  return (
    <PainelTccModular
      tcc={tcc}
      itens={itens}
      papel={isOrientador ? "orientador" : "aluno"}
      voltarHref={voltarHref}
      voltarLabel="Voltar ao Painel"
      saudacaoNome={isOrientador ? tcc.alunoNome : undefined}
      subtitulo={
        isOrientador
          ? "Visualização do trabalho do orientando com Kanban e acesso direto a cada sala de etapa para postar e orientar."
          : undefined
      }
      outrosTccs={outrosTccsDoAluno}
      onTrocarTccHref={(tccId) => `/dashboard/tcc/${tccId}`}
    />
  );
}
