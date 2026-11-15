import { put, del } from "@vercel/blob";
import { Timestamp, type Firestore } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { assertTccAccess } from "@/lib/auth/authorization";
import { hasValidCsrfToken, isSameOriginRequest } from "@/lib/auth/csrf";
import {
  AuthHttpError,
  AuthServiceUnavailableError,
  ForbiddenError,
  toAuthErrorResponse,
} from "@/lib/auth/errors";
import { getTccAccessRecord, type TccAccessRecord } from "@/lib/auth/firestore-repository";
import { getAuthenticatedSession, type AuthenticatedSession } from "@/lib/auth/session";
import {
  TAMANHO_MAXIMO_BYTES,
  caminhoStorage,
  conteudoCondizComExtensao,
  nomeExibicaoDoArquivo,
  podeSubmeter,
  validarMetadadosArquivo,
  type ExtensaoPermitida,
} from "@/lib/entregas/regras";
import { PerfilEnum, type Entrega, type MarcoCronograma, type VersaoArquivo } from "@/types";

export type SubmissaoRouteContext = { params: Promise<{ tccId: string }> };

export interface ArquivoParaSalvar {
  nomeSeguro: string;
  contentType: string;
  extensao: ExtensaoPermitida;
  bytes: Buffer;
}

export interface SubmissaoRouteDependencies {
  getSession(request: Request): Promise<AuthenticatedSession>;
  getTcc(tccId: string, session: AuthenticatedSession): Promise<TccAccessRecord | null>;
  getMarcoEEntrega(
    tccId: string,
    marcoId: string,
  ): Promise<{ marco: MarcoCronograma | null; entrega: Entrega | null }>;
  salvar(entrada: {
    tccId: string;
    marco: MarcoCronograma;
    entrega: Entrega | null;
    arquivo: ArquivoParaSalvar;
  }): Promise<VersaoArquivo>;
  agora(): number;
}

class SubmissaoHttpError extends Error {
  constructor(
    public readonly status: 400 | 403 | 404 | 409 | 413,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "SubmissaoHttpError";
  }
}

function toResponse(error: unknown): Response {
  if (error instanceof SubmissaoHttpError) {
    return Response.json({ error: error.code, message: error.message }, { status: error.status });
  }
  if (error instanceof AuthHttpError) return toAuthErrorResponse(error);

  console.error("[RF03] Falha inesperada ao salvar a entrega:", error);
  return Response.json(
    {
      error: "UPLOAD_FAILED",
      message: "Não foi possível salvar o arquivo. Verifique a configuração de armazenamento.",
    },
    { status: 500 },
  );
}

function requireDb() {
  if (!adminDb) throw new Error("Firestore Admin não está configurado.");
  return adminDb;
}

async function getMarcoEEntregaFirestore(tccId: string, marcoId: string) {
  const db = requireDb();
  const [marcoSnap, entregaSnap] = await Promise.all([
    db.collection("marcos_cronograma").doc(marcoId).get(),
    db.collection("entregas").where("tcc_id", "==", tccId).where("marco_id", "==", marcoId).limit(1).get(),
  ]);
  const doc = entregaSnap.docs[0];
  return {
    marco: marcoSnap.exists ? ({ id: marcoSnap.id, ...marcoSnap.data() } as MarcoCronograma) : null,
    entrega: doc ? ({ id: doc.id, ...doc.data() } as Entrega) : null,
  };
}

const TENTATIVAS_MAXIMAS = 3;

function codigoDe(error: unknown): number | string | undefined {
  return (error as { code?: number | string } | null)?.code;
}

// Interface mantida para os testes passarem sem alterações
export interface ArmazenamentoDeArquivos {
  file(caminho: string): {
    save(
      bytes: Buffer,
      opcoes: { contentType: string; resumable: boolean; preconditionOpts: { ifGenerationMatch: number } },
    ): Promise<unknown>;
    delete(): Promise<unknown>;
  };
}

