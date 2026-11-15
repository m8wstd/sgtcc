import type { StatusEntrega } from "@/types";
import { EntregaError } from "./errors";

export const ACOES_ENTREGA = ["INICIAR_REVISAO", "SOLICITAR_CORRECAO", "CONCLUIR"] as const;
export type AcaoEntrega = (typeof ACOES_ENTREGA)[number];

const TRANSICOES: Partial<Record<StatusEntrega, Partial<Record<AcaoEntrega, StatusEntrega>>>> = {
  PRONTA_PARA_REVISAO: { INICIAR_REVISAO: "EM_REVISAO" },
  EM_REVISAO: { SOLICITAR_CORRECAO: "SOLICITADA_CORRECAO", CONCLUIR: "CONCLUIDA" },
};

export function acoesParaStatus(status: StatusEntrega): AcaoEntrega[] {
  return Object.keys(TRANSICOES[status] ?? {}) as AcaoEntrega[];
}

export function proximoStatus(status: StatusEntrega, acao: AcaoEntrega): StatusEntrega {
  const destino = TRANSICOES[status]?.[acao];
  if (!destino) {
    throw new EntregaError(409, "INVALID_TRANSITION", "Esta ação não está disponível no status atual. Atualize a página.");
  }
  return destino;
}
