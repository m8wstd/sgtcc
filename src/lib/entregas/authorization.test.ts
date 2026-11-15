import { describe, expect, it } from "vitest";
import { PerfilEnum } from "@/types";
import { podeExecutarAcao } from "./authorization";
import { ACOES_ENTREGA } from "./status";
import { registroTeste, sessaoTeste } from "./test-fixtures";

describe("autorização RF04", () => {
  const { tcc, contexto } = registroTeste();
  it("autoriza todas as ações de revisão apenas ao orientador atual", () => {
    for (const acao of ACOES_ENTREGA) expect(podeExecutarAcao(sessaoTeste(), tcc, contexto, acao)).toBe(true);
  });
  it.each([PerfilEnum.ALUNO, PerfilEnum.ADMIN, PerfilEnum.COORDENACAO, PerfilEnum.AVALIADOR])("nega o perfil %s", (perfil) => {
    for (const acao of ACOES_ENTREGA) expect(podeExecutarAcao(sessaoTeste(perfil), tcc, contexto, acao)).toBe(false);
  });
  it("compara o vínculo atual, mesmo quando o ID do professor difere do UID", () => {
    expect(podeExecutarAcao(sessaoTeste(PerfilEnum.ORIENTADOR, "antigo-uid"), tcc, contexto, "CONCLUIR")).toBe(false);
    expect(podeExecutarAcao(sessaoTeste(), { ...tcc, orientador_id: "novo-professor" }, contexto, "CONCLUIR")).toBe(false);
    expect(podeExecutarAcao(sessaoTeste(), tcc, {}, "CONCLUIR")).toBe(false);
  });
});
