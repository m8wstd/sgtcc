import { type Page, expect } from "@playwright/test";

/**
 * Realiza login no SGTCC via formulário de autenticação.
 */
export async function realizarLogin(
  page: Page,
  email: string,
  senha = process.env.SEED_PASSWORD || "Sgtcc@2026!"
) {
  await page.goto("/login");
  await page.waitForSelector("#email");

  await page.fill("#email", email);
  await page.fill("#pass", senha);
  await page.click('button[type="submit"]');

  // Aguarda o redirecionamento para o dashboard
  await page.waitForURL(/\/dashboard/);
}

/**
 * Acessa a sala de uma etapa específica como Aluno.
 */
export async function navegarParaEtapaAluno(page: Page, slugEtapa: string, tccId?: string) {
  const url = tccId
    ? `/dashboard/aluno/etapa/${slugEtapa}?tcc=${encodeURIComponent(tccId)}`
    : `/dashboard/aluno/etapa/${slugEtapa}`;
  await page.goto(url);
  await page.waitForSelector("h1, h2");
}

/**
 * Acessa a sala de uma etapa específica como Professor Orientador.
 */
export async function navegarParaEtapaOrientador(page: Page, tccId: string, slugEtapa: string) {
  await page.goto(`/dashboard/tcc/${encodeURIComponent(tccId)}/etapa/${slugEtapa}`);
  await page.waitForSelector("h1, h2");
}

/**
 * Salva a captura de tela com o nome exato do artefato de evidência exigido pelo relatório.
 */
export async function salvarEvidencia(page: Page, nomeArquivo: string) {
  await page.screenshot({
    path: `evidencias/${nomeArquivo}`,
    fullPage: true,
  });
}
