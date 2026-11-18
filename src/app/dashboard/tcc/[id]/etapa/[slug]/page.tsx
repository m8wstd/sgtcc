import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireSessao } from "@/lib/auth/server-session";
import { getPainelTcc } from "@/lib/data/queries";
import { montarSalaReal } from "@/lib/entregas/sala-real";
import { SalaEtapaView } from "@/components/etapa/sala-etapa-view";
import { PerfilEnum } from "@/types";
import { adminDb } from "@/lib/firebase/admin";

export const metadata = { title: "Etapa do TCC — SGTCC" };
export const dynamic = "force-dynamic";

interface Props { params: Promise<{ id: string; slug: string }> }

async function ConteudoEtapaTcc({ params }: Props) {
  const { id, slug } = await params;
  const sessao = await requireSessao();
  const painel = await getPainelTcc(sessao, id);
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

  // Busca dados dinâmicos salvos da sala (postagens, materiais, customizações)
  let dadosSala = null;
  if (adminDb) {
    const salaDoc = await adminDb.collection("etapas_sala").doc(`${id}__${item.marco.id}`).get();
    if (salaDoc.exists) {
      dadosSala = salaDoc.data();
    }
  }

  const isOrientador = sessao.perfil === PerfilEnum.ORIENTADOR || sessao.perfil === PerfilEnum.COORDENACAO || sessao.perfil === PerfilEnum.ADMIN;
  return (
    <SalaEtapaView
      etapa={montarSalaReal(item, dadosSala)}
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
