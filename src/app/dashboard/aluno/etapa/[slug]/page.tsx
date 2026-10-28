import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireSessao } from "@/lib/auth/server-session";
import { PerfilEnum } from "@/types";
import { SALAS_ETAPAS_MOCK } from "../../dados-etapas";
import { SalaEtapaPageClient } from "./etapa-detalhe-page-client";

export const metadata = { title: "Sala da Etapa — SGTCC" };
export const dynamic = "force-dynamic";

interface EtapaPageProps {
  params: Promise<{ slug: string }>;
}

async function ConteudoEtapa({ params }: EtapaPageProps) {
  const { slug } = await params;
  const sessao = await requireSessao(PerfilEnum.ALUNO);

  const etapa = SALAS_ETAPAS_MOCK.find((e) => e.slug === slug);
  if (!etapa) notFound();

  return (
    <SalaEtapaPageClient
      etapa={etapa}
      nomeAluno={sessao.nome ?? "Aluno"}
    />
  );
}

export default function EtapaPage({ params }: EtapaPageProps) {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-[#f4f5f7]" />}>
      <ConteudoEtapa params={params} />
    </Suspense>
  );
}
