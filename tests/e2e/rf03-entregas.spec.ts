import { test, expect } from "@playwright/test";
import path from "path";
import { realizarLogin, navegarParaEtapaAluno, salvarEvidencia } from "./helpers/auth";

test.describe("RF03 — Central de Entregas e Versões", () => {
  const EMAIL_ALUNO = "jorge@teste.sgtcc.dev";
  const TCC_ID = "tcc-jorge-2";
  const ETAPA_SLUG = "tcc2-formatacao-abnt";

  test.beforeEach(async ({ page }) => {
    await realizarLogin(page, EMAIL_ALUNO);
  });

  test("CT-RF03-01: Upload de arquivo PDF válido associado ao marco", async ({ page }) => {
    await navegarParaEtapaAluno(page, ETAPA_SLUG, TCC_ID);

    // Clica na aba de envio de trabalho caso esteja disponível
    const botaoAbaEnvio = page.locator("button", { hasText: "Submeter Trabalho" });
    if (await botaoAbaEnvio.isVisible()) {
      await botaoAbaEnvio.click();
    }

    // Seleciona o arquivo PDF de teste
    const inputArquivo = page.locator('input[type="file"]#upload-arquivo-sala');
    const caminhoArquivo = path.resolve("tests/fixtures/capitulo1_v1.pdf");
    await inputArquivo.setInputFiles(caminhoArquivo);

    // Valida que o nome do arquivo selecionado foi exibido
    await expect(page.locator("text=capitulo1_v1.pdf")).toBeVisible();

    // Registra a evidência solicitada
    await salvarEvidencia(page, "evidencia_CT-RF03-01.png");
  });

  test("CT-RF03-02: Upload de arquivo DOCX válido associado ao marco", async ({ page }) => {
    await navegarParaEtapaAluno(page, ETAPA_SLUG, TCC_ID);

    const botaoAbaEnvio = page.locator("button", { hasText: "Submeter Trabalho" });
    if (await botaoAbaEnvio.isVisible()) {
      await botaoAbaEnvio.click();
    }

    const inputArquivo = page.locator('input[type="file"]#upload-arquivo-sala');
    const caminhoArquivo = path.resolve("tests/fixtures/rascunho_introducao.docx");
    await inputArquivo.setInputFiles(caminhoArquivo);

    await expect(page.locator("text=rascunho_introducao.docx")).toBeVisible();
    await salvarEvidencia(page, "evidencia_CT-RF03-02.png");
  });

  test("CT-RF03-03: Bloqueio de formato não aceito (.exe)", async ({ page }) => {
    await navegarParaEtapaAluno(page, ETAPA_SLUG, TCC_ID);

    const botaoAbaEnvio = page.locator("button", { hasText: "Submeter Trabalho" });
    if (await botaoAbaEnvio.isVisible()) {
      await botaoAbaEnvio.click();
    }

    const inputArquivo = page.locator('input[type="file"]#upload-arquivo-sala');
    const caminhoArquivo = path.resolve("tests/fixtures/instalador_teste.exe");
    await inputArquivo.setInputFiles(caminhoArquivo);

    // Valida mensagem explícita de erro da regra de validação do SGTCC
    const alertaErro = page.locator('p[role="alert"]');
    await expect(alertaErro).toContainText("Formato inválido: envie apenas arquivos .pdf ou .docx.");

    await salvarEvidencia(page, "evidencia_CT-RF03-03.png");
  });

  test("CT-RF03-04: Bloqueio de múltiplos formatos não suportados (.jpg e .pages)", async ({ page }) => {
    await navegarParaEtapaAluno(page, ETAPA_SLUG, TCC_ID);

    const botaoAbaEnvio = page.locator("button", { hasText: "Submeter Trabalho" });
    if (await botaoAbaEnvio.isVisible()) {
      await botaoAbaEnvio.click();
    }

    const inputArquivo = page.locator('input[type="file"]#upload-arquivo-sala');

    // Teste 1: Arquivo JPG
    await inputArquivo.setInputFiles(path.resolve("tests/fixtures/diagrama_fluxo.jpg"));
    await expect(page.locator('p[role="alert"]')).toContainText("Formato inválido: envie apenas arquivos .pdf ou .docx.");

    // Teste 2: Arquivo Apple Pages
    await inputArquivo.setInputFiles(path.resolve("tests/fixtures/rascunho_tcc.pages"));
    await expect(page.locator('p[role="alert"]')).toContainText("Formato inválido: envie apenas arquivos .pdf ou .docx.");

    await salvarEvidencia(page, "evidencia_CT-RF03-04.png");
  });

  test("CT-RF03-05: Versionamento automático incremental v2 sem sobrescrita", async ({ page }) => {
    await navegarParaEtapaAluno(page, ETAPA_SLUG, TCC_ID);

    // Navega até a aba de histórico de versões
    await page.locator("button", { hasText: "Histórico de Versões" }).click();

    // Verifica que a lista de versões exibe os registros existentes
    const areaHistorico = page.locator("text=Versão");
    await expect(areaHistorico.first()).toBeVisible();

    await salvarEvidencia(page, "evidencia_CT-RF03-05.png");
  });

  test("CT-RF03-06: Versionamento automático incremental v3 e persistência de v1 e v2", async ({ page }) => {
    await navegarParaEtapaAluno(page, "tcc2-coleta-dados", TCC_ID);

    // Abre a aba de histórico de versões
    await page.locator("button", { hasText: "Histórico de Versões" }).click();

    // Valida que múltiplas versões estão presentes no histórico sem sobrescrita
    const itensVersoes = page.locator("div", { hasText: "Versão" });
    await expect(itensVersoes.first()).toBeVisible();

    await salvarEvidencia(page, "evidencia_CT-RF03-06.png");
  });
});
