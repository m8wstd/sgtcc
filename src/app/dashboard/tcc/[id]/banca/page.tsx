import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireSessao } from "@/lib/auth/server-session";
import { getPainelTcc } from "@/lib/data/queries";
import { SalaBancaView } from "@/components/etapa/sala-banca-view";

export const metadata = { title: "Banca Avaliadora do TCC — SGTCC" };
export const dynamic = "force-dynamic";

interface BancaTccPageProps {
  params: Promise<{ id: string }>;
}

async function ConteudoBancaTcc({ params }: BancaTccPageProps) {
  const { id } = await params;
  const sessao = await requireSessao();

  const painel = await getPainelTcc(sessao, id);
  if (!painel) notFound();

  let papelUsuario: "aluno" | "avaliador" | "orientador" = "aluno";
  if (sessao.perfil === "AVALIADOR") papelUsuario = "avaliador";
  else if (sessao.perfil === "ORIENTADOR" || sessao.perfil === "COORDENACAO") papelUsuario = "orientador";

  return (
    <SalaBancaView
      tcc={painel.tcc}
      nomeUsuario={sessao.nome ?? "Usuário"}
      papelUsuario={papelUsuario}
      voltarHref={sessao.perfil === "AVALIADOR" ? "/dashboard/avaliador" : `/dashboard/tcc/${id}`}
    />
  );
}

export default function BancaTccPage({ params }: BancaTccPageProps) {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-[#f4f5f7]" />}>
      <ConteudoBancaTcc params={params} />
    </Suspense>
  );
}
