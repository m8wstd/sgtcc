import { describe, expect, it, vi } from "vitest";
import { PerfilEnum } from "@/types";
import type { Firestore } from "firebase-admin/firestore";
import { criarRepositorioEntregas } from "./firestore-repository";
import { criarServicoEntregas } from "./service";
import { registroTeste, sessaoTeste } from "./test-fixtures";

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: { serverTimestamp: () => "<server timestamp>" },
  Timestamp: class Timestamp { toMillis() { return 0; } },
}));

function repositorioFake() {
  const registros = registroTeste();
  registros.entrega.status = "EM_REVISAO";
  const docs: Record<string, Record<string, unknown>> = {
    "entregas/entrega-teste": { ...registros.entrega },
    "tccs/tcc-teste": { ...registros.tcc },
    "usuarios/usuario-orientador": { perfil: PerfilEnum.ORIENTADOR },
    "alunos/matricula-teste": { ...registros.contexto.aluno },
    "professores_orientadores/professor-teste": { usuario_id: "usuario-orientador" },
    "marcos_cronograma/marco-teste": { id: "marco-teste" },
  };
  const versaoDoc = {
    id: "versao-teste",
    data: () => ({ ...registros.versoes[0].versao }),
    createTime: { toMillis: () => registros.versoes[0].criadaEmMillis },
  };
  const writes: Array<{ kind: string; ref: { collection: string; id: string }; value: Record<string, unknown> }> = [];
  let generatedId = 0;
  const ref = (collection: string, id: string) => ({ collection, id });
  const db = {
    collection(collection: string) {
      return {
        doc(id?: string) { return ref(collection, id ?? `generated-${++generatedId}`); },
        where(field: string, _operator: string, value: unknown) { return { collection, field, value }; },
      };
    },
    async runTransaction<T>(callback: (transaction: unknown) => Promise<T>) {
      const transaction = {
        async get(target: { collection: string; id?: string; field?: string; value?: unknown }) {
          if (target.id) {
            const value = docs[`${target.collection}/${target.id}`];
            return {
              id: target.id,
              exists: Boolean(value),
              updateTime: target.collection === "entregas" ? { seconds: 100, nanoseconds: 123456789, toMillis: () => registros.atualizadaEmMillis } : undefined,
              data: () => value,
            };
          }
          const versoes = target.collection === "versoes_arquivo" && target.field === "entrega_id" && target.value === "entrega-teste" ? [versaoDoc] : [];
          return { docs: versoes };
        },
        async getAll(...targets: Array<{ collection: string; id: string }>) {
          return targets.map((target) => {
            const value = docs[`${target.collection}/${target.id}`];
            return { id: target.id, exists: Boolean(value), data: () => value };
          });
        },
        update(target: { collection: string; id: string }, value: Record<string, unknown>) {
          writes.push({ kind: "update", ref: target, value });
        },
        create(target: { collection: string; id: string }, value: Record<string, unknown>) {
          writes.push({ kind: "create", ref: target, value });
        },
      };
      return callback(transaction);
    },
  };
  return { repository: criarRepositorioEntregas(db as unknown as Firestore), writes };
}

describe("repositório Firestore RF04", () => {
  it("grava status e feedback na mesma transação sem tocar versões ou feedbacks antigos", async () => {
    const { repository, writes } = repositorioFake();
    const historicoAnterior = ["versoes_arquivo/versao-teste", "feedbacks/feedback-anterior"];
    const servico = criarServicoEntregas(repository, { confirmar: vi.fn().mockResolvedValue(true) });
    await expect(servico.alterarStatus("entrega-teste", sessaoTeste(), {
      acao: "SOLICITAR_CORRECAO",
      revisaoEsperada: "100:123456789",
      comentario: " Ajustar metodologia. ",
    })).resolves.toMatchObject({ entrega: { status: "SOLICITADA_CORRECAO" } });

    expect(writes).toHaveLength(2);
    expect(writes[0]).toEqual({ kind: "update", ref: { collection: "entregas", id: "entrega-teste" }, value: { status: "SOLICITADA_CORRECAO" } });
    expect(writes[1]).toMatchObject({
      kind: "create",
      ref: { collection: "feedbacks", id: "generated-1" },
      value: { comentario: "Ajustar metodologia.", data: "<server timestamp>", entrega_id: "entrega-teste", autor_id: "usuario-orientador" },
    });
    expect(writes.every(({ ref: written }) => !historicoAnterior.includes(`${written.collection}/${written.id}`))).toBe(true);
  });
});
