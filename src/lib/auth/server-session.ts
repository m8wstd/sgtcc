import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  AuthHttpError,
  AuthServiceUnavailableError,
  ProfileNotFoundError,
  SsoNotConfiguredError,
} from "@/lib/auth/errors";
import { getAuthenticatedSession, type AuthenticatedSession } from "@/lib/auth/session";
import { homeDoPerfil } from "@/lib/auth/perfis";
import type { PerfilEnum } from "@/types";

/**
 * Sessão para Server Components. Reaproveita `getAuthenticatedSession` (que lê o
 * cookie `sgtcc_session` de um Request) montando um Request só com o cookie atual.
 * Retorna null se não há sessão válida (não logado ou sessão expirada).
 * Erros de infraestrutura (503) e erro de perfil não cadastrado sobem para não
 * deslogar o usuário indevidamente nem gerar loop silencioso.
 * `cache` evita validar o mesmo cookie várias vezes na mesma requisição.
 */
export const getSessaoServidor = cache(async (): Promise<AuthenticatedSession | null> => {
  const cookie = (await headers()).get("cookie") ?? "";
  try {
    return await getAuthenticatedSession(new Request("http://localhost/", { headers: { cookie } }));
  } catch (error) {
    // Falhas de infraestrutura / serviço indisponível (503) NÃO devem ser tratadas
    // como sessão ausente/expirada, evitando deslogar o usuário indevidamente.
    if (
      error instanceof AuthServiceUnavailableError ||
      error instanceof SsoNotConfiguredError ||
      (error instanceof AuthHttpError && error.status === 503)
    ) {
      throw error;
    }

    // Se o usuário está autenticado mas o perfil não foi encontrado no banco,
    // relança para tratamento explícito (evita loop silencioso de login).
    if (error instanceof ProfileNotFoundError) {
      throw error;
    }

    // Sessão inexistente ou expirada (401/cookie inválido)
    return null;
  }
});

/**
 * Exige sessão válida (e, opcionalmente, um dos perfis informados).
 * Sem sessão → /login. Perfil errado → home do perfil do usuário.
 */
export async function requireSessao(...perfisPermitidos: PerfilEnum[]): Promise<AuthenticatedSession> {
  let sessao: AuthenticatedSession | null = null;
  try {
    sessao = await getSessaoServidor();
  } catch (error) {
    if (error instanceof ProfileNotFoundError) {
      redirect("/login?erro=perfil_nao_encontrado");
    }
    // Erros de 503 / infraestrutura são relançados para renderizar o Error Boundary da aplicação
    throw error;
  }

  if (!sessao) redirect("/login");
  if (perfisPermitidos.length && !perfisPermitidos.includes(sessao.perfil)) {
    redirect(homeDoPerfil(sessao.perfil));
  }
  return sessao;
}
