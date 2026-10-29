import { Suspense } from "react";
import { requireSessao } from "@/lib/auth/server-session";
import { listarTccsVisiveis, getPainelTcc } from "@/lib/data/queries";
import { PerfilEnum } from "@/types";
import { AlunoDashboardClient } from "./aluno-dashboard-client";

export const metadata = { title: "Painel do Aluno — SGTCC" };
export const dynamic = "force-dynamic";

interface AlunoPageProps {
  searchParams?: Promise<{ tcc?: string }>;
}

async function ConteudoAluno({ searchParams }: AlunoPageProps) {
  const sessao = await requireSessao(PerfilEnum.ALUNO);
  const tccs = await listarTccsVisiveis(sessao);
  const params = await searchParams;
  const tccIdSelecionado = params?.tcc && tccs.some((t) => t.id === params.tcc)
    ? params.tcc
    : (tccs[0]?.id ?? null);

  const detalhesPrincipal = tccIdSelecionado ? await getPainelTcc(sessao, tccIdSelecionado) : null;

  return (
    <AlunoDashboardClient
      nomeAluno={sessao.nome ?? "Aluno(a)"}
      tccs={tccs}
      detalhesPrincipal={detalhesPrincipal}
      tccIdAtivo={tccIdSelecionado}
    />
  );
}

export default function AlunoDashboardPage(props: AlunoPageProps) {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-[#f4f5f7]" />}>
      <ConteudoAluno searchParams={props.searchParams} />
    </Suspense>
  );
}
