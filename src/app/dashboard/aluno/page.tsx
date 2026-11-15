import { Suspense } from "react";
import { requireSessao } from "@/lib/auth/server-session";
import { listarTccsVisiveis, getPainelTcc, resolverTccAtivoPadrao } from "@/lib/data/queries";
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
  const tccPadrao = resolverTccAtivoPadrao(tccs);
  const tccIdSelecionado = params?.tcc && tccs.some((t) => t.id === params.tcc)
    ? params.tcc
    : (tccPadrao?.id ?? null);

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

export default async function AlunoDashboardPage(props: AlunoPageProps) {
  const params = await props.searchParams;
  const key = params?.tcc ?? "default";

  return (
    <Suspense key={key} fallback={<div className="h-64 animate-pulse rounded-xl bg-[#f4f5f7]" />}>
      <ConteudoAluno searchParams={props.searchParams} />
    </Suspense>
  );
}
