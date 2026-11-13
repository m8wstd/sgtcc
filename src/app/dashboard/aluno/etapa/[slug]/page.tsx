import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireSessao } from "@/lib/auth/server-session";
import { getPainelTcc, listarTccsVisiveis } from "@/lib/data/queries";
import { montarSalaReal } from "@/lib/entregas/sala-real";
import { PerfilEnum } from "@/types";
import { SalaEtapaView } from "@/components/etapa/sala-etapa-view";

export const metadata = { title: "Sala da Etapa — SGTCC" };
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ tcc?: string }>;
}

async function ConteudoEtapa({ params, searchParams }: Props) {
  const { slug } = await params;
  const sessao = await requireSessao(PerfilEnum.ALUNO);
  const tccs = await listarTccsVisiveis(sessao);
  const tccEscolhido = (await searchParams)?.tcc;
  const tccId = tccs.some((t) => t.id === tccEscolhido) ? tccEscolhido! : tccs[0]?.id;
  if (!tccId) notFound();
  const painel = await getPainelTcc(sessao, tccId);
  const item = painel?.itens.find((i) => i.marco.id === slug);
  if (!item) notFound();
  return (
    <SalaEtapaView
      etapa={montarSalaReal(item)}
      tccId={tccId}
      marcoId={item.marco.id}
      podeEnviar={item.statusEfetivo !== "CONCLUIDA" && (!item.marco.bloqueioEstrito || new Date(String(item.marco.dataLimite)).getTime() >= Date.now())}
      nomeUsuario={sessao.nome ?? "Aluno"}
      papelUsuario="aluno"
      voltarHref={`/dashboard/aluno?tcc=${encodeURIComponent(tccId)}`}
      voltarLabel="Voltar ao Painel do Aluno"
    />
  );
}

export default function EtapaPage(props: Props) {
  return <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-[#f4f5f7]" />}><ConteudoEtapa {...props} /></Suspense>;
}
