import { Suspense } from "react";
import { requireSessao } from "@/lib/auth/server-session";
import { listarTccsVisiveis } from "@/lib/data/queries";
import { PerfilEnum } from "@/types";
import { CoordenacaoDashboardClient } from "@/app/dashboard/coordenacao/coordenacao-dashboard-client";

export const metadata = { title: "Gestão de Coordenação (Admin) — SGTCC" };
export const dynamic = "force-dynamic";

async function ConteudoAdminCoordenacao() {
  const sessao = await requireSessao(PerfilEnum.ADMIN);
  // O Administrador tem visão global irrestrita de todas as áreas e cursos
  const tccs = await listarTccsVisiveis(sessao);

  return (
    <div className="space-y-4">
      <div className="bg-blue-50/60 border border-blue-100 rounded-xl px-4 py-2 text-xs text-[#1e78f0] flex items-center justify-between">
        <span className="font-semibold">
          Ambiente do Superusuário &bull; Acesso Global a Todas as Áreas e Cursos Institucionais
        </span>
        <span className="text-[11px] bg-blue-100 px-2 py-0.5 rounded font-bold uppercase">
          Visão de Coordenação Geral
        </span>
      </div>

      <CoordenacaoDashboardClient
        nomeUsuario={sessao.nome ?? "Administrador"}
        perfil="ADMIN"
        tccs={tccs}
      />
    </div>
  );
}

export default function AdminCoordenacaoPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-[#f4f5f7]" />}>
      <ConteudoAdminCoordenacao />
    </Suspense>
  );
}
