import { Suspense } from "react";
import { requireSessao } from "@/lib/auth/server-session";
import { listarTccsVisiveis } from "@/lib/data/queries";
import { PerfilEnum } from "@/types";
import { CoordenacaoDashboardClient } from "./coordenacao-dashboard-client";

export const metadata = { title: "Painel da Coordenação — SGTCC" };
export const dynamic = "force-dynamic";

async function ConteudoCoordenacao() {
  const sessao = await requireSessao(PerfilEnum.COORDENACAO, PerfilEnum.ADMIN);
  const tccs = await listarTccsVisiveis(sessao);

  let cursosCoordenados: string[] = [];
  if (sessao.perfil === PerfilEnum.COORDENACAO) {
    const { adminDb } = await import("@/lib/firebase/admin");
    if (adminDb) {
      const [coordSnap, userSnap] = await Promise.all([
        adminDb.collection("coordenadores").where("usuario_id", "==", sessao.usuario.id).limit(1).get(),
        adminDb.collection("usuarios").doc(sessao.usuario.id).get(),
      ]);
      const cData = !coordSnap.empty ? coordSnap.docs[0].data() : null;
      const uData = userSnap.exists ? userSnap.data() : null;
      cursosCoordenados = cData?.cursos ?? uData?.cursosCoordenados ?? uData?.cursos ?? [];
    }
  }

  return (
    <CoordenacaoDashboardClient
      nomeUsuario={sessao.nome ?? "Usuário"}
      perfil={sessao.perfil as "COORDENACAO" | "ADMIN"}
      tccs={tccs}
      cursosCoordenados={cursosCoordenados}
    />
  );
}

export default function CoordenacaoDashboardPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-[#f4f5f7]" />}>
      <ConteudoCoordenacao />
    </Suspense>
  );
}
