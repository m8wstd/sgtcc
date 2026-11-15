import { Suspense } from "react";
import { requireSessao } from "@/lib/auth/server-session";
import { getPainelTcc, listarTccsVisiveis } from "@/lib/data/queries";
import { montarCentralEntregas } from "@/lib/entregas/central";
import { PerfilEnum } from "@/types";
import { CentralEntregasClient } from "./central-entregas-client";

export const metadata = { title: "Central de Entregas — SGTCC" };
export const dynamic = "force-dynamic";

interface CentralPageProps {
  searchParams?: Promise<{ tcc?: string }>;
}

async function ConteudoCentral({ searchParams }: CentralPageProps) {
  const sessao = await requireSessao(PerfilEnum.ALUNO);
  const tccs = await listarTccsVisiveis(sessao);
  const params = await searchParams;
  const tccId =
    params?.tcc && tccs.some((t) => t.id === params.tcc) ? params.tcc : (tccs[0]?.id ?? null);

  const painel = tccId ? await getPainelTcc(sessao, tccId) : null;

  return (
    <CentralEntregasClient
      tccs={tccs.map((t) => ({ id: t.id, titulo: t.titulo, fase: t.fase ?? null }))}
      tccIdAtivo={painel ? tccId : null}
      marcos={painel ? montarCentralEntregas(painel) : []}
    />
  );
}

export default function CentralEntregasPage(props: CentralPageProps) {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-[#f4f5f7]" />}>
      <ConteudoCentral searchParams={props.searchParams} />
    </Suspense>
  );
}
