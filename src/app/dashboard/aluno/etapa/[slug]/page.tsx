import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireSessao } from "@/lib/auth/server-session";
import { PerfilEnum } from "@/types";
import { listarTccsVisiveis, getEtapaDoTcc } from "@/lib/data/queries";
import { SalaEtapaView } from "@/components/etapa/sala-etapa-view";
import { type SalaEtapaTcc, mapStatusParaColuna } from "@/app/dashboard/aluno/dados-etapas";
import { formatarData } from "@/components/layout/status";

export const metadata = { title: "Sala da Etapa — SGTCC" };
export const dynamic = "force-dynamic";

interface EtapaPageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ tcc?: string }>;
}

async function ConteudoEtapa({ params, searchParams }: EtapaPageProps) {
  const { slug } = await params;
  const sParams = await searchParams;
  const sessao = await requireSessao(PerfilEnum.ALUNO);

  const tccs = await listarTccsVisiveis(sessao);
  const tccId = sParams?.tcc && tccs.some((t) => t.id === sParams.tcc)
    ? sParams.tcc
    : (tccs[0]?.id ?? null);

  if (!tccId) notFound();

  const dados = await getEtapaDoTcc(sessao, tccId, slug);
  if (!dados) notFound();

  const { painel, item } = dados;

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
      autorPapel: "Professor(a) Orientador(a)",
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
      nomeUsuario={sessao.nome ?? "Aluno"}
      papelUsuario="aluno"
      voltarHref={tccId ? `/dashboard/aluno?tcc=${tccId}` : "/dashboard/aluno"}
      voltarLabel="Voltar ao Painel do Aluno"
      tccTitulo={painel.tcc.titulo}
      alunoNome={painel.tcc.alunoNome}
    />
  );
}

export default function EtapaPage(props: EtapaPageProps) {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-[#f4f5f7]" />}>
      <ConteudoEtapa params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}
