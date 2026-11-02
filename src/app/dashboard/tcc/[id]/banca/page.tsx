import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireSessao } from "@/lib/auth/server-session";
import { getSalaBanca } from "@/lib/data/queries";
import { SalaBancaView, type PapelBanca } from "@/components/etapa/sala-banca-view";
import { PerfilEnum } from "@/types";

export const metadata = { title: "Banca Avaliadora do TCC — SGTCC" };
export const dynamic = "force-dynamic";

interface BancaTccPageProps {
  params: Promise<{ id: string }>;
}

function papelDe(perfil: PerfilEnum): PapelBanca {
  switch (perfil) {
    case PerfilEnum.AVALIADOR:
      return "avaliador";
    case PerfilEnum.ORIENTADOR:
      return "orientador";
    case PerfilEnum.COORDENACAO:
    case PerfilEnum.ADMIN:
      return "gestao";
    default:
      return "aluno";
  }
}

async function ConteudoBancaTcc({ params }: BancaTccPageProps) {
  const { id } = await params;
  const sessao = await requireSessao();

  // Mesma regra de acesso do detalhe do TCC: sem vínculo → não existe para o usuário.
  const sala = await getSalaBanca(sessao, id);
  if (!sala) notFound();

  return (
    <SalaBancaView
      sala={sala}
      papelUsuario={papelDe(sessao.perfil)}
      voltarHref={sessao.perfil === PerfilEnum.AVALIADOR ? "/dashboard/avaliador" : `/dashboard/tcc/${id}`}
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
