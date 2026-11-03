import { beforeEach, describe, expect, it, vi } from "vitest";
import { PerfilEnum } from "@/types";

const mocks = vi.hoisted(() => ({
  requireSessao: vi.fn(),
  getAdminDashboardData: vi.fn(),
}));

vi.mock("@/lib/auth/server-session", () => ({ requireSessao: mocks.requireSessao }));
vi.mock("@/lib/data/admin-queries", () => ({ getAdminDashboardData: mocks.getAdminDashboardData }));
vi.mock("./admin-dashboard-client", () => ({ AdminDashboardClient: () => null }));

import { AdminDashboardContent } from "./admin-dashboard-content";

describe("página /dashboard/admin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireSessao.mockResolvedValue({
      perfil: PerfilEnum.ADMIN,
      nome: "Administradora",
      usuario: { id: "admin-uid" },
    });
    mocks.getAdminDashboardData.mockResolvedValue({});
  });

  it("exige ADMIN na validação server-side antes de carregar os dados", async () => {
    await AdminDashboardContent();
    expect(mocks.requireSessao).toHaveBeenCalledExactlyOnceWith(PerfilEnum.ADMIN);
    expect(mocks.getAdminDashboardData).toHaveBeenCalledOnce();
  });

  it("não consulta dados se a proteção de sessão rejeitar o perfil", async () => {
    mocks.requireSessao.mockRejectedValue(new Error("redirect"));
    await expect(AdminDashboardContent()).rejects.toThrow("redirect");
    expect(mocks.getAdminDashboardData).not.toHaveBeenCalled();
  });
});
