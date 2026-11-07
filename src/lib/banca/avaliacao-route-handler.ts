import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { AuthHttpError, ForbiddenError, toAuthErrorResponse } from "@/lib/auth/errors";
import { hasValidCsrfToken, isSameOriginRequest } from "@/lib/auth/csrf";
import { getAuthenticatedSession, type AuthenticatedSession } from "@/lib/auth/session";
import { MARCO_ENTREGA_FINAL } from "@/lib/data/queries";
import { validarAvaliacao, type AvaliacaoValida } from "@/lib/banca/status";
import { PerfilEnum, type Avaliacao } from "@/types";

export type AvaliacaoRouteContext = { params: Promise<{ tccId: string }> };

/** O que a rota precisa saber do banco para decidir se pode gravar. */
export interface ContextoAvaliacao {
  bancaId: string;
  avaliadorId: string;
  tccTitulo: string;
  temVersaoFinal: boolean;
  avaliacaoAtual: Avaliacao | null;
  /** usuario_id de quem deve ser avisado quando a avaliação for finalizada. */
  destinatarios: string[];
}

export interface AvaliacaoRouteDependencies {
  getSession(request: Request): Promise<AuthenticatedSession>;
  /** null = o avaliador não consta na banca deste TCC (ou o TCC não existe). */
  getContexto(tccId: string, session: AuthenticatedSession): Promise<ContextoAvaliacao | null>;
  salvar(tccId: string, contexto: ContextoAvaliacao, valor: AvaliacaoValida): Promise<Avaliacao>;
  notificar(usuarioIds: string[], mensagem: string): Promise<void>;
}

function requireDb() {
  if (!adminDb) throw new Error("Firestore Admin não está configurado.");
  return adminDb;
}

async function getContextoFirestore(
  tccId: string,
  session: AuthenticatedSession,
): Promise<ContextoAvaliacao | null> {
  const db = requireDb();
  const profSnap = await db
    .collection("professores_avaliadores")
    .where("usuario_id", "==", session.usuario.id)
    .limit(1)
    .get();
  const prof = profSnap.docs[0];
  if (!prof) return null;

  const bancaSnap = await db
    .collection("bancas_avaliacao")
    .where("tcc_id", "==", tccId)
    .where("avaliador_id", "==", prof.id)
    .limit(1)
    .get();
  const banca = bancaSnap.docs[0];
  if (!banca) return null;

  const [tccSnap, avaliacaoSnap, entregasSnap] = await Promise.all([
    db.collection("tccs").doc(tccId).get(),
    db.collection("avaliacoes").doc(banca.id).get(),
    db.collection("entregas").where("tcc_id", "==", tccId).get(),
  ]);
  if (!tccSnap.exists) return null;
  const tcc = tccSnap.data() as { titulo?: string; aluno_id?: string; orientador_id?: string };

  // A versão final existe quando o marco "entrega-final" tem ao menos um arquivo.
  const entregaFinal = entregasSnap.docs.find((d) => d.data().marco_id === MARCO_ENTREGA_FINAL);
  let temVersaoFinal = false;
  if (entregaFinal) {
    const v = await db.collection("versoes_arquivo").where("entrega_id", "==", entregaFinal.id).limit(1).get();
    temVersaoFinal = !v.empty;
  }

  const destinatarios: string[] = [];
  if (tcc.orientador_id) {
    const o = await db.collection("professores_orientadores").doc(tcc.orientador_id).get();
    if (o.exists) destinatarios.push(o.data()!.usuario_id as string);
  }
  if (tcc.aluno_id) {
    const a = await db.collection("alunos").doc(tcc.aluno_id).get();
    if (a.exists) destinatarios.push(a.data()!.usuario_id as string);
  }

  return {
    bancaId: banca.id,
    avaliadorId: prof.id,
    tccTitulo: tcc.titulo ?? "TCC",
    temVersaoFinal,
    avaliacaoAtual: avaliacaoSnap.exists
      ? ({ id: avaliacaoSnap.id, ...avaliacaoSnap.data() } as Avaliacao)
      : null,
    destinatarios,
  };
}

