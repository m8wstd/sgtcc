import { describe, expect, it } from "vitest";
import type { Firestore } from "firebase-admin/firestore";
import { salvarVersao, type ArquivoParaSalvar } from "@/lib/entregas/submissao-route-handler";
import type { Entrega, MarcoCronograma } from "@/types";

/**
 * Fakes em memória só com o que `salvarVersao` usa do Firestore e do Storage.
 * Reproduzem as garantias que o código depende: `create` falha se o documento já existe
 * (ALREADY_EXISTS = 6) e `save` com `ifGenerationMatch: 0` falha se o objeto existe (412).
 */
function criarAmbiente(opcoes: { versoesVisiveisNaPrimeiraLeitura?: "obsoleta" } = {}) {
  const docs = new Map<string, Record<string, unknown>>(); // "colecao/id" -> dados
  const arquivos = new Map<string, Buffer>();
  let leiturasDeVersoes = 0;

  const ref = (colecao: string, id: string) => ({
    id,
    path: `${colecao}/${id}`,
    get: async () => ({ exists: docs.has(`${colecao}/${id}`), data: () => docs.get(`${colecao}/${id}`) }),
  });

  const db = {
    collection: (colecao: string) => ({
      doc: (id: string) => ref(colecao, id),
      where: (campo: string, _op: string, valor: unknown) => ({
        get: async () => {
          if (colecao === "versoes_arquivo") leiturasDeVersoes++;
          // Simula uma corrida: a 1ª leitura de versões ainda não vê o envio concorrente.
          const obsoleta = opcoes.versoesVisiveisNaPrimeiraLeitura === "obsoleta" && leiturasDeVersoes === 1;
          const itens = obsoleta
            ? []
            : [...docs.entries()]
                .filter(([k, d]) => k.startsWith(`${colecao}/`) && d[campo] === valor)
                .map(([, d]) => ({ data: () => d }));
          return { docs: itens };
        },
      }),
    }),
    batch: () => {
      const operacoes: Array<() => void> = [];
      return {
        create: (r: { path: string }, dados: Record<string, unknown>) =>
          operacoes.push(() => {
            if (docs.has(r.path)) throw Object.assign(new Error("ALREADY_EXISTS"), { code: 6 });
            docs.set(r.path, dados);
          }),
        update: (r: { path: string }, dados: Record<string, unknown>) =>
          operacoes.push(() => docs.set(r.path, { ...docs.get(r.path), ...dados })),
        commit: async () => {
          // atômico: valida num rascunho e só então aplica
          const copia = new Map(docs);
          try {
            operacoes.forEach((op) => op());
          } catch (e) {
            docs.clear();
            copia.forEach((v, k) => docs.set(k, v));
            throw e;
          }
        },
      };
    },
  } as unknown as Firestore;

  const bucket = {
    file: (caminho: string) => ({
      save: async (bytes: Buffer, opts: { preconditionOpts?: { ifGenerationMatch?: number } }) => {
        if (opts.preconditionOpts?.ifGenerationMatch === 0 && arquivos.has(caminho)) {
          throw Object.assign(new Error("precondition"), { code: 412 });
        }
        arquivos.set(caminho, bytes);
      },
      delete: async () => {
        arquivos.delete(caminho);
      },
    }),
  };

  return { db, bucket, docs, arquivos };
}

const marco: MarcoCronograma = { id: "qualificacao", titulo: "Qualificação", dataLimite: "2026-12-01", cronograma_id: "c" };
const arquivo = (nome = "cap1.pdf", conteudo = "%PDF-1.7 a"): ArquivoParaSalvar => ({
  nomeSeguro: nome,
  contentType: "application/pdf",
  extensao: ".pdf",
  bytes: Buffer.from(conteudo),
});

