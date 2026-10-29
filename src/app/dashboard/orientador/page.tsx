import { Suspense } from "react";
import { requireSessao } from "@/lib/auth/server-session";
import { listarTccsVisiveis } from "@/lib/data/queries";
import { PerfilEnum } from "@/types";
import { OrientadorDashboardClient } from "./orientador-dashboard-client";

export const metadata = { title: "Dashboard do Orientador — SGTCC" };
export const dynamic = "force-dynamic";

async function ConteudoOrientador() {
  const sessao = await requireSessao(PerfilEnum.ORIENTADOR);
  const tccs = await listarTccsVisiveis(sessao);

  return (
    <OrientadorDashboardClient
      nomeOrientador={sessao.nome ?? "Orientador(a)"}
      tccs={tccs}
    />
  );
}

export default function OrientadorDashboardPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-[#f4f5f7]" />}>
      <ConteudoOrientador />
    </Suspense>
  );
}
