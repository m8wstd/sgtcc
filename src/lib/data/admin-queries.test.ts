import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Firestore } from "firebase-admin/firestore";
import { PerfilEnum, type Entrega, type MarcoCronograma, type TCC } from "@/types";
import type { AuthenticatedSession } from "@/lib/auth/session";
import { ForbiddenError } from "@/lib/auth/errors";

const mocks = vi.hoisted(() => ({ listarTccsVisiveis: vi.fn() }));
vi.mock("@/lib/data/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/data/queries")>();
  return { ...actual, listarTccsVisiveis: mocks.listarTccsVisiveis };
});

import { getAdminDashboardData } from "./admin-queries";

const sessao = (perfil: PerfilEnum) => ({ perfil, usuario: { id: "user-1" } }) as AuthenticatedSession;

function fakeFirestore(
  counts: Record<string, number>,
  docsByCollection: Record<string, Array<{ id: string; data: () => Record<string, unknown> }>> = {},
) {
  const collection = vi.fn((name: string) => ({
    count: () => ({ get: async () => ({ data: () => ({ count: counts[`collection:${name}`] ?? 0 }) }) }),
    where: vi.fn((field: string, _operator: string, value: string) => ({
      count: () => ({ get: async () => ({ data: () => ({ count: counts[`${field}:${value}`] ?? 0 }) }) }),
      get: async () => ({ docs: docsByCollection[name] ?? [] }),
    })),
    get: async () => ({ docs: docsByCollection[name] ?? [] }),
  }));
  return { firestore: { collection } as unknown as Firestore, collection };
}

describe("consultas do dashboard ADMIN", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listarTccsVisiveis.mockResolvedValue([]);
  });

  it("nega a consulta antes de acessar o banco para qualquer outro perfil", async () => {
    const { firestore, collection } = fakeFirestore({});
    await expect(getAdminDashboardData(sessao(PerfilEnum.COORDENACAO), firestore)).rejects.toBeInstanceOf(ForbiddenError);
    expect(collection).not.toHaveBeenCalled();
    expect(mocks.listarTccsVisiveis).not.toHaveBeenCalled();
  });

  it("conta usuários por perfil e deriva TCCs, vínculos e entregas de documentos reais", async () => {
    const tcc: TCC & { alunoNome: string; orientadorNome: string } = {
      id: "tcc-1", titulo: "Pesquisa", statusGeral: "EM_ANDAMENTO", aluno_id: "mat-1", orientador_id: "prof-1",
      alunoNome: "Ana", orientadorNome: "Prof. Bia",
    };
    mocks.listarTccsVisiveis.mockResolvedValue([tcc]);
    const entrega: Entrega = {
      id: "entrega-1", status: "AGUARDANDO_ENVIO", marco_id: "marco-1", tcc_id: "tcc-1",
    };
    const entregaFutura: Entrega = {
      id: "entrega-2", status: "AGUARDANDO_ENVIO", marco_id: "marco-2", tcc_id: "tcc-1",
    };
    const marco: MarcoCronograma = {
      id: "marco-1", titulo: "Entrega", dataLimite: "2000-01-01T00:00:00.000Z", cronograma_id: "2026-2",
    };
    const marcoFuturo: MarcoCronograma = {
      id: "marco-2", titulo: "Entrega futura", dataLimite: "2999-01-01T00:00:00.000Z", cronograma_id: "2026-2",
    };
    const { firestore } = fakeFirestore({
      "collection:usuarios": 16,
      "perfil:ADMIN": 1,
      "perfil:COORDENACAO": 2,
      "perfil:ORIENTADOR": 3,
      "perfil:AVALIADOR": 4,
      "perfil:ALUNO": 5,
    }, {
      entregas: [entrega, entregaFutura].map((item) => ({ id: item.id, data: () => item as unknown as Record<string, unknown> })),
      marcos_cronograma: [marco, marcoFuturo].map((item) => ({ id: item.id, data: () => item as unknown as Record<string, unknown> })),
    });

    const result = await getAdminDashboardData(sessao(PerfilEnum.ADMIN), firestore);
    expect(result.usuarios).toEqual({ ADMIN: 1, COORDENACAO: 2, ORIENTADOR: 3, AVALIADOR: 4, ALUNO: 5 });
    expect(result.totalUsuarios).toBe(16);
    expect(result.totalTccs).toBe(1);
    expect(result.tccsPorStatus.EM_ANDAMENTO).toBe(1);
    expect(result.orientadoresAtivos).toBe(1);
    expect(result.alunosComTcc).toBe(1);
    expect(result.entregasPendentes).toBe(1);
    expect(result.entregasAtrasadas).toBe(1);
    expect(mocks.listarTccsVisiveis).toHaveBeenCalledWith(expect.objectContaining({ perfil: PerfilEnum.ADMIN }));
  });
});