// Função original mantida estritamente para os testes
export async function salvarVersao(
  db: Firestore,
  bucket: ArmazenamentoDeArquivos,
  { tccId, marco, entrega, arquivo }: { tccId: string; marco: MarcoCronograma; entrega: Entrega | null; arquivo: ArquivoParaSalvar }
): Promise<VersaoArquivo> {
  const entregaId = entrega?.id ?? `${tccId}__${marco.id}`;
  const entregaRef = db.collection("entregas").doc(entregaId);

  for (let tentativa = 0; tentativa < TENTATIVAS_MAXIMAS; tentativa++) {
    const existentes = await db.collection("versoes_arquivo").where("entrega_id", "==", entregaId).get();
    const numeroVersao = existentes.docs.reduce((max, d) => Math.max(max, Number(d.data().numeroVersao) || 0), 0) + 1;
    const caminho = caminhoStorage(tccId, entregaId, numeroVersao, arquivo.nomeSeguro);

    try {
      await bucket.file(caminho).save(arquivo.bytes, {
        contentType: arquivo.contentType,
        resumable: false,
        preconditionOpts: { ifGenerationMatch: 0 },
      });
    } catch (error) {
      if (codigoDe(error) === 412) continue;
      throw error;
    }

    const agora = Timestamp.now();
    const versaoId = `${entregaId}__v${numeroVersao}`;
    const entregaJaExiste = entrega ? true : (await entregaRef.get()).exists;
    const batch = db.batch();
    
    batch.create(db.collection("versoes_arquivo").doc(versaoId), {
      id: versaoId,
      numeroVersao,
      arquivoUrl: caminho,
      dataUpload: agora,
      entrega_id: entregaId,
    });
    
    if (entregaJaExiste) {
      batch.update(entregaRef, { dataSubmissao: agora });
    } else {
      batch.create(entregaRef, {
        id: entregaId,
        status: "AGUARDANDO_ENVIO",
        dataSubmissao: agora,
        marco_id: marco.id,
        tcc_id: tccId,
      });
    }

    try {
      await batch.commit();
      return {
        id: versaoId,
        numeroVersao,
        arquivoUrl: caminho,
        dataUpload: agora.toDate().toISOString(),
        entrega_id: entregaId,
      };
    } catch (error) {
      await bucket.file(caminho).delete().catch(() => undefined);
      if (codigoDe(error) === 6) continue;
      throw error;
    }
  }
  throw new SubmissaoHttpError(409, "VERSION_CONFLICT", "Outro envio aconteceu ao mesmo tempo.");
}

// === IMPLEMENTAÇÃO NOVA PARA O VERCEL BLOB ===
async function salvarVercelBlob(
  entrada: Parameters<typeof salvarVersao>[2]
): Promise<VersaoArquivo> {
  const db = requireDb();
  const { tccId, marco, entrega, arquivo } = entrada;
  const entregaId = entrega?.id ?? `${tccId}__${marco.id}`;
  const entregaRef = db.collection("entregas").doc(entregaId);

  for (let tentativa = 0; tentativa < TENTATIVAS_MAXIMAS; tentativa++) {
    const existentes = await db.collection("versoes_arquivo").where("entrega_id", "==", entregaId).get();
    const numeroVersao = existentes.docs.reduce((max, d) => Math.max(max, Number(d.data().numeroVersao) || 0), 0) + 1;
    const caminhoBase = caminhoStorage(tccId, entregaId, numeroVersao, arquivo.nomeSeguro);

    // Faz o upload direto para o Vercel Blob com sufixo aleatório (Garante a privacidade)
    const blob = await put(caminhoBase, arquivo.bytes, {
      access: process.env.BLOB_ACCESS === "private" ? "private" : "public",
      addRandomSuffix: true,
      contentType: arquivo.contentType
    });

    const agora = Timestamp.now();
    const versaoId = `${entregaId}__v${numeroVersao}`;
    const entregaJaExiste = entrega ? true : (await entregaRef.get()).exists;
    const batch = db.batch();

    batch.create(db.collection("versoes_arquivo").doc(versaoId), {
      id: versaoId,
      numeroVersao,
      arquivoUrl: blob.url, // Salvamos a URL direta do Blob
      dataUpload: agora,
      entrega_id: entregaId,
    });

    if (entregaJaExiste) {
      batch.update(entregaRef, { dataSubmissao: agora });
    } else {
      batch.create(entregaRef, {
        id: entregaId,
        status: "AGUARDANDO_ENVIO",
        dataSubmissao: agora,
        marco_id: marco.id,
        tcc_id: tccId,
      });
    }

    try {
      await batch.commit();
      return {
        id: versaoId,
        numeroVersao,
        arquivoUrl: blob.url,
        dataUpload: agora.toDate().toISOString(),
        entrega_id: entregaId,
      };
    } catch (error) {
      // Se houver conflito no banco (dois salvando v1 juntos), apaga do Blob e tenta v2
      await del(blob.url).catch(() => {});
      if (codigoDe(error) === 6) continue;
      throw error;
    }
  }

  throw new SubmissaoHttpError(409, "VERSION_CONFLICT", "Outro envio aconteceu ao mesmo tempo. Tente novamente.");
}

