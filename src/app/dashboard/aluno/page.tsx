import { Suspense } from "react";
import { requireSessao } from "@/lib/auth/server-session";
import { listarTccsVisiveis, getPainelTcc } from "@/lib/data/queries";
import { PerfilEnum } from "@/types";
import { AlunoDashboardClient } from "./aluno-dashboard-client";

export const metadata = { title: "Painel do Aluno — SGTCC" };
export const dynamic = "force-dynamic";

async function ConteudoAluno() {
  const sessao = await requireSessao(PerfilEnum.ALUNO);
  const tccs = await listarTccsVisiveis(sessao);
  const detalhesPrincipal = tccs[0] ? await getPainelTcc(sessao, tccs[0].id) : null;

  return (
    <AlunoDashboardClient
      nomeAluno={sessao.nome ?? "Aluno(a)"}
      tccs={tccs}
      detalhesPrincipal={detalhesPrincipal}
    />
  );
}

export default function AlunoDashboardPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-[#f4f5f7]" />}>
      <ConteudoAluno />
    </Suspense>
  );
}
