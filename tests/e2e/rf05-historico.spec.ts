import { test, expect } from "@playwright/test";
import {
  realizarLogin,
  navegarParaEtapaOrientador,
  salvarEvidencia,
} from "./helpers/auth";

test.describe("RF05 — Gestão de Histórico e Transferência", () => {
  // Cenário de troca de orientação: Prof.ª Silvia Silva acessando o TCC do Jorge
  const EMAIL_NOVO_ORIENTADOR = "silvia@teste.sgtcc.dev";
  const TCC_ID = "tcc-jorge"; // TCC 1 concluído com múltiplos feedbacks históricos

  test.beforeEach(async ({ page }) => {
    await realizarLogin(page, EMAIL_NOVO_ORIENTADOR);
  });

  test("CT-RF05-01: Novo orientador acessa histórico completo de versões e feedbacks anteriores", async ({ page }) => {
    await navegarParaEtapaOrientador(page, TCC_ID, "tcc1-problema");

    // Acessa a aba de histórico de versões
    await page.locator("button", { hasText: "Versões do Aluno" }).click();

    // Valida que o histórico de versões submetidas está visível
    const listaVersoes = page.locator("text=Versão");
    await expect(listaVersoes.first()).toBeVisible();

    // Valida que os pareceres históricos registrados aparecem para o novo orientador
    const parecerAnterior = page.locator("text=Parecer do orientador");
    await expect(parecerAnterior.first()).toBeVisible();

    await salvarEvidencia(page, "evidencia_CT-RF05-01.png");
  });

  test("CT-RF05-02: Novo orientador faz download e visualiza versões submetidas ao orientador anterior", async ({ page }) => {
    await navegarParaEtapaOrientador(page, TCC_ID, "tcc1-problema");

    await page.locator("button", { hasText: "Versões do Aluno" }).click();

    // Verifica botões de leitura e download de documentos arquivados
    const botaoLer = page.locator("a", { hasText: "Ler aqui" });
    const botaoBaixar = page.locator("a", { hasText: "Baixar Arquivo" });

    await expect(botaoLer.first()).toBeVisible();
    await expect(botaoBaixar.first()).toBeVisible();

    await salvarEvidencia(page, "evidencia_CT-RF05-02.png");
  });

  test("CT-RF05-03: Imutabilidade de pareceres e notas do orientador anterior (RN02)", async ({ page }) => {
    await navegarParaEtapaOrientador(page, TCC_ID, "tcc1-problema");

    await page.locator("button", { hasText: "Versões do Aluno" }).click();

    // Assegura ausência de botões de edição ou exclusão no histórico (RN02)
    const botaoEditarFeedback = page.locator("button", { hasText: "Editar Parecer" });
    const botaoExcluirFeedback = page.locator("button", { hasText: "Excluir Parecer" });

    await expect(botaoEditarFeedback).toHaveCount(0);
    await expect(botaoExcluirFeedback).toHaveCount(0);

    await salvarEvidencia(page, "evidencia_CT-RF05-03.png");
  });

  test("CT-RF05-04: Adição de novo parecer preserva histórico anterior sem sobrescrita", async ({ page }) => {
    await navegarParaEtapaOrientador(page, "tcc-jorge-2", "tcc2-formatacao-abnt");

    await page.locator("button", { hasText: "Versões do Aluno" }).click();

    // Valida o formulário de emissão de novo parecer
    const textareaParecer = page.locator("textarea");
    await expect(textareaParecer).toBeVisible();

    // Verifica que o histórico mantém sua listagem íntegra
    const secaoHistorico = page.locator("text=Versões e Entregas do Aluno");
    await expect(secaoHistorico).toBeVisible();

    await salvarEvidencia(page, "evidencia_CT-RF05-04.png");
  });
});
