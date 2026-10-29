import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireSessao } from "@/lib/auth/server-session";
import { getPainelTcc } from "@/lib/data/queries";
import { SALAS_ETAPAS_MOCK } from "@/app/dashboard/aluno/dados-etapas";
import { SalaEtapaView } from "@/components/etapa/sala-etapa-view";

export const metadata = { title: "Etapa do TCC — Orientação — SGTCC" };
export const dynamic = "force-dynamic";

interface EtapaTccPageProps {
  params: Promise<{ id: string; slug: string }>;
}

async function ConteudoEtapaTcc({ params }: EtapaTccPageProps) {
  const { id, slug } = await params;
  const sessao = await requireSessao();

  const painel = await getPainelTcc(sessao, id);
  if (!painel) notFound();

  const etapa = SALAS_ETAPAS_MOCK.find((e) => e.slug === slug);
  if (!etapa) notFound();

  const isOrientador = sessao.perfil === "ORIENTADOR" || sessao.perfil === "COORDENACAO" || sessao.perfil === "ADMIN";

  return (
    <SalaEtapaView
      etapa={etapa}
      nomeUsuario={sessao.nome ?? "Professor(a) Orientador(a)"}
      papelUsuario={isOrientador ? "orientador" : "aluno"}
      voltarHref={`/dashboard/tcc/${id}`}
      voltarLabel="Voltar ao TCC do Aluno"
      tccTitulo={painel.tcc.titulo}
      alunoNome={painel.tcc.alunoNome}
    />
  );
}

export default function EtapaTccPage({ params }: EtapaTccPageProps) {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-[#f4f5f7]" />}>
      <ConteudoEtapaTcc params={params} />
    </Suspense>
  );
}
