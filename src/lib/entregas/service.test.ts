import { describe, expect, it, vi } from "vitest";
import { PerfilEnum } from "@/types";
import type { ConfirmadorSubmissao, EntregaRepository, MudancaEntrega } from "./contracts";
import { criarServicoEntregas } from "./service";
import { confirmadorSubmissaoRF03 } from "./submission";
import { registroTeste, sessaoTeste } from "./test-fixtures";

function preparar() {
  const registro = registroTeste();
  const gravacoes: MudancaEntrega[] = [];
  const confirmar = vi.fn<ConfirmadorSubmissao["confirmar"]>().mockResolvedValue(true);
  const repository: EntregaRepository = {
    async alterarEmTransacao(_id, _sessao, decidir) {
      const mudanca = await decidir(registro);
      gravacoes.push(mudanca);
      return { entrega: { id: registro.entrega.id, status: mudanca.status } };
    },
  };
  const servico = criarServicoEntregas(repository, { confirmar });
  const comando = { acao: "INICIAR_REVISAO" as const, revisaoEsperada: registro.revisao };
  return { registro, gravacoes, confirmar, repository, servico, comando };
}

describe("serviço RF04", () => {
  it("inicia revisão usando a versão persistida e não altera dados de submissão/TCC", async () => {
    const { servico, comando, gravacoes, registro, confirmar } = preparar();
    await expect(servico.alterarStatus("entrega-teste", sessaoTeste(), comando)).resolves.toMatchObject({ entrega: { status: "EM_REVISAO" } });
    expect(confirmar).toHaveBeenCalledWith(registro.versoes[0].versao, registro.entrega, registro.tcc);
    expect(gravacoes).toEqual([{ status: "EM_REVISAO" }]);
    expect(registro.tcc.statusGeral).toBe("EM_ANDAMENTO");
  });
  it.each(["AGUARDANDO_ENVIO", "SOLICITADA_CORRECAO"] as const)("não altera o status de submissão RF03 %s", async (status) => {
    const { registro, servico, gravacoes, comando } = preparar();
    registro.entrega.status = status;
    await expect(servico.alterarStatus("entrega-teste", sessaoTeste(), comando)).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    expect(gravacoes).toEqual([]);
  });
  it("confirma a versão mais recente e bloqueia quando RF03 não confirma", async () => {
    const { servico, confirmar, gravacoes, comando } = preparar();
    confirmar.mockResolvedValue(false);
    await expect(servico.alterarStatus("entrega-teste", sessaoTeste(), comando)).rejects.toMatchObject({ code: "SUBMISSION_NOT_CONFIRMED" });
    expect(gravacoes).toEqual([]);
  });
  it("mantém ações bloqueadas até existir integração com RF03", async () => {
    const { repository, gravacoes, comando } = preparar();
    await expect(criarServicoEntregas(repository, confirmadorSubmissaoRF03).alterarStatus("entrega-teste", sessaoTeste(), comando))
      .rejects.toMatchObject({ status: 503, code: "RF03_NOT_INTEGRATED" });
    expect(gravacoes).toEqual([]);
  });
  it("rejeita revisão concorrente obsoleta antes da confirmação", async () => {
    const { servico, confirmar, gravacoes, comando } = preparar();
    await expect(servico.alterarStatus("entrega-teste", sessaoTeste(), { ...comando, revisaoEsperada: "100:123456788" }))
      .rejects.toMatchObject({ code: "STALE_REVISION" });
    expect(confirmar).not.toHaveBeenCalled();
    expect(gravacoes).toEqual([]);
  });
  it("nega orientador antigo ou outro perfil", async () => {
    const { servico, confirmar, comando } = preparar();
    await expect(servico.alterarStatus("entrega-teste", sessaoTeste(PerfilEnum.ORIENTADOR, "antigo"), comando)).rejects.toMatchObject({ status: 403 });
    await expect(servico.alterarStatus("entrega-teste", sessaoTeste(PerfilEnum.ALUNO, "usuario-aluno"), comando)).rejects.toMatchObject({ status: 403 });
    expect(confirmar).not.toHaveBeenCalled();
  });
  it("exige comentário não vazio para solicitar correção", async () => {
    const { servico, registro, gravacoes, comando } = preparar();
    registro.entrega.status = "EM_REVISAO";
    for (const comentario of [undefined, "", "  ", "a".repeat(4001)]) {
      await expect(servico.alterarStatus("entrega-teste", sessaoTeste(), { ...comando, acao: "SOLICITAR_CORRECAO", comentario }))
        .rejects.toMatchObject({ status: 400 });
    }
    expect(gravacoes).toEqual([]);
  });
  it("persiste comentário aparado junto da mudança de status", async () => {
    const { servico, registro, gravacoes, comando } = preparar();
    registro.entrega.status = "EM_REVISAO";
    await servico.alterarStatus("entrega-teste", sessaoTeste(), { ...comando, acao: "SOLICITAR_CORRECAO", comentario: "  Ajustar referências.  " });
    expect(gravacoes).toEqual([{ status: "SOLICITADA_CORRECAO", comentario: "Ajustar referências." }]);
  });
  it.each(["arquivo-invalido", "numero-duplicado"])("rejeita %s", async (problema) => {
    const { servico, registro, comando, gravacoes } = preparar();
    if (problema === "arquivo-invalido") registro.versoes[0].versao.arquivoUrl = "https://example.test/programa.exe";
    if (problema === "numero-duplicado") registro.versoes.push({ ...registro.versoes[0], versao: { ...registro.versoes[0].versao, id: "duplicada" } });
    await expect(servico.alterarStatus("entrega-teste", sessaoTeste(), comando)).rejects.toMatchObject({ code: "INVALID_SUBMISSION" });
    expect(gravacoes).toEqual([]);
  });
});
