import type { Entrega, MarcoCronograma } from "@/types";

/**
 * Regras da RF03 (Central de Entregas e Versões) sem dependência de Firebase,
 * para serem usadas tanto pela rota de upload (servidor) quanto pela tela (cliente).
 */

/** US03: somente .pdf e .docx. */
export const EXTENSOES_PERMITIDAS = [".pdf", ".docx"] as const;
export type ExtensaoPermitida = (typeof EXTENSOES_PERMITIDAS)[number];

export const ACCEPT_UPLOAD = EXTENSOES_PERMITIDAS.join(",");

/** 10 MB por arquivo (alinhado com `proxyClientMaxBodySize` em next.config.ts). */
export const TAMANHO_MAXIMO_BYTES = 10 * 1024 * 1024;

const CONTENT_TYPE: Record<ExtensaoPermitida, string> = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export function extensaoDe(nome: string): ExtensaoPermitida | null {
  const ponto = nome.lastIndexOf(".");
  if (ponto === -1) return null;
  const extensao = nome.slice(ponto).toLowerCase();
  return (EXTENSOES_PERMITIDAS as readonly string[]).includes(extensao)
    ? (extensao as ExtensaoPermitida)
    : null;
}

/**
 * Nome seguro para o caminho no Storage: sem diretórios, sem acentos e só com
 * [A-Za-z0-9._-]. A extensão (já validada) é preservada.
 */
export function sanitizarNomeArquivo(nome: string, extensao: ExtensaoPermitida): string {
  const semCaminho = nome.split(/[\\/]/).pop() ?? "";
  const base = semCaminho.slice(0, semCaminho.length - extensao.length);
  const limpo = base
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, 80);
  return `${limpo || "arquivo"}${extensao}`;
}

export type ValidacaoArquivo =
  | { ok: true; extensao: ExtensaoPermitida; nomeSeguro: string; contentType: string }
  | { ok: false; status: 400 | 413; mensagem: string };

/** Valida o que dá para saber sem ler o conteúdo: nome/extensão e tamanho. */
export function validarMetadadosArquivo(nome: string, tamanhoBytes: number): ValidacaoArquivo {
  const extensao = extensaoDe(nome);
  if (!extensao) {
    return { ok: false, status: 400, mensagem: "Formato inválido: envie apenas arquivos .pdf ou .docx." };
  }
  if (tamanhoBytes <= 0) {
    return { ok: false, status: 400, mensagem: "O arquivo está vazio." };
  }
  if (tamanhoBytes > TAMANHO_MAXIMO_BYTES) {
    return {
      ok: false,
      status: 413,
      mensagem: `O arquivo excede o limite de ${TAMANHO_MAXIMO_BYTES / (1024 * 1024)} MB.`,
    };
  }
  return {
    ok: true,
    extensao,
    nomeSeguro: sanitizarNomeArquivo(nome, extensao),
    contentType: CONTENT_TYPE[extensao],
  };
}

/** Confere os bytes iniciais, para não aceitar um arquivo qualquer só renomeado. */
export function conteudoCondizComExtensao(extensao: ExtensaoPermitida, bytes: Uint8Array): boolean {
  if (extensao === ".pdf") {
    // A especificação permite lixo antes do cabeçalho, dentro do primeiro 1 KB.
    const inicio = Buffer.from(bytes.subarray(0, 1024)).toString("latin1");
    return inicio.includes("%PDF-");
  }
  // .docx é um ZIP (OOXML): assinatura "PK\x03\x04".
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

/** Mesmo padrão de caminho do seed: tccs/<tcc>/entregas/<entrega>/v<n>_<arquivo>. */
export function caminhoStorage(
  tccId: string,
  entregaId: string,
  numeroVersao: number,
  nomeSeguro: string,
): string {
  return `tccs/${tccId}/entregas/${entregaId}/v${numeroVersao}_${nomeSeguro}`;
}

/** Nome para exibição a partir do caminho: remove diretórios e o prefixo "v<n>_". */
export function nomeExibicaoDoArquivo(caminho: string): string {
  const nome = decodeURIComponent(caminho.split("/").pop() ?? caminho);
  return nome.replace(/^v\d+_/, "");
}

export type PermissaoEnvio =
  | { ok: true; emAtraso: boolean }
  | { ok: false; status: 403 | 409; codigo: "DEADLINE_PASSED" | "DELIVERY_CLOSED"; motivo: string };

const tempo = (v: Date | string) => new Date(v).getTime();

/**
 * Decide se o aluno pode enviar uma nova versão para o marco.
 * - Entrega CONCLUÍDA pelo orientador não recebe mais arquivos (histórico imutável, RN02).
 * - Depois do prazo: recusa se o marco tem `bloqueioEstrito`; caso contrário aceita e
 *   sinaliza `emAtraso`.
 */
export function podeSubmeter(
  marco: Pick<MarcoCronograma, "dataLimite" | "bloqueioEstrito">,
  entrega: Pick<Entrega, "status"> | null,
  agora: number = Date.now(),
): PermissaoEnvio {
  if (entrega?.status === "CONCLUIDA") {
    return {
      ok: false,
      status: 409,
      codigo: "DELIVERY_CLOSED",
      motivo: "Esta entrega já foi concluída pelo orientador e não aceita novas versões.",
    };
  }
  const emAtraso = tempo(marco.dataLimite) < agora;
  if (emAtraso && marco.bloqueioEstrito) {
    return {
      ok: false,
      status: 403,
      codigo: "DEADLINE_PASSED",
      motivo: "O prazo deste marco terminou e o envio de novos arquivos está bloqueado.",
    };
  }
  return { ok: true, emAtraso };
}