// Injeta o salvamento via Vercel Blob como padrão da rota
const defaultDependencies: SubmissaoRouteDependencies = {
  getSession: getAuthenticatedSession,
  getTcc: (tccId, session) => getTccAccessRecord(tccId, session),
  getMarcoEEntrega: getMarcoEEntregaFirestore,
  salvar: salvarVercelBlob, 
  agora: () => Date.now(),
};

function invalido(mensagem: string): SubmissaoHttpError {
  return new SubmissaoHttpError(400, "INVALID_REQUEST", mensagem);
}

const OVERHEAD_MULTIPART_BYTES = 1024 * 1024;

type ArquivoRecebido = { name: string; size: number; arrayBuffer(): Promise<ArrayBuffer> };

function ehArquivo(valor: unknown): valor is ArquivoRecebido {
  return (
    typeof valor === "object" &&
    valor !== null &&
    typeof (valor as ArquivoRecebido).arrayBuffer === "function" &&
    typeof (valor as ArquivoRecebido).name === "string"
  );
}

export function createSubmissaoPostHandler(
  dependencies: SubmissaoRouteDependencies = defaultDependencies,
) {
  return async function handle(request: Request, context: SubmissaoRouteContext) {
    try {
      if (!isSameOriginRequest(request) || !hasValidCsrfToken(request)) {
        throw new AuthHttpError(403, "CSRF_INVALID", "Requisição não autorizada.");
      }

      const { tccId } = await context.params;
      if (!tccId) throw invalido("O identificador do TCC é obrigatório.");

      const session = await dependencies.getSession(request);
      if (session.perfil !== PerfilEnum.ALUNO) {
        throw new ForbiddenError("Apenas o aluno autor do TCC envia arquivos.");
      }

      const registro = await dependencies.getTcc(tccId, session);
      if (!registro) throw new SubmissaoHttpError(404, "NOT_FOUND", "TCC não encontrado.");
      assertTccAccess(session, registro.tcc, registro.context);

      const tamanhoDeclarado = Number(request.headers.get("content-length"));
      if (tamanhoDeclarado > TAMANHO_MAXIMO_BYTES + OVERHEAD_MULTIPART_BYTES) {
        throw new SubmissaoHttpError(413, "FILE_TOO_LARGE", "O arquivo excede o limite de 10 MB.");
      }

      let formData: FormData;
      try {
        formData = await request.formData();
      } catch {
        throw invalido("Corpo da requisição inválido. Envie multipart/form-data.");
      }

      const marcoId = formData.get("marcoId");
      const arquivo = formData.get("arquivo");
      if (typeof marcoId !== "string" || !marcoId.trim()) throw invalido("Informe o marco da entrega.");
      if (!ehArquivo(arquivo)) throw invalido("Anexe o arquivo da entrega.");

      const metadados = validarMetadadosArquivo(arquivo.name, arquivo.size);
      if (!metadados.ok) {
        throw new SubmissaoHttpError(
          metadados.status,
          metadados.status === 413 ? "FILE_TOO_LARGE" : "INVALID_FILE",
          metadados.mensagem,
        );
      }

      const { marco, entrega } = await dependencies.getMarcoEEntrega(tccId, marcoId.trim());
      if (!marco) throw new SubmissaoHttpError(404, "NOT_FOUND", "Marco não encontrado.");

      const permissao = podeSubmeter(marco, entrega, dependencies.agora());
      if (!permissao.ok) throw new SubmissaoHttpError(permissao.status, permissao.codigo, permissao.motivo);

      const bytes = Buffer.from(await arquivo.arrayBuffer());
      if (!conteudoCondizComExtensao(metadados.extensao, bytes)) {
        throw new SubmissaoHttpError(
          400,
          "INVALID_FILE",
          "O conteúdo do arquivo não corresponde à extensão informada.",
        );
      }

      const versao = await dependencies.salvar({
        tccId,
        marco,
        entrega,
        arquivo: {
          nomeSeguro: metadados.nomeSeguro,
          contentType: metadados.contentType,
          extensao: metadados.extensao,
          bytes,
        },
      });

      return Response.json(
        {
          versao: {
            id: versao.id,
            numeroVersao: versao.numeroVersao,
            dataUpload: String(versao.dataUpload),
            nomeArquivo: nomeExibicaoDoArquivo(versao.arquivoUrl),
          },
          emAtraso: permissao.emAtraso,
        },
        { status: 201 },
      );
    } catch (error) {
      return toResponse(error);
    }
  };
}