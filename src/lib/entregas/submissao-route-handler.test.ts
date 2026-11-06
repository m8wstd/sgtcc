import { describe, expect, it, vi } from "vitest";
import { PerfilEnum, type Entrega, type MarcoCronograma, type VersaoArquivo } from "@/types";
import {
  createSubmissaoPostHandler,
  type SubmissaoRouteDependencies,
} from "@/lib/entregas/submissao-route-handler";

const context = { params: Promise.resolve({ tccId: "tcc-001" }) };
const AGORA = new Date("2026-11-06T12:00:00Z").getTime();
const DIA = 24 * 60 * 60 * 1000;

const sessaoAluno = {
  uid: "uid-aluno",
  perfil: PerfilEnum.ALUNO,
  usuario: { id: "uid-aluno", nome: "Jorge", email: "jorge@teste.sgtcc.dev", perfil: PerfilEnum.ALUNO },
  token: {} as never,
};
const sessaoOrientador = {
  ...sessaoAluno,
  uid: "uid-prof",
  perfil: PerfilEnum.ORIENTADOR,
  usuario: { ...sessaoAluno.usuario, id: "uid-prof", perfil: PerfilEnum.ORIENTADOR },
};

const tcc = {
  id: "tcc-001",
  titulo: "Meu TCC",
  statusGeral: "EM_ANDAMENTO" as const,
  aluno_id: "2026001",
  orientador_id: "uid-prof",
};
const registroDoAluno = { tcc, context: { aluno: { matricula: "2026001", usuario_id: "uid-aluno" } } };
const registroDeOutroAluno = { tcc, context: { aluno: { matricula: "9999999", usuario_id: "uid-aluno" } } };

const marcoAberto: MarcoCronograma = {
  id: "qualificacao",
  titulo: "Qualificação",
  dataLimite: new Date(AGORA + DIA).toISOString(),
  cronograma_id: "2026-2",
};

const pdf = () => Buffer.from("%PDF-1.7\nconteudo");

function requisicao(
  campos: { marcoId?: string; arquivo?: { nome: string; conteudo: Buffer | string } | null } = {},
  comCsrf = true,
) {
  const form = new FormData();
  form.set("marcoId", campos.marcoId ?? "qualificacao");
  const arquivo = campos.arquivo === undefined ? { nome: "capitulo1.pdf", conteudo: pdf() } : campos.arquivo;
  if (arquivo) form.set("arquivo", new Blob([new Uint8Array(Buffer.from(arquivo.conteudo))]), arquivo.nome);
  return new Request("http://localhost/api/tcc/tcc-001/entregas", {
    method: "POST",
    headers: comCsrf ? { cookie: "sgtcc_csrf=abc123", "x-csrf-token": "abc123" } : {},
    body: form,
  });
}

function montar(over: Partial<SubmissaoRouteDependencies> = {}) {
  const chamadas: { salvar: Parameters<SubmissaoRouteDependencies["salvar"]>[0][] } = { salvar: [] };
  const deps: SubmissaoRouteDependencies = {
    getSession: async () => sessaoAluno,
    getTcc: async () => registroDoAluno,
    getMarcoEEntrega: async () => ({ marco: marcoAberto, entrega: null }),
    salvar: async (entrada) => {
      chamadas.salvar.push(entrada);
      return {
        id: "tcc-001__qualificacao__v1",
        numeroVersao: 1,
        arquivoUrl: "tccs/tcc-001/entregas/tcc-001__qualificacao/v1_capitulo1.pdf",
        dataUpload: "2026-11-06T12:00:00.000Z",
        entrega_id: "tcc-001__qualificacao",
      } satisfies VersaoArquivo;
    },
    agora: () => AGORA,
    ...over,
  };
  return { handler: createSubmissaoPostHandler(deps), chamadas };
}

