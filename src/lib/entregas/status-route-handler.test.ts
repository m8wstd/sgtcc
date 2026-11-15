import { describe, expect, it, vi } from "vitest";
import { UnauthorizedError } from "@/lib/auth/errors";
import { EntregaError } from "./errors";
import { createStatusGetHandler, createStatusPatchHandler } from "./status-route-handler";
import { sessaoTeste } from "./test-fixtures";

vi.mock("@/lib/firebase/admin", () => ({ adminDb: null, adminAuth: null }));
vi.mock("./firestore-repository", () => ({ criarRepositorioEntregas: vi.fn() }));

const token = "a".repeat(64);
const comando = { acao: "INICIAR_REVISAO", revisaoEsperada: "100:123456789" };
const contexto = { params: Promise.resolve({ entregaId: "entrega-teste" }) };

function requisicao(body: unknown = comando, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/entregas/entrega-teste/status", {
    method: "PATCH",
    headers: { "content-type": "application/json", origin: "http://localhost", "x-csrf-token": token, cookie: `sgtcc_csrf=${token}`, ...headers },
    body: JSON.stringify(body),
  });
}

function preparar() {
  const alterarStatus = vi.fn(async () => ({ entrega: { id: "entrega-teste", status: "EM_REVISAO" as const } }));
  const getSession = vi.fn(async () => sessaoTeste());
  return { alterarStatus, getSession, handler: createStatusPatchHandler({ alterarStatus, getSession }) };
}

describe("PATCH /api/entregas/[entregaId]/status", () => {
  it("retorna o resultado confirmado e impede cache", async () => {
    const { handler, alterarStatus } = preparar();
    const response = await handler(requisicao(), contexto);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ entrega: { id: "entrega-teste", status: "EM_REVISAO" } });
    expect(alterarStatus).toHaveBeenCalledWith("entrega-teste", sessaoTeste(), comando);
  });
  it("retorna 401 para sessão ausente ou revogada", async () => {
    const { handler, alterarStatus, getSession } = preparar();
    getSession.mockRejectedValue(new UnauthorizedError("Sessão inválida ou expirada."));
    expect((await handler(requisicao(), contexto)).status).toBe(401);
    expect(alterarStatus).not.toHaveBeenCalled();
  });
  it.each<Record<string, string>>([{ origin: "https://outra-origem.test" }, { "x-csrf-token": "" }, { cookie: "" }, { "x-csrf-token": "b".repeat(64) }])
  ("nega origem/CSRF inválido", async (headers) => {
    const { handler, alterarStatus } = preparar();
    expect((await handler(requisicao(comando, headers), contexto)).status).toBe(403);
    expect(alterarStatus).not.toHaveBeenCalled();
  });
  it.each([null, [], {}, { ...comando, acao: "SINALIZAR_REVISAO" }, { ...comando, status: "CONCLUIDA" },
    { ...comando, comentario: "não permitido" }, { ...comando, revisaoEsperada: "2026-01-01" },
    { ...comando, acao: "SOLICITAR_CORRECAO", comentario: "  " }])("rejeita corpo inválido", async (body) => {
    const { handler, alterarStatus } = preparar();
    expect((await handler(requisicao(body), contexto)).status).toBe(400);
    expect(alterarStatus).not.toHaveBeenCalled();
  });
  it("rejeita JSON malformado", async () => {
    const { handler, alterarStatus } = preparar();
    const request = requisicao();
    const invalid = new Request(request.url, { method: "PATCH", headers: request.headers, body: "{" });
    expect((await handler(invalid, contexto)).status).toBe(400);
    expect(alterarStatus).not.toHaveBeenCalled();
  });
  it.each(["", "..", "outra/entrega"])("nega identificador inválido: %s", async (entregaId) => {
    const { handler, alterarStatus } = preparar();
    expect((await handler(requisicao(), { params: Promise.resolve({ entregaId }) })).status).toBe(400);
    expect(alterarStatus).not.toHaveBeenCalled();
  });
  it.each([403, 404, 409, 503] as const)("preserva erro do domínio %s", async (status) => {
    const { handler, alterarStatus } = preparar();
    alterarStatus.mockRejectedValue(new EntregaError(status, "TEST_ERROR", "Falha de teste."));
    const response = await handler(requisicao(), contexto);
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error: "TEST_ERROR", message: "Falha de teste." });
  });
});

describe("GET /api/entregas/[entregaId]/status", () => {
  it("retorna id, status e revisao da entrega", async () => {
    const obterRevisao = vi.fn(async () => ({ id: "entrega-teste", status: "PRONTA_PARA_REVISAO", revisao: "100:200" }));
    const getSession = vi.fn(async () => sessaoTeste());
    const handler = createStatusGetHandler({ getSession, alterarStatus: vi.fn(), obterRevisao });
    const response = await handler(new Request("http://localhost/api/entregas/entrega-teste/status"), contexto);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: "entrega-teste", status: "PRONTA_PARA_REVISAO", revisao: "100:200" });
  });
});
