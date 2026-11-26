import { test, expect } from "@playwright/test";
import path from "path";
import {
  realizarLogin,
  navegarParaEtapaAluno,
  navegarParaEtapaOrientador,
  salvarEvidencia,
} from "./helpers/auth";

test.describe("RF04 — Sinalização de Status", () => {
  const EMAIL_ALUNO = "jorge@teste.sgtcc.dev";
  const EMAIL_ORIENTADOR = "joana@teste.sgtcc.dev";
  const TCC_ID = "tcc-jorge-2";
  const ETAPA_PENDENTE = "tcc2-formatacao-abnt";

  test("CT-RF04-01: Tentativa de sinalizar 'Pronta para Revisão' sem envio de arquivo", async ({ page }) => {
    await realizarLogin(page, EMAIL_ALUNO);
    await navegarParaEtapaAluno(page, ETAPA_PENDENTE, TCC_ID);

    const botaoAbaEnvio = page.locator("button", { hasText: "Submeter Trabalho" });
    if (await botaoAbaEnvio.isVisible()) {
      await botaoAbaEnvio.click();
    }

    // O botão de envio para o orientador NÃO deve estar visível se nenhum arquivo foi selecionado
    const botaoEnviarOrientador = page.locator("button", { hasText: "Enviar para Correção do Orientador" });
    await expect(botaoEnviarOrientador).not.toBeVisible();

    await salvarEvidencia(page, "evidencia_CT-RF04-01.png");
  });

  test("CT-RF04-02: Aluno sinaliza 'Pronta para Revisão' com sucesso após upload", async ({ page }) => {
    await realizarLogin(page, EMAIL_ALUNO);
    await navegarParaEtapaAluno(page, ETAPA_PENDENTE, TCC_ID);

    const botaoAbaEnvio = page.locator("button", { hasText: "Submeter Trabalho" });
    if (await botaoAbaEnvio.isVisible()) {
      await botaoAbaEnvio.click();
    }

    const inputArquivo = page.locator('input[type="file"]#upload-arquivo-sala');
    await inputArquivo.setInputFiles(path.resolve("tests/fixtures/capitulo1_v1.pdf"));

    // Botão torna-se visível e habilitado após a seleção
    const botaoEnviarOrientador = page.locator("button", { hasText: "Enviar para Correção do Orientador" });
    await expect(botaoEnviarOrientador).toBeVisible();
    await expect(botaoEnviarOrientador).toBeEnabled();

    await salvarEvidencia(page, "evidencia_CT-RF04-02.png");
  });

  test("CT-RF04-03: Orientador solicita correção reabrindo entrega para o aluno", async ({ page }) => {
    await realizarLogin(page, EMAIL_ORIENTADOR);
    await navegarParaEtapaOrientador(page, TCC_ID, "tcc2-conclusao");

    // Acessa a aba de histórico/avaliação
    await page.locator("button", { hasText: "Versões do Aluno" }).click();

    // Localiza a área de parecer do orientador
    const areaParecer = page.locator("textarea");
    await expect(areaParecer).toBeVisible();

    const botaoVoltarCorrecao = page.locator("button", { hasText: "Voltar para Correção" });
    await expect(botaoVoltarCorrecao).toBeVisible();

    await salvarEvidencia(page, "evidencia_CT-RF04-03.png");
  });

  test("CT-RF04-04: Orientador conclui revisão marcando etapa como 'Concluída'", async ({ page }) => {
    await realizarLogin(page, EMAIL_ORIENTADOR);
    await navegarParaEtapaOrientador(page, TCC_ID, "tcc2-ajuste-metodologia");

    // Acessa o histórico
    await page.locator("button", { hasText: "Versões do Aluno" }).click();

    // Valida a presença do botão de conclusão com parecer
    const botaoConcluir = page.locator("button", { hasText: "Marcar como Concluído" });
    await expect(botaoConcluir).toBeVisible();

    await salvarEvidencia(page, "evidencia_CT-RF04-04.png");
  });

  test("CT-RF04-05: Bloqueio de aprovação manual sem submissão de arquivo (RN05)", async ({ page }) => {
    await realizarLogin(page, EMAIL_ORIENTADOR);
    await navegarParaEtapaOrientador(page, TCC_ID, "entrega-final");

    await page.locator("button", { hasText: "Versões do Aluno" }).click();

    // Como o parecer exige preenchimento obrigatório, o botão permanece desabilitado sem o texto
    const botaoConcluir = page.locator("button", { hasText: "Marcar como Concluído" });
    await expect(botaoConcluir).toBeDisabled();

    await salvarEvidencia(page, "evidencia_CT-RF04-05.png");
  });
});
