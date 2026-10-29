"use client";

import React from "react";
import type { TccResumo, PainelTcc, ItemMarco } from "@/lib/data/queries";
import { PainelTccModular } from "@/components/tcc-view/painel-tcc-modular";
import { SALAS_ETAPAS_MOCK } from "./dados-etapas";

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

  // Se tiver itens reais do Firestore no detalhesPrincipal, usamos eles.
  // Senão, mapeamos do SALAS_ETAPAS_MOCK para a mesma interface ItemMarco.
  const itens: ItemMarco[] = detalhesPrincipal?.itens?.length
    ? detalhesPrincipal.itens
    : SALAS_ETAPAS_MOCK.map((etapa, idx) => {
        let statusEfetivo: "CONCLUIDA" | "PRONTA_PARA_REVISAO" | "EM_REVISAO" | "SOLICITADA_CORRECAO" | "AGUARDANDO_ENVIO" = "AGUARDANDO_ENVIO";
        if (etapa.statusKanban === "Concluído") statusEfetivo = "CONCLUIDA";
        else if (etapa.statusKanban === "Em andamento") statusEfetivo = "PRONTA_PARA_REVISAO";
        else if (etapa.statusKanban === "Para correção") statusEfetivo = "EM_REVISAO";
        else if (etapa.statusKanban === "Em correção") statusEfetivo = "SOLICITADA_CORRECAO";

        return {
          marco: {
            id: `marco-${idx + 1}`,
            titulo: etapa.titulo,
            dataLimite: new Date("2026-10-28T00:00:00.000Z"),
            cronograma_id: "cronograma-padrao",
          },
          entrega: null,
          statusEfetivo,
          versoes: [],
          feedbacks: etapa.comentarioOrientadora
            ? [
                {
                  id: `fb-${idx + 1}`,
                  entrega_id: `ent-${idx + 1}`,
                  autor_id: "orientador-padrao",
                  autorNome: "Prof.ª Joana Jordão",
                  comentario: etapa.comentarioOrientadora,
                  data: new Date("2026-10-20T14:30:00.000Z"),
                },
              ]
            : [],
        };
      });

  const tccMock: TccResumo = tccPrincipal ?? {
    id: "tcc-principal",
    titulo: "Inteligência Artificial Aplicada à Educação",
    aluno_id: "123456",
    orientador_id: "prof-1",
    statusGeral: "EM_ANDAMENTO",
    alunoNome: nomeAluno,
    orientadorNome: "Prof.ª Joana Jordão",
    fase: 1,
    curso: "Engenharia de Software",
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
