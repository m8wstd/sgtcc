import type { Firestore } from "firebase-admin/firestore";
import { ForbiddenError } from "@/lib/auth/errors";
import { adminDb } from "@/lib/firebase/admin";
import { listarTccsVisiveis, serializar, statusEfetivo, type TccResumo } from "@/lib/data/queries";
import type { AuthenticatedSession } from "@/lib/auth/session";
import { PerfilEnum, type Entrega, type MarcoCronograma, type StatusGeralTCC } from "@/types";

const PERFIS_USUARIO = [
  PerfilEnum.ADMIN,
  PerfilEnum.COORDENACAO,
  PerfilEnum.ORIENTADOR,
  PerfilEnum.AVALIADOR,
  PerfilEnum.ALUNO,
] as const;

export type StatusCounts = Record<StatusGeralTCC, number>;
export type UserCounts = Record<(typeof PERFIS_USUARIO)[number], number>;

export interface AdminDashboardData {
  usuarios: UserCounts;
  totalUsuarios: number;
  tccs: TccResumo[];
  totalTccs: number;
  tccsPorStatus: StatusCounts;
  entregasPendentes: number;
  entregasAtrasadas: number;
  orientadoresAtivos: number;
  alunosComTcc: number;
}

function requireAdmin(session: AuthenticatedSession): void {
  if (session.perfil !== PerfilEnum.ADMIN) {
    throw new ForbiddenError("Acesso restrito ao perfil administrador.");
  }
}

function getDb(): Firestore {
  if (!adminDb) throw new Error("Firestore Admin não está configurado.");
  return adminDb;
}

async function countUsersByRole(db: Firestore): Promise<UserCounts> {
  const entries = await Promise.all(
    PERFIS_USUARIO.map(async (perfil) => {
      const result = await db.collection("usuarios").where("perfil", "==", perfil).count().get();
      return [perfil, result.data().count] as const;
    }),
  );
  return Object.fromEntries(entries) as UserCounts;
}

function records<T>(snapshot: { docs: Array<{ id: string; data(): Record<string, unknown> }> }): T[] {
  return snapshot.docs.map((document) => serializar<T>({ id: document.id, ...document.data() }));
}

export async function getAdminDashboardData(
  session: AuthenticatedSession,
  firestore?: Firestore,
): Promise<AdminDashboardData> {
  // This guard lives in the data layer too: callers cannot accidentally expose
  // privileged aggregate reads by invoking the query without the admin page.
  requireAdmin(session);
  const db = firestore ?? getDb();

  const [usuarios, totalUsuarios, tccs, entregaSnapshot, marcoSnapshot] = await Promise.all([
    countUsersByRole(db),
    db.collection("usuarios").count().get().then((result) => result.data().count),
    listarTccsVisiveis(session),
    db.collection("entregas").where("status", "in", ["AGUARDANDO_ENVIO", "ATRASADA"]).get(),
    db.collection("marcos_cronograma").get(),
  ]);

  const tccsPorStatus: StatusCounts = {
    EM_ANDAMENTO: 0,
    AGUARDANDO_BANCA: 0,
    DEFENDIDO: 0,
    APROVADO: 0,
    REPROVADO: 0,
  };
  for (const tcc of tccs) {
    if (Object.hasOwn(tccsPorStatus, tcc.statusGeral)) tccsPorStatus[tcc.statusGeral] += 1;
  }

  const entregas = records<Entrega>(entregaSnapshot);
  const marcos = new Map(records<MarcoCronograma>(marcoSnapshot).map((marco) => [marco.id, marco]));
  const agora = Date.now();
  const entregasAtrasadas = entregas.filter((entrega) => {
    const marco = marcos.get(entrega.marco_id);
    return entrega.status === "ATRASADA" || Boolean(marco && statusEfetivo(marco, entrega, agora) === "ATRASADA");
  }).length;
  const entregasPendentes = entregas.filter((entrega) => {
    if (entrega.status !== "AGUARDANDO_ENVIO") return false;
    const marco = marcos.get(entrega.marco_id);
    return !marco || statusEfetivo(marco, entrega, agora) !== "ATRASADA";
  }).length;

  return {
    usuarios,
    totalUsuarios,
    tccs,
    totalTccs: tccs.length,
    tccsPorStatus,
    entregasPendentes,
    entregasAtrasadas,
    orientadoresAtivos: new Set(tccs.map((tcc) => tcc.orientador_id)).size,
    alunosComTcc: new Set(tccs.map((tcc) => tcc.aluno_id)).size,
  };
}
