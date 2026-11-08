import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { PerfilEnum } from "@/types";

vi.mock("@/lib/firebase/admin", () => ({
  adminAuth: {
    createUser: vi.fn(),
    deleteUser: vi.fn(),
    setCustomUserClaims: vi.fn(),
  },
  adminDb: {
    collection: vi.fn(),
    batch: vi.fn(),
  },
}));

describe("POST /api/auth/cadastro (Segurança e Integridade)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejeita cadastro com erro 403 se o token/convite contiver perfil restrito ou inválido (ex: ADMIN)", async () => {
    const { adminDb } = await import("@/lib/firebase/admin");

    (adminDb!.collection as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      doc: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            nome: "Hacker Tentando Escalar",
            email: "hacker@teste.com",
            perfil: PerfilEnum.ADMIN,
            matricula: "202611111",
            usado: false,
            expiraEm: new Date(Date.now() + 86400000).toISOString(),
          }),
        }),
      }),
    });

    const req = new Request("http://localhost/api/auth/cadastro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "token-convite-admin", password: "SenhaValida@123" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("FORBIDDEN_ROLE");
  });

  it("rejeita cadastro com erro 409 se a matrícula já estiver em uso por outro aluno", async () => {
    const { adminDb } = await import("@/lib/firebase/admin");

    (adminDb!.collection as unknown as ReturnType<typeof vi.fn>).mockImplementation((col: string) => {
      if (col === "convites_cadastro") {
        return {
          doc: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({
              exists: true,
              data: () => ({
                nome: "Aluno Novo",
                email: "novo.aluno@teste.com",
                perfil: PerfilEnum.ALUNO,
                matricula: "202699999",
                usado: false,
                expiraEm: new Date(Date.now() + 86400000).toISOString(),
              }),
            }),
          }),
        };
      }
      if (col === "alunos") {
        return {
          doc: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({
              exists: true,
              data: () => ({ usuario_id: "outro_aluno_uid" }),
            }),
          }),
        };
      }
      if (col === "usuarios") {
        return {
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({ empty: true, docs: [] }),
            }),
          }),
        };
      }
      return { doc: vi.fn() };
    });

    const req = new Request("http://localhost/api/auth/cadastro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "token-aluno", password: "SenhaValida@123" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toBe("MATRICULA_ALREADY_IN_USE");
  });

  it("executa rollback (deleteUser) no Firebase Auth se a gravação atômica no banco falhar", async () => {
    const { adminAuth, adminDb } = await import("@/lib/firebase/admin");

    (adminDb!.collection as unknown as ReturnType<typeof vi.fn>).mockImplementation((col: string) => {
      if (col === "convites_cadastro") {
        return {
          doc: vi.fn().mockReturnValue({
            ref: { id: "token-valido" },
            get: vi.fn().mockResolvedValue({
              exists: true,
              data: () => ({
                nome: "Aluno Rollback",
                email: "rollback@teste.com",
                perfil: PerfilEnum.ALUNO,
                matricula: "202688888",
                usado: false,
                expiraEm: new Date(Date.now() + 86400000).toISOString(),
              }),
            }),
          }),
        };
      }
      if (col === "alunos") {
        return {
          doc: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({ exists: false }),
          }),
        };
      }
      return { doc: vi.fn() };
    });

    (adminAuth!.createUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      uid: "uid-criado-auth",
    });
    (adminAuth!.deleteUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    // Mock do batch falhando no commit (simulando falha de rede/banco)
    (adminDb!.batch as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      set: vi.fn(),
      update: vi.fn(),
      commit: vi.fn().mockRejectedValue(new Error("Erro simulado no Firestore")),
    });

    const req = new Request("http://localhost/api/auth/cadastro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "token-valido", password: "SenhaValida@123" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);

    // Confirma que a compensação (rollback) chamou deleteUser para liberar o e-mail
    expect(adminAuth!.deleteUser).toHaveBeenCalledWith("uid-criado-auth");
  });
});
