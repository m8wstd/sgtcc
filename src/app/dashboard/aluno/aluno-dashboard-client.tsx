"use client";

import React from "react";
import type { TccResumo, PainelTcc } from "@/lib/data/queries";
import { PainelTccModular } from "@/components/tcc-view/painel-tcc-modular";

interface AlunoDashboardClientProps {
  nomeAluno: string;
  tccs: TccResumo[];
  detalhesPrincipal: PainelTcc | null;
  tccIdAtivo?: string | null;
}

export function AlunoDashboardClient({ nomeAluno, tccs, detalhesPrincipal }: AlunoDashboardClientProps) {
  if (!detalhesPrincipal) return <p className="text-sm text-[#6b7385]">Nenhum TCC vinculado ao seu usuário.</p>;
  return (
    <PainelTccModular
      tcc={detalhesPrincipal.tcc}
      itens={detalhesPrincipal.itens}
      papel="aluno"
      saudacaoNome={nomeAluno}
      subtitulo="Acompanhe as etapas do seu TCC e consulte os arquivos realmente enviados."
      outrosTccs={tccs}
      onTrocarTccHref={(tccId) => `/dashboard/aluno?tcc=${encodeURIComponent(tccId)}`}
    />
  );
}
