import { NextResponse } from "next/server";
import { requireSessao } from "@/lib/auth/server-session";
import { adminDb } from "@/lib/firebase/admin";
import { PerfilEnum } from "@/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const sessao = await requireSessao(PerfilEnum.COORDENACAO, PerfilEnum.ADMIN);
  if (!sessao) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "Acesso restrito." }, { status: 403 });
  }

  if (!adminDb) {
    return NextResponse.json({ error: "CONFIG_ERROR", message: "Firestore indisponível." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_REQUEST", message: "JSON inválido." }, { status: 400 });
  }

  const { alocacoes } = (body as {
    alocacoes?: Array<{
      tccId: string;
      orientadorId: string;
      orientadorNome?: string;
    }>;
  }) ?? {};

  if (!Array.isArray(alocacoes) || alocacoes.length === 0) {
    return NextResponse.json({ error: "INVALID_REQUEST", message: "Lista de alocações é obrigatória." }, { status: 400 });
  }

  try {
    const batch = adminDb.batch();

    for (const item of alocacoes) {
      if (!item.tccId || !item.orientadorId) continue;
      const tccRef = adminDb.collection("tccs").doc(item.tccId);
      batch.update(tccRef, {
        orientador_id: item.orientadorId,
      });
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `${alocacoes.length} orientações alocadas com sucesso!`,
    });
  } catch (error) {
    console.error("Erro na alocação em lote de orientadores:", error);
    return NextResponse.json({ error: "SERVER_ERROR", message: "Falha ao alocar docentes." }, { status: 500 });
  }
}
