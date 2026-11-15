import { describe, expect, it } from "vitest";
import { montarCentralEntregas } from "@/lib/entregas/central";
import type { ItemMarco, PainelTcc } from "@/lib/data/queries";

const DIA = 24 * 60 * 60 * 1000;
const agora = new Date("2026-11-06T12:00:00Z").getTime();
const iso = (deslocamento: number) => new Date(agora + deslocamento).toISOString();

function item(over: Partial<ItemMarco> & { marco: ItemMarco["marco"] }): ItemMarco {
  return { entrega: null, statusEfetivo: "AGUARDANDO_ENVIO", versoes: [], feedbacks: [], ...over };
}

const painel = {
  tcc: {} as PainelTcc["tcc"],
  itens: [
    item({
      marco: { id: "qualificacao", titulo: "Qualificação", dataLimite: iso(-30 * DIA), cronograma_id: "c" },
      entrega: { id: "e1", status: "CONCLUIDA", marco_id: "qualificacao", tcc_id: "t" },
      statusEfetivo: "CONCLUIDA",
      versoes: [
        { id: "v1", numeroVersao: 1, arquivoUrl: "tccs/t/entregas/e1/v1_cap1.pdf", dataUpload: iso(-40 * DIA), entrega_id: "e1" },
        { id: "v2", numeroVersao: 2, arquivoUrl: "tccs/t/entregas/e1/v2_cap1.pdf", dataUpload: iso(-35 * DIA), entrega_id: "e1" },
      ],
    }),
    item({
      marco: { id: "entrega-final", titulo: "Entrega Final", dataLimite: iso(-1 * DIA), cronograma_id: "c", bloqueioEstrito: true },
      statusEfetivo: "ATRASADA",
    }),
    item({
      marco: { id: "defesa", titulo: "Defesa", dataLimite: iso(10 * DIA), cronograma_id: "c" },
    }),
  ],
} as PainelTcc;

describe("Central de Entregas (montagem da tela)", () => {
  const central = montarCentralEntregas(painel, agora);

  it("marco com entrega concluída não aceita envio e lista versões da mais nova para a mais antiga", () => {
    expect(central[0]).toMatchObject({ podeEnviar: false, status: "CONCLUIDA" });
    expect(central[0].motivoBloqueio).toMatch(/concluída/);
    expect(central[0].versoes.map((v) => v.numeroVersao)).toEqual([2, 1]);
    expect(central[0].versoes[0].nomeArquivo).toBe("cap1.pdf");
  });

  it("marco vencido com bloqueio estrito não aceita envio", () => {
    expect(central[1]).toMatchObject({ podeEnviar: false, bloqueioEstrito: true });
    expect(central[1].motivoBloqueio).toMatch(/prazo/);
  });

  it("marco dentro do prazo aceita envio", () => {
    expect(central[2]).toMatchObject({ podeEnviar: true, emAtraso: false, versoes: [] });
  });

  it("não vaza o caminho interno do Storage para a tela", () => {
    expect(JSON.stringify(central)).not.toContain("tccs/t/entregas");
  });
});
