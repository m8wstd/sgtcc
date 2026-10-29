import { Suspense } from "react";
import { requireSessao } from "@/lib/auth/server-session";
import { PerfilEnum } from "@/types";
import { AdminDashboardClient } from "./admin-dashboard-client";

export const metadata = { title: "Painel do Administrador — SGTCC" };
export const dynamic = "force-dynamic";

async function ConteudoAdmin() {
  const sessao = await requireSessao(PerfilEnum.ADMIN);

  return (
    <AdminDashboardClient
      nomeUsuario={sessao.nome ?? "Administrador"}
    />
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-[#f4f5f7]" />}>
      <ConteudoAdmin />
    </Suspense>
  );
}
