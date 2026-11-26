import { defineConfig, devices } from "@playwright/test";

/**
 * Configuração Playwright para o SGTCC.
 * Alinhada com a Tabela 1 e Seção 1.2 do documento de Qualidade de Software.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ["html", { open: "never" }],
    ["list"],
  ],
  use: {
    baseURL: process.env.SGTCC_URL || "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "on",
    video: "off",
    viewport: { width: 1366, height: 768 },
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
