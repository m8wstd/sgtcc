import { Suspense } from "react";
import { requireSessao } from "@/lib/auth/server-session";
import { MensagensClient } from "./mensagens-client";

export const metadata = { title: "Mensagens Integradas — SGTCC" };
export const dynamic = "force-dynamic";

interface MensagensPageProps {
  searchParams?: Promise<{ conversa?: string }>;
}

export default async function MensagensPage({ searchParams }: MensagensPageProps) {
  const sessao = await requireSessao();
  const params = await searchParams;

  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-[#f4f5f7]" />}>
      <MensagensClient
        usuarioId={sessao.uid}
        usuarioNome={sessao.nome ?? "Usuário"}
        conversaInicialId={params?.conversa ?? null}
      />
    </Suspense>
  );
}