async function salvarFirestore(
  tccId: string,
  contexto: ContextoAvaliacao,
  valor: AvaliacaoValida,
): Promise<Avaliacao> {
  const agora = Timestamp.now();
  const dados: Record<string, unknown> = {
    id: contexto.bancaId,
    banca_id: contexto.bancaId,
    tcc_id: tccId,
    avaliador_id: contexto.avaliadorId,
    status: valor.status,
    parecer: valor.parecer,
    atualizadoEm: agora,
  };
  // Firestore não aceita `undefined`: só grava o que veio preenchido.
  if (valor.nota !== undefined) dados.nota = valor.nota;
  if (valor.decisao) dados.decisao = valor.decisao;
  if (valor.status === "FINALIZADA") dados.dataAvaliacao = agora;

  // Sem merge: o rascunho novo substitui o anterior inteiro (campos limpos somem).
  await requireDb().collection("avaliacoes").doc(contexto.bancaId).set(dados);
  return {
    ...(dados as unknown as Avaliacao),
    atualizadoEm: agora.toDate().toISOString(),
    dataAvaliacao: valor.status === "FINALIZADA" ? agora.toDate().toISOString() : undefined,
  };
}

async function notificarFirestore(usuarioIds: string[], mensagem: string): Promise<void> {
  const db = requireDb();
  const batch = db.batch();
  for (const usuarioId of new Set(usuarioIds)) {
    const ref = db.collection("notificacoes").doc();
    batch.set(ref, { id: ref.id, mensagem, lida: false, usuario_id: usuarioId, criadoEm: Timestamp.now() });
  }
  await batch.commit();
}

const defaultDependencies: AvaliacaoRouteDependencies = {
  getSession: getAuthenticatedSession,
  getContexto: getContextoFirestore,
  salvar: salvarFirestore,
  notificar: notificarFirestore,
};

function invalido(mensagem: string): AuthHttpError {
  return new AuthHttpError(400, "INVALID_REQUEST", mensagem);
}

/**
 * POST /api/tcc/[tccId]/avaliacao
 * Corpo: { finalizar: boolean, nota?, decisao?, parecer? }
 * Só o avaliador que consta na banca grava, e só a PRÓPRIA avaliação; depois de
 * finalizada ela é imutável. As regras do Firestore bloqueiam escrita direta do cliente.
 */
export function createAvaliacaoPostHandler(
  dependencies: AvaliacaoRouteDependencies = defaultDependencies,
) {
  return async function handle(request: Request, context: AvaliacaoRouteContext) {
    try {
      if (!isSameOriginRequest(request) || !hasValidCsrfToken(request)) {
        throw new AuthHttpError(403, "CSRF_INVALID", "Requisição não autorizada.");
      }

      const { tccId } = await context.params;
      if (!tccId) throw invalido("O identificador do TCC é obrigatório.");

      const session = await dependencies.getSession(request);
      if (session.perfil !== PerfilEnum.AVALIADOR) {
        throw new ForbiddenError("Apenas professores avaliadores registram avaliação da banca.");
      }

      let corpo: unknown;
      try {
        corpo = await request.json();
      } catch {
        throw invalido("Corpo da requisição inválido.");
      }
      if (!corpo || typeof corpo !== "object") throw invalido("Corpo da requisição inválido.");
      const entrada = corpo as Record<string, unknown>;

      const contexto = await dependencies.getContexto(tccId, session);
      if (!contexto) throw new ForbiddenError("Você não faz parte da banca deste TCC.");
      if (!contexto.temVersaoFinal) {
        throw invalido("A versão final ainda não foi enviada à banca.");
      }
      if (contexto.avaliacaoAtual?.status === "FINALIZADA") {
        throw invalido("Esta avaliação já foi finalizada e não pode mais ser alterada.");
      }

      const validacao = validarAvaliacao({
        finalizar: entrada.finalizar === true,
        nota: entrada.nota,
        decisao: entrada.decisao,
        parecer: entrada.parecer,
      });
      if (!validacao.ok) throw invalido(validacao.mensagem);

      const avaliacao = await dependencies.salvar(tccId, contexto, validacao.valor);
      if (validacao.valor.status === "FINALIZADA") {
        await dependencies.notificar(
          contexto.destinatarios,
          `A banca finalizou a avaliação do TCC "${contexto.tccTitulo}".`,
        );
      }

      return Response.json({ avaliacao });
    } catch (error) {
      return toAuthErrorResponse(error);
    }
  };
}
