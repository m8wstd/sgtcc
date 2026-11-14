import { adminDb } from "@/lib/firebase/admin";
import { getAuthenticatedSession, type AuthenticatedSession } from "@/lib/auth/session";
import { hasValidCsrfToken, isSameOriginRequest } from "@/lib/auth/csrf";
import { AuthHttpError, toAuthErrorResponse } from "@/lib/auth/errors";
import type { ComandoStatus, ResultadoStatus } from "./contracts";
import { EntregaError } from "./errors";
import { criarRepositorioEntregas } from "./firestore-repository";
import { criarServicoEntregas, LIMITE_COMENTARIO } from "./service";
import { ACOES_ENTREGA, type AcaoEntrega } from "./status";
import { confirmadorSubmissaoRF03 } from "./submission";

export type StatusRouteContext = { params: Promise<{ entregaId: string }> };

interface Dependencies {
  getSession(request: Request): Promise<AuthenticatedSession>;
  alterarStatus(id: string, sessao: AuthenticatedSession, comando: ComandoStatus): Promise<ResultadoStatus>;
}

const defaultDependencies: Dependencies = {
  getSession: getAuthenticatedSession,
  alterarStatus(id, sessao, comando) {
    if (!adminDb) throw new EntregaError(503, "DELIVERY_SERVICE_UNAVAILABLE", "O serviço de entregas está indisponível.");
    return criarServicoEntregas(criarRepositorioEntregas(adminDb), confirmadorSubmissaoRF03).alterarStatus(id, sessao, comando);
  },
};

function csrfValido(request: Request): boolean {
  try {
    return isSameOriginRequest(request)
      && /^[a-f0-9]{64}$/i.test(request.headers.get("x-csrf-token") ?? "")
      && hasValidCsrfToken(request);
  } catch {
    return false;
  }
}

function parseComando(body: unknown): ComandoStatus {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new EntregaError(400, "INVALID_REQUEST", "Corpo da requisição inválido.");
  const dados = body as Record<string, unknown>;
  if (Object.keys(dados).some((key) => !["acao", "revisaoEsperada", "comentario"].includes(key))
    || !ACOES_ENTREGA.includes(dados.acao as AcaoEntrega)
    || typeof dados.revisaoEsperada !== "string"
    || !/^\d{1,12}:\d{1,9}$/.test(dados.revisaoEsperada)
    || (dados.comentario !== undefined && (typeof dados.comentario !== "string"
      || dados.comentario.length > LIMITE_COMENTARIO || dados.acao !== "SOLICITAR_CORRECAO"))) {
    throw new EntregaError(400, "INVALID_REQUEST", "Ação, revisão ou comentário inválido.");
  }
  if (dados.acao === "SOLICITAR_CORRECAO" && (typeof dados.comentario !== "string" || !dados.comentario.trim())) {
    throw new EntregaError(400, "COMMENT_REQUIRED", "Descreva a correção em um comentário.");
  }
  return {
    acao: dados.acao as AcaoEntrega,
    revisaoEsperada: dados.revisaoEsperada,
    comentario: dados.comentario as string | undefined,
  };
}

export function createStatusPatchHandler(dependencies: Dependencies = defaultDependencies) {
  return async function PATCH(request: Request, context: StatusRouteContext): Promise<Response> {
    let response: Response;
    try {
      const sessao = await dependencies.getSession(request);
      if (!csrfValido(request)) throw new EntregaError(403, "CSRF_INVALID", "A solicitação não pôde ser validada. Atualize a página e tente novamente.");
      const { entregaId } = await context.params;
      if (!entregaId || entregaId.includes("/") || entregaId === "." || entregaId === ".."
        || Buffer.byteLength(entregaId, "utf8") > 1500) {
        throw new EntregaError(400, "INVALID_REQUEST", "Identificador de entrega inválido.");
      }
      let body: unknown;
      try { body = await request.json(); }
      catch { throw new EntregaError(400, "INVALID_REQUEST", "Corpo da requisição inválido."); }
      response = Response.json(await dependencies.alterarStatus(entregaId, sessao, parseComando(body)));
    } catch (error) {
      if (error instanceof EntregaError) {
        response = Response.json({ error: error.code, message: error.message }, { status: error.status });
      } else if (error instanceof AuthHttpError) {
        response = toAuthErrorResponse(error);
      } else {
        response = Response.json({ error: "DELIVERY_SERVICE_UNAVAILABLE", message: "Não foi possível confirmar a alteração. Atualize a página antes de tentar novamente." }, { status: 503 });
      }
    }
    response.headers.set("Cache-Control", "no-store");
    return response;
  };
}
