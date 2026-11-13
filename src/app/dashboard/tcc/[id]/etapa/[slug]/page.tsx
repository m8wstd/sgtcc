import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireSessao } from "@/lib/auth/server-session";
import { getPainelTcc } from "@/lib/data/queries";
import { montarSalaReal } from "@/lib/entregas/sala-real";
import { SalaEtapaView } from "@/components/etapa/sala-etapa-view";
import { PerfilEnum } from "@/types";

export const metadata = { title: "Etapa do TCC — Orientação — SGTCC" };
export const dynamic = "force-dynamic";

interface Props { params: Promise<{ id: string; slug: string }> }

async function ConteudoEtapaTcc({ params }: Props) {
  const { id, slug } = await params;
  const sessao = await requireSessao();
  const painel = await getPainelTcc(sessao, id);
  const item = painel?.itens.find((i) => i.marco.id === slug);
  if (!painel || !item) notFound();
  const isOrientador = sessao.perfil === PerfilEnum.ORIENTADOR || sessao.perfil === PerfilEnum.COORDENACAO || sessao.perfil === PerfilEnum.ADMIN;
  return (
    <SalaEtapaView
      etapa={montarSalaReal(item)}
      tccId={id}
      marcoId={item.marco.id}
      podeEnviar={item.statusEfetivo !== "CONCLUIDA" && (!item.marco.bloqueioEstrito || new Date(String(item.marco.dataLimite)).getTime() >= Date.now())}
      nomeUsuario={sessao.nome ?? "Usuário"}
      papelUsuario={isOrientador ? "orientador" : "aluno"}
      voltarHref={`/dashboard/tcc/${encodeURIComponent(id)}`}
      voltarLabel="Voltar ao TCC do Aluno"
      tccTitulo={painel.tcc.titulo}
      alunoNome={painel.tcc.alunoNome}
    />
  );
}

export default function EtapaTccPage({ params }: Props) {
  return <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-[#f4f5f7]" />}><ConteudoEtapaTcc params={params} /></Suspense>;
}
