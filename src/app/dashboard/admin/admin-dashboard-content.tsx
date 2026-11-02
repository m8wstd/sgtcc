import { requireSessao } from "@/lib/auth/server-session";
import { getAdminDashboardData } from "@/lib/data/admin-queries";
import { PerfilEnum } from "@/types";
import { AdminDashboardClient } from "./admin-dashboard-client";

export async function AdminDashboardContent() {
  const sessao = await requireSessao(PerfilEnum.ADMIN);
  let dados: Awaited<ReturnType<typeof getAdminDashboardData>> | null = null;
  let erro: string | undefined;
  try {
    dados = await getAdminDashboardData(sessao);
  } catch (error) {
    console.error("Falha ao carregar o dashboard administrativo:", error);
    erro = "Não foi possível carregar os dados administrativos. Tente novamente em instantes.";
  }
  return <AdminDashboardClient nome={sessao.nome ?? "Administrador"} dados={dados} erro={erro} />;
}
