import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireSessao } from "@/lib/auth/server-session";
import { getEtapaDoTcc } from "@/lib/data/queries";
import { SalaEtapaView } from "@/components/etapa/sala-etapa-view";
import { type SalaEtapaTcc, mapStatusParaColuna } from "@/app/dashboard/aluno/dados-etapas";
import { formatarData } from "@/components/layout/status";

export const metadata = { title: "Etapa do TCC — SGTCC" };
export const dynamic = "force-dynamic";

interface EtapaTccPageProps {
  params: Promise<{ id: string; slug: string }>;
}

async function ConteudoEtapaTcc({ params }: EtapaTccPageProps) {
  const { id, slug } = await params;
  const sessao = await requireSessao();

  const dados = await getEtapaDoTcc(sessao, id, slug);
  if (!dados) notFound();

  const { painel, item } = dados;
  const isOrientador = sessao.perfil === "ORIENTADOR" || sessao.perfil === "COORDENACAO" || sessao.perfil === "ADMIN";

  const etapaObj: SalaEtapaTcc = {
    slug,
    titulo: item.marco.titulo,
    progresso: item.statusEfetivo === "CONCLUIDA" ? 100 : item.statusEfetivo === "AGUARDANDO_ENVIO" ? 0 : 50,
    dataEntrega: formatarData(item.marco.dataLimite),
    statusKanban: mapStatusParaColuna(item.statusEfetivo),
    comentarioOrientadora: item.feedbacks[0]?.comentario ?? "",
    descricaoInstrucoes: item.marco.descricao ?? "",
    postagensProfessor: (item.marco.postagens ?? []).map((p) => ({
      id: p.id,
      autorNome: p.autorNome,
      autorPapel: p.autorPapel === "ORIENTADOR" ? "Professor(a) Orientador(a)" : "Coordenação de TCC",
      dataHora: typeof p.dataHora === "string" ? p.dataHora : new Date(p.dataHora).toLocaleDateString("pt-BR"),
      titulo: p.titulo,
      conteudo: p.conteudo,
      anexos: p.anexos ?? [],
    })),
    materiaisFixados: item.marco.materiaisApoio ?? [],
    historicoEnvios: item.versoes.map((v) => ({
      versao: v.numeroVersao,
      arquivoNome: v.arquivoUrl.split("/").pop() ?? `Versao_${v.numeroVersao}.pdf`,
      data: formatarData(v.dataUpload),
      status: item.statusEfetivo,
    })),
  };

  return (
    <SalaEtapaView
      etapa={etapaObj}
      nomeUsuario={sessao.nome ?? "Usuário"}
      papelUsuario={isOrientador ? "orientador" : "aluno"}
      voltarHref={`/dashboard/tcc/${id}`}
      voltarLabel="Voltar ao TCC"
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
