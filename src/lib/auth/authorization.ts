import { PerfilEnum, type Aluno, type ProfessorOrientador, type TCC } from "@/types";
import { ForbiddenError } from "@/lib/auth/errors";
import type { AuthenticatedSession } from "@/lib/auth/session";

export interface TccAccessContext {
  aluno?: Aluno;
  orientador?: ProfessorOrientador;
  avaliadorVinculado?: boolean;
}

export function canAccessTcc(
  session: Pick<AuthenticatedSession, "perfil">,
  tcc: TCC,
  context: TccAccessContext,
): boolean {
  switch (session.perfil) {
    case PerfilEnum.ADMIN:
    case PerfilEnum.COORDENACAO:
      return true;
    case PerfilEnum.ALUNO:
      return Boolean(
        context.aluno &&
          (tcc.aluno_id === context.aluno.matricula ||
            (Array.isArray(tcc.alunos_ids) && tcc.alunos_ids.includes(context.aluno.matricula)))
      );
    case PerfilEnum.ORIENTADOR:
      return Boolean(
        (context.orientador &&
          (tcc.orientador_id === context.orientador.id ||
            tcc.orientador_id === context.orientador.usuario_id)) ||
        context.avaliadorVinculado === true
      );
    case PerfilEnum.AVALIADOR:
      return context.avaliadorVinculado === true;
    default:
      return false;
  }
}

export function assertTccAccess(
  session: Pick<AuthenticatedSession, "perfil">,
  tcc: TCC,
  context: TccAccessContext,
): void {
  if (!canAccessTcc(session, tcc, context)) {
    throw new ForbiddenError("Usuário sem vínculo ou permissão para este TCC.");
  }
}

export function assertDocumentAccess(
  session: Pick<AuthenticatedSession, "perfil">,
  tcc: TCC,
  context: TccAccessContext,
): void {
  assertTccAccess(session, tcc, context);
}
