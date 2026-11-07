"use client";

import React from "react";
import type { PainelTcc, ItemMarco } from "@/lib/data/queries";
import { PainelTccModular } from "@/components/tcc-view/painel-tcc-modular";
import { SalaBancaView } from "@/components/etapa/sala-banca-view";
import { SALAS_ETAPAS_MOCK } from "@/app/dashboard/aluno/dados-etapas";

interface TccDetalheClientProps {
  painel: PainelTcc;
  voltarHref: string;
  isAluno: boolean;
  isOrientador: boolean;
  isAvaliador?: boolean;
}

export function TccDetalheClient({
  painel,
  voltarHref,
  isOrientador,
  isAvaliador,
}: TccDetalheClientProps) {
  const { tcc, outrosTccsDoAluno = [] } = painel;

  // Se o usuário logado for membro da BANCA AVALIADORA, ele vê diretamente o projeto final para avaliação
  if (isAvaliador) {
    return (
      <SalaBancaView
        tcc={tcc}
        nomeUsuario="Professor(a) Avaliador(a)"
        papelUsuario="avaliador"
        voltarHref={voltarHref}
      />
    );
  }

  // Gera as etapas fictícias ricas do frontend com dados completos para visualização
  const itensFicticios: ItemMarco[] = SALAS_ETAPAS_MOCK.map((etapa, idx) => {
    let statusEfetivo: "CONCLUIDA" | "PRONTA_PARA_REVISAO" | "EM_REVISAO" | "SOLICITADA_CORRECAO" | "AGUARDANDO_ENVIO" = "AGUARDANDO_ENVIO";
    if (etapa.statusKanban === "Concluído") statusEfetivo = "CONCLUIDA";
    else if (etapa.statusKanban === "Em andamento") statusEfetivo = "PRONTA_PARA_REVISAO";
    else if (etapa.statusKanban === "Para correção") statusEfetivo = "EM_REVISAO";
    else if (etapa.statusKanban === "Em correção") statusEfetivo = "SOLICITADA_CORRECAO";

    return {
      marco: {
        id: `marco-${idx + 1}`,
        titulo: etapa.titulo,
        dataLimite: new Date(
          etapa.dataEntrega.split("/").reverse().join("-") + "T23:59:00.000Z"
        ),
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
              autorNome: tcc.orientadorNome || "Prof.ª Joana Jordão",
              comentario: etapa.comentarioOrientadora,
              data: new Date("2026-10-20T14:30:00.000Z"),
            },
          ]
        : [],
    };
  });

  return (
    <PainelTccModular
      tcc={tcc}
      itens={itensFicticios}
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
