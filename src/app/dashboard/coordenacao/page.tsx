import { Suspense } from "react";
import { requireSessao } from "@/lib/auth/server-session";
import { listarTccsVisiveis } from "@/lib/data/queries";
import { PerfilEnum } from "@/types";
import { CoordenacaoDashboardClient } from "./coordenacao-dashboard-client";

export const metadata = { title: "Painel da Coordenação — SGTCC" };
export const dynamic = "force-dynamic";

async function ConteudoCoordenacao() {
  const sessao = await requireSessao(PerfilEnum.COORDENACAO, PerfilEnum.ADMIN);
  const tccs = await listarTccsVisiveis(sessao);

  return (
    <CoordenacaoDashboardClient
      nomeUsuario={sessao.nome ?? "Usuário"}
      perfil={sessao.perfil as "COORDENACAO" | "ADMIN"}
      tccs={tccs}
    />
  );
}

export default function CoordenacaoDashboardPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-[#f4f5f7]" />}>
      <ConteudoCoordenacao />
    </Suspense>
  );
}
