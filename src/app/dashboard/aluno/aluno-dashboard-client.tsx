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
  tccIdAtivo,
}: AlunoDashboardClientProps) {
  const tccPrincipal = tccs.find((t) => t.id === tccIdAtivo) ?? tccs[0] ?? null;

  // Garante que o aluno (como o Jorge) visualize SEMPRE todos os blocos e etapas populados com dados ricos
  const itens: ItemMarco[] = SALAS_ETAPAS_MOCK.map((etapa, idx) => {
    let statusEfetivo: "CONCLUIDA" | "PRONTA_PARA_REVISAO" | "EM_REVISAO" | "SOLICITADA_CORRECAO" | "AGUARDANDO_ENVIO" = "AGUARDANDO_ENVIO";
    if (etapa.statusKanban === "Concluído") statusEfetivo = "CONCLUIDA";
    else if (etapa.statusKanban === "Para correção") statusEfetivo = "PRONTA_PARA_REVISAO";
    else if (etapa.statusKanban === "Em correção") statusEfetivo = "EM_REVISAO";
    else if (etapa.statusKanban === "Em andamento") statusEfetivo = "EM_ANDAMENTO" as any;
    else statusEfetivo = "AGUARDANDO_ENVIO";

    return {
      marco: {
        id: `marco-${idx + 1}`,
        titulo: etapa.titulo,
        dataLimite: new Date("2026-10-28T00:00:00.000Z"),
        cronograma_id: "cronograma-padrao",
        progresso: etapa.progresso,
        dataEntregaFormatada: etapa.dataEntrega,
      } as any,
      entrega: etapa.historicoEnvios.length > 0 ? {
        id: `ent-${idx + 1}`,
        tcc_id: tccPrincipal?.id ?? "tcc-principal",
        marco_id: `marco-${idx + 1}`,
        status: statusEfetivo,
        dataSubmissao: new Date(),
      } : null,
      statusEfetivo,
      progresso: etapa.progresso,
      versoes: etapa.historicoEnvios.map((h, vIdx) => ({
        id: `v-${idx}-${vIdx}`,
        numeroVersao: h.versao,
        arquivoUrl: `#/${h.arquivoNome}`,
        dataUpload: new Date(),
        entrega_id: `ent-${idx + 1}`,
      })),
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
    } as any;
  });

  const tccMock: TccResumo = {
    id: tccPrincipal?.id ?? "tcc-principal",
    titulo: tccPrincipal?.titulo && tccPrincipal.titulo !== "Sem título"
      ? tccPrincipal.titulo
      : "SGTCC: Sistema Web para Gestão e Orientação de TCC no Ensino Superior",
    aluno_id: tccPrincipal?.aluno_id ?? "20231BSI0142",
    orientador_id: tccPrincipal?.orientador_id ?? "prof-joana",
    statusGeral: "EM_ANDAMENTO",
    alunoNome: nomeAluno || "Jorge",
    orientadorNome: tccPrincipal?.orientadorNome ?? "Prof.ª Joana Jordão",
    fase: tccPrincipal?.fase ?? 2,
    curso: tccPrincipal?.curso ?? "Sistemas de Informação",
  };

  return (
    <PainelTccModular
      tcc={tccMock}
      itens={itens}
      papel="aluno"
      saudacaoNome={nomeAluno || "Jorge"}
      subtitulo="Acompanhe o andamento do seu TCC. Clique nas etapas para acessar a sala com postagens, materiais e envios."
      outrosTccs={tccs.length > 0 ? tccs : [tccMock]}
      onTrocarTccHref={(tccId) => `/dashboard/aluno?tcc=${tccId}`}
    />
  );
}
