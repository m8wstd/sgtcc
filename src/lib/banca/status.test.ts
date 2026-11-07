import { describe, expect, it } from "vitest";
import { etapaBanca, lerNota, validarAvaliacao } from "@/lib/banca/status";

describe("etapaBanca", () => {
  it("sem versão final → AGUARDANDO_ENVIO", () => {
    expect(etapaBanca(false, null)).toBe("AGUARDANDO_ENVIO");
  });
  it("com versão final e sem avaliação → PRONTA_PARA_AVALIAR", () => {
    expect(etapaBanca(true, null)).toBe("PRONTA_PARA_AVALIAR");
  });
  it("rascunho → EM_AVALIACAO", () => {
    expect(etapaBanca(true, { status: "RASCUNHO" })).toBe("EM_AVALIACAO");
  });
  it("finalizada → AVALIADA", () => {
    expect(etapaBanca(true, { status: "FINALIZADA" })).toBe("AVALIADA");
  });
});

describe("lerNota", () => {
  it("aceita vírgula e ponto", () => {
    expect(lerNota("9,5")).toBe(9.5);
    expect(lerNota("9.5")).toBe(9.5);
  });
  it("vazio → undefined; lixo → NaN", () => {
    expect(lerNota("")).toBeUndefined();
    expect(Number.isNaN(lerNota("abc"))).toBe(true);
  });
});

describe("validarAvaliacao", () => {
  const parecerOk = "Trabalho consistente, com boa fundamentação teórica.";

  it("rascunho aceita campos parciais", () => {
    expect(validarAvaliacao({ finalizar: false, parecer: "Anotação inicial" })).toEqual({
      ok: true,
      valor: { status: "RASCUNHO", nota: undefined, decisao: undefined, parecer: "Anotação inicial" },
    });
  });
  it("rascunho vazio é recusado", () => {
    expect(validarAvaliacao({ finalizar: false }).ok).toBe(false);
  });
  it("finalizar exige nota, decisão e parecer mínimo", () => {
    expect(validarAvaliacao({ finalizar: true, decisao: "APROVADO", parecer: parecerOk }).ok).toBe(false);
    expect(validarAvaliacao({ finalizar: true, nota: 8, parecer: parecerOk }).ok).toBe(false);
    expect(validarAvaliacao({ finalizar: true, nota: 8, decisao: "APROVADO", parecer: "curto" }).ok).toBe(false);
    expect(validarAvaliacao({ finalizar: true, nota: 8, decisao: "APROVADO", parecer: parecerOk }).ok).toBe(true);
  });
  it("recusa nota fora de 0–10 e decisão desconhecida", () => {
    expect(validarAvaliacao({ finalizar: true, nota: 11, decisao: "APROVADO", parecer: parecerOk }).ok).toBe(false);
    expect(validarAvaliacao({ finalizar: true, nota: -1, decisao: "APROVADO", parecer: parecerOk }).ok).toBe(false);
    expect(validarAvaliacao({ finalizar: true, nota: 8, decisao: "TALVEZ", parecer: parecerOk }).ok).toBe(false);
  });
});
