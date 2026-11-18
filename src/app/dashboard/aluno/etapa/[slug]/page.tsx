import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireSessao } from "@/lib/auth/server-session";
import { getPainelTcc, listarTccsVisiveis, serializar } from "@/lib/data/queries";
import { montarSalaReal } from "@/lib/entregas/sala-real";
import { PerfilEnum } from "@/types";
import { SalaEtapaView } from "@/components/etapa/sala-etapa-view";
import { type SalaEtapaTcc, mapStatusParaColuna } from "@/app/dashboard/aluno/dados-etapas";
import { formatarData } from "@/components/layout/status";
import { adminDb } from "@/lib/firebase/admin";

export const metadata = { title: "Sala da Etapa — SGTCC" };
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ tcc?: string }>;
}

async function ConteudoEtapa({ params, searchParams }: Props) {
  const { slug } = await params;
  const sParams = await searchParams;
  const sessao = await requireSessao(PerfilEnum.ALUNO);
  const tccs = await listarTccsVisiveis(sessao);
  const tccEscolhido = (await searchParams)?.tcc;
  const tccId = tccs.some((t) => t.id === tccEscolhido) ? tccEscolhido! : tccs[0]?.id;
  if (!tccId) notFound();
  const painel = await getPainelTcc(sessao, tccId);
  if (!painel) notFound();
  const item = painel.itens.find((i) => {
    if (i.marco.id === slug) return true;
    const slugNormalizado = i.marco.titulo
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
    return slugNormalizado === slug;
  });
  if (!item) notFound();

  // Busca dados dinâmicos salvos da sala (postagens do orientador, materiais, etc.)
  let dadosSala = null;
  if (adminDb) {
    const salaDoc = await adminDb.collection("etapas_sala").doc(`${tccId}__${item.marco.id}`).get();
    if (salaDoc.exists) {
      dadosSala = serializar<Record<string, unknown>>(salaDoc.data());
    }
  }

  return (
    <SalaEtapaView
      etapa={montarSalaReal(item, dadosSala)}
      tccId={tccId}
      marcoId={item.marco.id}
      podeEnviar={item.statusEfetivo !== "CONCLUIDA" && (!item.marco.bloqueioEstrito || new Date(String(item.marco.dataLimite)).getTime() >= Date.now())}
      nomeUsuario={sessao.nome ?? "Aluno"}
      papelUsuario="aluno"
      voltarHref={`/dashboard/aluno?tcc=${encodeURIComponent(tccId)}`}
      voltarLabel="Voltar ao Painel do Aluno"
      tccTitulo={painel.tcc.titulo}
      alunoNome={painel.tcc.alunoNome}
    />
  );
}

export default function EtapaPage(props: Props) {
  return <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-[#f4f5f7]" />}><ConteudoEtapa {...props} /></Suspense>;
}
