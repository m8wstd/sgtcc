import { Suspense } from "react";
import { requireSessao } from "@/lib/auth/server-session";
import { listarTccsVisiveis } from "@/lib/data/queries";
import { PerfilEnum } from "@/types";
import { OrientadorDashboardClient } from "@/app/dashboard/orientador/orientador-dashboard-client";

export const metadata = { title: "Painel do Professor — SGTCC" };
export const dynamic = "force-dynamic";

async function ConteudoProfessor() {
  const sessao = await requireSessao(
    PerfilEnum.ORIENTADOR,
    PerfilEnum.AVALIADOR,
    PerfilEnum.COORDENACAO,
    PerfilEnum.ADMIN,
  );

  const tccsOrientados = await listarTccsVisiveis(sessao);

  return (
    <OrientadorDashboardClient
      nomeOrientador={sessao.nome ?? "Professor(a)"}
      tccs={tccsOrientados}
    />
  );
}

export default function ProfessorDashboardPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-[#f4f5f7]" />}>
      <ConteudoProfessor />
    </Suspense>
  );
}
