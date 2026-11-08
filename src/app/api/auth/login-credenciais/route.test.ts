import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

vi.mock("@/lib/firebase/admin", () => ({
  adminDb: {
    collection: vi.fn(),
  },
  adminInitError: null,
}));

vi.mock("@/lib/auth/session", () => ({
  createSessionCookie: vi.fn().mockResolvedValue("mock-session-cookie"),
  SESSION_COOKIE_NAME: "sgtcc_session",
  SESSION_MAX_AGE_SECONDS: 28800,
}));

describe("POST /api/auth/login-credenciais (US01 AC1)", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "mock-api-key";
    delete process.env.FIREBASE_INSTITUTIONAL_EMAIL_DOMAIN;
    delete process.env.NEXT_PUBLIC_FIREBASE_INSTITUTIONAL_EMAIL_DOMAIN;
    delete process.env.FIREBASE_AUTH_PROVIDER_ID;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("retorna HTTP 401 com mensagem exata quando credenciais estão vazias", async () => {
    const request = new Request("http://localhost/api/auth/login-credenciais", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "", password: "" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.message).toBe("Credenciais inválidas ou usuário não encontrado.");
  });

  it("retorna HTTP 401 com mensagem exata quando credenciais são inválidas", async () => {
    // Simula resposta de erro da API do Firebase Identity Toolkit
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        error: { message: "EMAIL_NOT_FOUND" },
      }),
    } as Response);

    const request = new Request("http://localhost/api/auth/login-credenciais", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "usuario.inexistente@teste.com", password: "senha-incorreta" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.message).toBe("Credenciais inválidas ou usuário não encontrado.");
  });

  it("retorna HTTP 403 quando o e-mail não pertence ao domínio institucional configurado", async () => {
    process.env.FIREBASE_AUTH_PROVIDER_ID = "oidc.instituicao";
    process.env.FIREBASE_INSTITUTIONAL_EMAIL_DOMAIN = "instituicao.edu.br";

    const request = new Request("http://localhost/api/auth/login-credenciais", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "aluno@gmail.com", password: "senha123" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe("FORBIDDEN");
    expect(data.message).toContain("não pertence ao domínio institucional");
  });

  it("retorna HTTP 403 PROFILE_NOT_FOUND quando usuário existe no Auth mas não possui perfil em usuarios", async () => {
    const { adminDb } = await import("@/lib/firebase/admin");

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        idToken: "mock-id-token",
        localId: "uid-sem-perfil",
        email: "sem.perfil@teste.com",
      }),
    } as Response);

    // Mock do Firestore retornando doc.exists = false
    (adminDb!.collection as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      doc: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ exists: false }),
      }),
    });

    const request = new Request("http://localhost/api/auth/login-credenciais", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "sem.perfil@teste.com", password: "senha-correta" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe("PROFILE_NOT_FOUND");
    expect(data.message).toContain("seu perfil institucional não está cadastrado");
  });
});