describe("salvarVersao (persistência da RF03)", () => {
  it("primeiro envio: cria a entrega (AGUARDANDO_ENVIO) e a versão 1", async () => {
    const { db, bucket, docs, arquivos } = criarAmbiente();
    const v = await salvarVersao(db, bucket, { tccId: "tcc-1", marco, entrega: null, arquivo: arquivo() });

    expect(v).toMatchObject({ numeroVersao: 1, entrega_id: "tcc-1__qualificacao" });
    expect(docs.get("entregas/tcc-1__qualificacao")).toMatchObject({
      status: "AGUARDANDO_ENVIO",
      marco_id: "qualificacao",
      tcc_id: "tcc-1",
    });
    expect(docs.get("versoes_arquivo/tcc-1__qualificacao__v1")).toMatchObject({ numeroVersao: 1 });
    expect([...arquivos.keys()]).toEqual(["tccs/tcc-1/entregas/tcc-1__qualificacao/v1_cap1.pdf"]);
  });

  it("segundo envio: cria a v2, preserva a v1 e NÃO muda o status da entrega", async () => {
    const { db, bucket, docs, arquivos } = criarAmbiente();
    await salvarVersao(db, bucket, { tccId: "tcc-1", marco, entrega: null, arquivo: arquivo("cap1.pdf", "%PDF primeira") });

    const entrega = { id: "tcc-1__qualificacao", status: "SOLICITADA_CORRECAO", marco_id: "qualificacao", tcc_id: "tcc-1" } as Entrega;
    docs.set("entregas/tcc-1__qualificacao", { ...entrega });
    const v2 = await salvarVersao(db, bucket, { tccId: "tcc-1", marco, entrega, arquivo: arquivo("cap1.pdf", "%PDF segunda") });

    expect(v2.numeroVersao).toBe(2);
    expect(arquivos.get("tccs/tcc-1/entregas/tcc-1__qualificacao/v1_cap1.pdf")?.toString()).toBe("%PDF primeira"); // intacta
    expect(arquivos.get("tccs/tcc-1/entregas/tcc-1__qualificacao/v2_cap1.pdf")?.toString()).toBe("%PDF segunda");
    expect(docs.get("entregas/tcc-1__qualificacao")?.status).toBe("SOLICITADA_CORRECAO");
    expect(docs.get("entregas/tcc-1__qualificacao")?.dataSubmissao).toBeDefined();
  });

  it("continua a numeração a partir de versões antigas do seed (ids diferentes)", async () => {
    const { db, bucket, docs } = criarAmbiente();
    docs.set("entregas/entrega-maria-1", { id: "entrega-maria-1", status: "SOLICITADA_CORRECAO" });
    docs.set("versoes_arquivo/v1-maria", { id: "v1-maria", numeroVersao: 1, entrega_id: "entrega-maria-1" });

    const entrega = { id: "entrega-maria-1", status: "SOLICITADA_CORRECAO", marco_id: "qualificacao", tcc_id: "tcc-maria" } as Entrega;
    const v = await salvarVersao(db, bucket, { tccId: "tcc-maria", marco, entrega, arquivo: arquivo() });

    expect(v.numeroVersao).toBe(2);
    expect(docs.has("versoes_arquivo/v1-maria")).toBe(true);
  });

  it("corrida: se outro envio ocupou a versão, refaz com a seguinte e não deixa arquivo órfão nem sobrescreve", async () => {
    const { db, bucket, docs, arquivos } = criarAmbiente({ versoesVisiveisNaPrimeiraLeitura: "obsoleta" });
    // outro envio concorrente já gravou a v1 (arquivo e documento)
    const entregaId = "tcc-1__qualificacao";
    docs.set(`entregas/${entregaId}`, { id: entregaId, status: "AGUARDANDO_ENVIO", marco_id: "qualificacao", tcc_id: "tcc-1" });
    docs.set(`versoes_arquivo/${entregaId}__v1`, { id: `${entregaId}__v1`, numeroVersao: 1, entrega_id: entregaId });
    arquivos.set(`tccs/tcc-1/entregas/${entregaId}/v1_outro.pdf`, Buffer.from("%PDF do outro"));

    const v = await salvarVersao(db, bucket, { tccId: "tcc-1", marco, entrega: null, arquivo: arquivo("meu.pdf", "%PDF meu") });

    expect(v.numeroVersao).toBe(2);
    expect(arquivos.get(`tccs/tcc-1/entregas/${entregaId}/v1_outro.pdf`)?.toString()).toBe("%PDF do outro");
    // o arquivo gravado na tentativa perdida (v1_meu.pdf) foi removido
    expect(arquivos.has(`tccs/tcc-1/entregas/${entregaId}/v1_meu.pdf`)).toBe(false);
    expect(arquivos.get(`tccs/tcc-1/entregas/${entregaId}/v2_meu.pdf`)?.toString()).toBe("%PDF meu");
  });

  it("não sobrescreve um objeto que já existe no Storage com o mesmo caminho", async () => {
    const { db, bucket, arquivos } = criarAmbiente();
    const entregaId = "tcc-1__qualificacao";
    // objeto órfão no caminho da v1, sem documento correspondente
    arquivos.set(`tccs/tcc-1/entregas/${entregaId}/v1_cap1.pdf`, Buffer.from("%PDF antigo"));

    await expect(
      salvarVersao(db, bucket, { tccId: "tcc-1", marco, entrega: null, arquivo: arquivo("cap1.pdf", "%PDF novo") }),
    ).rejects.toMatchObject({ code: "VERSION_CONFLICT" });
    expect(arquivos.get(`tccs/tcc-1/entregas/${entregaId}/v1_cap1.pdf`)?.toString()).toBe("%PDF antigo");
  });
});
