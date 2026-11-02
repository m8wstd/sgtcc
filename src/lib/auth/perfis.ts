import { PerfilEnum } from "@/types";

/** Home de cada perfil (RF01: redirecionamento dinâmico conforme perfil). */
export const HOME_POR_PERFIL: Record<PerfilEnum, string> = {
  [PerfilEnum.ALUNO]: "/dashboard/aluno",
  [PerfilEnum.ORIENTADOR]: "/dashboard/orientador",
  [PerfilEnum.AVALIADOR]: "/dashboard/avaliador",
  [PerfilEnum.COORDENACAO]: "/dashboard/coordenacao",
  [PerfilEnum.ADMIN]: "/dashboard/admin",
};

export const ROTULO_PERFIL: Record<PerfilEnum, string> = {
  [PerfilEnum.ALUNO]: "Aluno",
  [PerfilEnum.ORIENTADOR]: "Professor Orientador",
  [PerfilEnum.AVALIADOR]: "Professor Avaliador",
  [PerfilEnum.COORDENACAO]: "Coordenação",
  [PerfilEnum.ADMIN]: "Administrador",
};

export function homeDoPerfil(perfil: PerfilEnum): string {
  return HOME_POR_PERFIL[perfil];
}

/** Só aceita caminhos internos do dashboard (evita open redirect via ?next=). */
export function destinoSeguro(next: string | null | undefined): string | null {
  return next && /^\/dashboard(\/|$)/.test(next) && !next.startsWith("//") ? next : null;
}
