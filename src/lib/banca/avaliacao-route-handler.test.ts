import { describe, expect, it } from "vitest";
import { PerfilEnum, type Avaliacao } from "@/types";
import {
  createAvaliacaoPostHandler,
  type AvaliacaoRouteDependencies,
  type ContextoAvaliacao,
} from "@/lib/banca/avaliacao-route-handler";

const context = { params: Promise.resolve({ tccId: "tcc-001" }) };

const sessaoAvaliador = {
  uid: "uid-silvia",
  perfil: PerfilEnum.AVALIADOR,
  usuario: { id: "uid-silvia", nome: "Silvia", email: "silvia@teste.sgtcc.dev", perfil: PerfilEnum.AVALIADOR },
  token: {} as never,
};
const sessaoAluno = {
  ...sessaoAvaliador,
  uid: "uid-aluno",
  perfil: PerfilEnum.ALUNO,
  usuario: { ...sessaoAvaliador.usuario, id: "uid-aluno", perfil: PerfilEnum.ALUNO },
};

const contextoBase: ContextoAvaliacao = {
  bancaId: "banca-001",
  avaliadorId: "uid-silvia",
  tccTitulo: "Meu TCC",
  temVersaoFinal: true,
  avaliacaoAtual: null,
  destinatarios: ["uid-orientador", "uid-aluno"],
};

function requisicao(corpo: unknown, comCsrf = true) {
  return new Request("http://localhost/api/tcc/tcc-001/avaliacao", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(comCsrf ? { cookie: "sgtcc_csrf=abc123", "x-csrf-token": "abc123" } : {}),
    },
    body: JSON.stringify(corpo),
  });
}

function montar(over: Partial<AvaliacaoRouteDependencies> = {}) {
  const chamadas = { salvou: 0, notificou: 0 };
  const deps: AvaliacaoRouteDependencies = {
    getSession: async () => sessaoAvaliador,
    getContexto: async () => contextoBase,
    salvar: async (tccId, ctx, valor) => {
      chamadas.salvou++;
      return { id: ctx.bancaId, banca_id: ctx.bancaId, tcc_id: tccId, avaliador_id: ctx.avaliadorId, ...valor } as Avaliacao;
    },
    notificar: async () => {
      chamadas.notificou++;
    },
    ...over,
  };
  return { handler: createAvaliacaoPostHandler(deps), chamadas };
}

const final = { finalizar: true, nota: 9, decisao: "APROVADO", parecer: "Trabalho muito bem fundamentado e organizado." };

describe("POST /api/tcc/[tccId]/avaliacao", () => {
  it("recusa sem token CSRF (403)", async () => {
    const { handler, chamadas } = montar();
    const res = await handler(requisicao(final, false), context);
    expect(res.status).toBe(403);
    expect(chamadas.salvou).toBe(0);
  });

  it("recusa quem não é avaliador (403)", async () => {
    const { handler, chamadas } = montar({ getSession: async () => sessaoAluno });
    const res = await handler(requisicao(final), context);
    expect(res.status).toBe(403);
    expect(chamadas.salvou).toBe(0);
  });

  it("recusa avaliador fora da banca deste TCC (403)", async () => {
    const { handler, chamadas } = montar({ getContexto: async () => null });
    const res = await handler(requisicao(final), context);
    expect(res.status).toBe(403);
    expect(chamadas.salvou).toBe(0);
  });

  it("recusa avaliar antes da versão final existir (400)", async () => {
    const { handler } = montar({ getContexto: async () => ({ ...contextoBase, temVersaoFinal: false }) });
    expect((await handler(requisicao(final), context)).status).toBe(400);
  });

  it("não altera avaliação já finalizada (400)", async () => {
    const { handler, chamadas } = montar({
      getContexto: async () => ({
        ...contextoBase,
        avaliacaoAtual: { status: "FINALIZADA" } as Avaliacao,
      }),
    });
    expect((await handler(requisicao(final), context)).status).toBe(400);
    expect(chamadas.salvou).toBe(0);
  });

  it("rejeita nota inválida ao finalizar (400)", async () => {
    const { handler, chamadas } = montar();
    const res = await handler(requisicao({ ...final, nota: 12 }), context);
    expect(res.status).toBe(400);
    expect(chamadas.salvou).toBe(0);
  });

  it("rascunho salva sem notificar", async () => {
    const { handler, chamadas } = montar();
    const res = await handler(requisicao({ finalizar: false, parecer: "Anotações iniciais" }), context);
    expect(res.status).toBe(200);
    expect(chamadas).toEqual({ salvou: 1, notificou: 0 });
  });

  it("finalizar salva e notifica orientador e aluno", async () => {
    const { handler, chamadas } = montar();
    const res = await handler(requisicao(final), context);
    expect(res.status).toBe(200);
    expect(chamadas).toEqual({ salvou: 1, notificou: 1 });
  });
});
