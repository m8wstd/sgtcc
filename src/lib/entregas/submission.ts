import type { ConfirmadorSubmissao, RegistroEntrega, VersaoPersistida } from "./contracts";
import { EntregaError } from "./errors";

// A integração de confirmação da RF03 ainda não está disponível nesta base.
// Não considerar URL ou metadados como prova de upload.
export const confirmadorSubmissaoRF03: ConfirmadorSubmissao = {
  async confirmar() {
    throw new EntregaError(503, "RF03_NOT_INTEGRATED", "A confirmação do envio está indisponível. Nenhuma alteração foi realizada.");
  },
};

function metadadosValidos(item: VersaoPersistida, entregaId: string): boolean {
  const v = item.versao;
  if (v.entrega_id !== entregaId || !v.id || !Number.isSafeInteger(v.numeroVersao) || v.numeroVersao < 1
    || !Number.isFinite(item.uploadEmMillis) || !Number.isFinite(item.criadaEmMillis)) return false;
  try {
    const url = new URL(v.arquivoUrl);
    return ["gs:", "https:"].includes(url.protocol) && /\.(pdf|docx)$/i.test(decodeURIComponent(url.pathname));
  } catch {
    return false;
  }
}

export function selecionarSubmissao(registro: RegistroEntrega): VersaoPersistida {
  const versoes = [...registro.versoes].sort((a, b) => b.versao.numeroVersao - a.versao.numeroVersao);
  if (!versoes.length) {
    throw new EntregaError(409, "SUBMISSION_REQUIRED", "É necessário haver uma versão persistida antes de alterar o status.");
  }
  const numeros = versoes.map((v) => v.versao.numeroVersao);
  if (new Set(numeros).size !== numeros.length || !versoes.every((v) => metadadosValidos(v, registro.entrega.id))) {
    throw new EntregaError(409, "INVALID_SUBMISSION", "As versões desta entrega precisam ser verificadas antes de continuar.");
  }
  return versoes[0];
}