describe("POST /api/tcc/[tccId]/entregas (RF03)", () => {
  it("recusa sem token CSRF (403)", async () => {
    const { handler, chamadas } = montar();
    const res = await handler(requisicao({}, false), context);
    expect(res.status).toBe(403);
    expect(chamadas.salvar).toHaveLength(0);
  });

  it("recusa quem não é aluno (403)", async () => {
    const { handler, chamadas } = montar({ getSession: async () => sessaoOrientador });
    const res = await handler(requisicao(), context);
    expect(res.status).toBe(403);
    expect(chamadas.salvar).toHaveLength(0);
  });

  it("recusa aluno que não é dono do TCC (403)", async () => {
    const { handler, chamadas } = montar({ getTcc: async () => registroDeOutroAluno });
    const res = await handler(requisicao(), context);
    expect(res.status).toBe(403);
    expect(chamadas.salvar).toHaveLength(0);
  });

  it("devolve 404 quando o TCC não existe", async () => {
    const { handler } = montar({ getTcc: async () => null });
    expect((await handler(requisicao(), context)).status).toBe(404);
  });

  it("devolve 404 quando o marco não existe", async () => {
    const { handler } = montar({ getMarcoEEntrega: async () => ({ marco: null, entrega: null }) });
    expect((await handler(requisicao(), context)).status).toBe(404);
  });

  it("exige marco e arquivo (400)", async () => {
    const { handler, chamadas } = montar();
    expect((await handler(requisicao({ arquivo: null }), context)).status).toBe(400);
    expect((await handler(requisicao({ marcoId: "  " }), context)).status).toBe(400);
    expect(chamadas.salvar).toHaveLength(0);
  });

  it("recusa extensão fora de .pdf/.docx (400)", async () => {
    const { handler, chamadas } = montar();
    const res = await handler(requisicao({ arquivo: { nome: "programa.exe", conteudo: "MZ" } }), context);
    expect(res.status).toBe(400);
    expect(chamadas.salvar).toHaveLength(0);
  });

  it("recusa arquivo renomeado, cujo conteúdo não é do tipo declarado (400)", async () => {
    const { handler, chamadas } = montar();
    const res = await handler(requisicao({ arquivo: { nome: "falso.pdf", conteudo: "MZ nao sou pdf" } }), context);
    expect(res.status).toBe(400);
    expect(chamadas.salvar).toHaveLength(0);
  });

  it("recusa arquivo acima de 10 MB (413)", async () => {
    const { handler, chamadas } = montar();
    const grande = Buffer.concat([pdf(), Buffer.alloc(10 * 1024 * 1024)]);
    const res = await handler(requisicao({ arquivo: { nome: "grande.pdf", conteudo: grande } }), context);
    expect(res.status).toBe(413);
    expect(chamadas.salvar).toHaveLength(0);
  });

  it("bloqueia envio após o prazo quando o marco tem bloqueio estrito (403)", async () => {
    const vencido = { ...marcoAberto, dataLimite: new Date(AGORA - DIA).toISOString(), bloqueioEstrito: true };
    const { handler, chamadas } = montar({ getMarcoEEntrega: async () => ({ marco: vencido, entrega: null }) });
    const res = await handler(requisicao(), context);
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("DEADLINE_PASSED");
    expect(chamadas.salvar).toHaveLength(0);
  });

  it("aceita envio atrasado quando o marco não bloqueia, sinalizando o atraso", async () => {
    const vencido = { ...marcoAberto, dataLimite: new Date(AGORA - DIA).toISOString() };
    const { handler, chamadas } = montar({ getMarcoEEntrega: async () => ({ marco: vencido, entrega: null }) });
    const res = await handler(requisicao(), context);
    expect(res.status).toBe(201);
    expect((await res.json()).emAtraso).toBe(true);
    expect(chamadas.salvar).toHaveLength(1);
  });

  it("não aceita arquivo em entrega concluída (409)", async () => {
    const concluida: Entrega = {
      id: "ent-1",
      status: "CONCLUIDA",
      marco_id: "qualificacao",
      tcc_id: "tcc-001",
    };
    const { handler, chamadas } = montar({ getMarcoEEntrega: async () => ({ marco: marcoAberto, entrega: concluida }) });
    const res = await handler(requisicao(), context);
    expect(res.status).toBe(409);
    expect(chamadas.salvar).toHaveLength(0);
  });

  it("falha inesperada na gravação vira 500 com mensagem clara (não erro de autenticação)", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { handler } = montar({
      salvar: async () => {
        throw new Error("The specified bucket does not exist.");
      },
    });
    const res = await handler(requisicao(), context);
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("UPLOAD_FAILED");
    expect(log).toHaveBeenCalled(); // a causa real aparece no terminal do servidor
    log.mockRestore();
  });

  it("salva a nova versão e responde 201 com os dados da versão", async () => {
    const { handler, chamadas } = montar();
    const res = await handler(requisicao({ arquivo: { nome: "Capítulo 1.pdf", conteudo: pdf() } }), context);
    expect(res.status).toBe(201);

    const corpo = await res.json();
    expect(corpo.versao).toMatchObject({ numeroVersao: 1, nomeArquivo: "capitulo1.pdf" });
    expect(corpo.emAtraso).toBe(false);
    // o conteúdo do arquivo e o nome sanitizado chegam à camada de persistência
    expect(chamadas.salvar[0].arquivo.nomeSeguro).toBe("Capitulo_1.pdf");
    expect(chamadas.salvar[0].arquivo.contentType).toBe("application/pdf");
    expect(chamadas.salvar[0].arquivo.bytes.equals(pdf())).toBe(true);
    expect(chamadas.salvar[0].entrega).toBeNull();
  });
});
