import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { requireSessao } from "@/lib/auth/server-session";
import { homeDoPerfil } from "@/lib/auth/perfis";
import { getPainelTcc } from "@/lib/data/queries";
import { PerfilEnum } from "@/types";
import { TccDetalheClient } from "./tcc-detalhe-client";

export const metadata = { title: "Detalhes do TCC — SGTCC" };
export const dynamic = "force-dynamic";

async function Painel({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessao = await requireSessao();

  // Avaliador trabalha na sala da banca (leitor do PDF + formulário de avaliação).
  if (sessao.perfil === PerfilEnum.AVALIADOR) {
    redirect(`/dashboard/tcc/${id}/banca`);
  }

  const painel = await getPainelTcc(sessao, id);

  // US01 AC3: Bloqueio de acesso indevido (Erro 403)
  if (!painel) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-4 max-w-md mx-auto">
        <Badge variant="destructive" className="px-3 py-1 text-xs">
          Erro 403 • Acesso Negado
        </Badge>
        <h1 className="text-2xl font-bold tracking-tight text-[#111a2e]">Acesso Não Autorizado</h1>
        <p className="text-sm text-[#6b7385]">
          Você não possui vínculo acadêmico com este Trabalho de Conclusão de Curso. O acesso ao documento e histórico é restrito aos envolvidos (Aluno, Orientador e Banca associada).
        </p>
        <Link
          href={homeDoPerfil(sessao.perfil)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#1e78f0] px-4 py-2 text-sm font-medium text-white hover:bg-[#1666d3]"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar ao Início
        </Link>
      </div>
    );
  }

  const isOrientadorOuGestor =
    sessao.perfil === PerfilEnum.ORIENTADOR ||
    sessao.perfil === PerfilEnum.COORDENACAO ||
    sessao.perfil === PerfilEnum.ADMIN;

  return (
    <TccDetalheClient
      painel={painel}
      voltarHref={homeDoPerfil(sessao.perfil)}
      isAluno={sessao.perfil === PerfilEnum.ALUNO}
      isOrientador={isOrientadorOuGestor}
    />
  );
}

export default function TccPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-[#f4f5f7]" />}>
      <Painel params={params} />
    </Suspense>
  );
}
