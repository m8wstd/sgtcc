import { Suspense } from "react";
import { requireSessao } from "@/lib/auth/server-session";
import { listarTccsVisiveis } from "@/lib/data/queries";
import { PerfilEnum } from "@/types";
import { AvaliadorDashboardClient } from "./avaliador-dashboard-client";

export const metadata = { title: "Painel da Banca Avaliadora — SGTCC" };
export const dynamic = "force-dynamic";

async function ConteudoAvaliador() {
  const sessao = await requireSessao(PerfilEnum.AVALIADOR);
  const tccs = await listarTccsVisiveis(sessao);

  return (
    <AvaliadorDashboardClient
      nomeAvaliador={sessao.nome ?? "Avaliador(a)"}
      tccs={tccs}
    />
  );
}

export default function AvaliadorDashboardPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-[#f4f5f7]" />}>
      <ConteudoAvaliador />
    </Suspense>
  );
}
