import type { Avaliacao, DecisaoBanca } from "@/types";

/**
 * Etapa de um TCC do ponto de vista de UM avaliador da banca.
 * Deriva do que existe no banco (versão final enviada + avaliação do avaliador),
 * e não do `statusGeral` do TCC, que é do trabalho como um todo.
 */
export type EtapaBanca =
  | "AGUARDANDO_ENVIO"
  | "PRONTA_PARA_AVALIAR"
  | "EM_AVALIACAO"
  | "AVALIADA";

export const ROTULO_ETAPA_BANCA: Record<EtapaBanca, string> = {
  AGUARDANDO_ENVIO: "Aguardando envio",
  PRONTA_PARA_AVALIAR: "Pronta para avaliar",
  EM_AVALIACAO: "Em avaliação",
  AVALIADA: "Avaliada",
};

export const ROTULO_DECISAO: Record<DecisaoBanca, string> = {
  APROVADO: "Aprovado",
  APROVADO_RESSALVAS: "Aprovado com ressalvas",
  REPROVADO: "Reprovado",
};

export function etapaBanca(
  temVersaoFinal: boolean,
  avaliacao: Pick<Avaliacao, "status"> | null,
): EtapaBanca {
  if (avaliacao?.status === "FINALIZADA") return "AVALIADA";
  if (avaliacao?.status === "RASCUNHO") return "EM_AVALIACAO";
  return temVersaoFinal ? "PRONTA_PARA_AVALIAR" : "AGUARDANDO_ENVIO";
}

// ---------- Validação da avaliação (usada pela rota e pelo formulário) ----------

export const PARECER_MIN_FINAL = 20;
export const PARECER_MAX = 5000;

export interface AvaliacaoEntrada {
  finalizar: boolean;
  nota?: unknown;
  decisao?: unknown;
  parecer?: unknown;
}

export interface AvaliacaoValida {
  status: "RASCUNHO" | "FINALIZADA";
  nota?: number;
  decisao?: DecisaoBanca;
  parecer: string;
}

export type ResultadoValidacao =
  | { ok: true; valor: AvaliacaoValida }
  | { ok: false; mensagem: string };

const DECISOES: readonly DecisaoBanca[] = ["APROVADO", "APROVADO_RESSALVAS", "REPROVADO"];

/** Aceita "9.5", "9,5" ou número; devolve undefined se vazio, NaN se inválido. */
export function lerNota(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = typeof v === "number" ? v : Number(String(v).trim().replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : Number.NaN;
}

export function validarAvaliacao(entrada: AvaliacaoEntrada): ResultadoValidacao {
  const parecer = typeof entrada.parecer === "string" ? entrada.parecer.trim() : "";
  if (parecer.length > PARECER_MAX) {
    return { ok: false, mensagem: `O parecer pode ter no máximo ${PARECER_MAX} caracteres.` };
  }

  const nota = lerNota(entrada.nota);
  if (nota !== undefined && (Number.isNaN(nota) || nota < 0 || nota > 10)) {
    return { ok: false, mensagem: "A nota deve ser um número entre 0 e 10." };
  }

  let decisao: DecisaoBanca | undefined;
  if (entrada.decisao !== undefined && entrada.decisao !== null && entrada.decisao !== "") {
    if (!DECISOES.includes(entrada.decisao as DecisaoBanca)) {
      return { ok: false, mensagem: "Decisão da banca inválida." };
    }
    decisao = entrada.decisao as DecisaoBanca;
  }

  if (!entrada.finalizar) {
    // Rascunho: aceita campos parciais, mas não grava um rascunho totalmente vazio.
    if (nota === undefined && !decisao && !parecer) {
      return { ok: false, mensagem: "Preencha ao menos um campo para salvar o rascunho." };
    }
    return { ok: true, valor: { status: "RASCUNHO", nota, decisao, parecer } };
  }

  if (nota === undefined) return { ok: false, mensagem: "Informe a nota final para finalizar." };
  if (!decisao) return { ok: false, mensagem: "Escolha a decisão da banca para finalizar." };
  if (parecer.length < PARECER_MIN_FINAL) {
    return {
      ok: false,
      mensagem: `O parecer precisa ter pelo menos ${PARECER_MIN_FINAL} caracteres para finalizar.`,
    };
  }
  return { ok: true, valor: { status: "FINALIZADA", nota, decisao, parecer } };
}
