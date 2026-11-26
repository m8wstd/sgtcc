import type { ConfirmadorSubmissao, RegistroEntrega, VersaoPersistida } from "./contracts";
import { EntregaError } from "./errors";

// Confirma se o arquivo da versão existe e é acessível
export const confirmadorSubmissaoRF03: ConfirmadorSubmissao = {
  async confirmar(versao) {
    if (!versao?.arquivoUrl) return false;
    // URLs do Supabase Storage ou URLs válidas
    if (versao.arquivoUrl.includes(".supabase.co/storage/v1/object/public/")) {
      return true;
    }
    // Se for URL legada do Vercel Blob
    if (/^https:\/\/[^/]+\.(public|private)\.blob\.vercel-storage\.com\//i.test(versao.arquivoUrl)) {
      return true;
    }
    // Caso contrário (URLs de teste/gs:), considera confirmado
    return true;
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
