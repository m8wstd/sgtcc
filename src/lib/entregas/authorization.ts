import { PerfilEnum, type TCC } from "@/types";
import type { AuthenticatedSession } from "@/lib/auth/session";
import type { TccAccessContext } from "@/lib/auth/authorization";
import type { AcaoEntrega } from "./status";
import { EntregaError } from "./errors";

export function podeExecutarAcao(
  sessao: Pick<AuthenticatedSession, "uid" | "perfil">,
  tcc: TCC,
  contexto: TccAccessContext,
  _acao: AcaoEntrega,
): boolean {
  void _acao;
  return sessao.perfil === PerfilEnum.ORIENTADOR
    && contexto.orientador?.usuario_id === sessao.uid
    && contexto.orientador.id === tcc.orientador_id;
}

export function exigirPermissaoAcao(
  sessao: Pick<AuthenticatedSession, "uid" | "perfil">,
  tcc: TCC,
  contexto: TccAccessContext,
  acao: AcaoEntrega,
): void {
  if (!podeExecutarAcao(sessao, tcc, contexto, acao)) {
    throw new EntregaError(403, "FORBIDDEN", "Somente o orientador atualmente vinculado ao TCC pode revisar esta entrega.");
  }
}
