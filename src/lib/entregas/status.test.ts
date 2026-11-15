import { describe, expect, it } from "vitest";
import type { StatusEntrega } from "@/types";
import { ACOES_ENTREGA, acoesParaStatus, proximoStatus } from "./status";
import { revisaoDocumento } from "./contracts";

const permitidas: Record<StatusEntrega, Partial<Record<(typeof ACOES_ENTREGA)[number], StatusEntrega>>> = {
  AGUARDANDO_ENVIO: {},
  PRONTA_PARA_REVISAO: { INICIAR_REVISAO: "EM_REVISAO" },
  EM_REVISAO: { SOLICITAR_CORRECAO: "SOLICITADA_CORRECAO", CONCLUIR: "CONCLUIDA" },
  SOLICITADA_CORRECAO: {},
  CONCLUIDA: {},
  ATRASADA: {},
};

describe("transições RF04", () => {
  for (const [origem, destinos] of Object.entries(permitidas)) {
    for (const acao of ACOES_ENTREGA) {
      it(`${origem} / ${acao}`, () => {
        const destino = destinos[acao];
        if (destino) expect(proximoStatus(origem as StatusEntrega, acao)).toBe(destino);
        else expect(() => proximoStatus(origem as StatusEntrega, acao)).toThrow(expect.objectContaining({ status: 409 }));
      });
    }
  }
  it("não assume a transição de submissão da RF03", () => {
    expect(acoesParaStatus("AGUARDANDO_ENVIO")).toEqual([]);
    expect(acoesParaStatus("SOLICITADA_CORRECAO")).toEqual([]);
  });
  it("preserva diferenças de nanossegundos na revisão", () => {
    expect(revisaoDocumento({ seconds: 1, nanoseconds: 1 })).not.toBe(revisaoDocumento({ seconds: 1, nanoseconds: 2 }));
  });
});
