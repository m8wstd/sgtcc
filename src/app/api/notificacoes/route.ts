import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { requireSessao } from "@/lib/auth/server-session";
import { adminDb } from "@/lib/firebase/admin";
import { hasValidCsrfToken, isSameOriginRequest } from "@/lib/auth/csrf";

export const dynamic = "force-dynamic";

export async function GET() {
  const sessao = await requireSessao();
  if (!sessao) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "Não autenticado." }, { status: 401 });
  }

  if (!adminDb) {
    return NextResponse.json({ error: "CONFIG_ERROR", message: "Firestore indisponível." }, { status: 503 });
  }

  try {
    const snap = await adminDb
      .collection("notificacoes")
      .where("usuario_id", "==", sessao.uid)
      .get();

    const notificacoes = snap.docs.map((doc) => {
      const data = doc.data();
      let criadoEmStr = new Date().toISOString();
      if (data.criadoEm instanceof Timestamp) {
        criadoEmStr = data.criadoEm.toDate().toISOString();
      } else if (typeof data.criadoEm === "string") {
        criadoEmStr = data.criadoEm;
      }

      return {
        id: doc.id,
        mensagem: data.mensagem ?? "",
        lida: Boolean(data.lida),
        link: data.link ?? null,
        criadoEm: criadoEmStr,
      };
    });

    // Ordena da mais recente para a mais antiga
    notificacoes.sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());

    return NextResponse.json({ notificacoes });
  } catch (error) {
    console.error("Erro ao buscar notificações:", error);
    return NextResponse.json({ error: "SERVER_ERROR", message: "Erro ao buscar notificações." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!isSameOriginRequest(request) || !hasValidCsrfToken(request)) {
    return NextResponse.json({ error: "FORBIDDEN", message: "CSRF token inválido." }, { status: 403 });
  }

  const sessao = await requireSessao();
  if (!sessao) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "Não autenticado." }, { status: 401 });
  }

  if (!adminDb) {
    return NextResponse.json({ error: "CONFIG_ERROR", message: "Firestore indisponível." }, { status: 503 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { id, marcarTodas } = body as { id?: string; marcarTodas?: boolean };

    if (marcarTodas) {
      const snap = await adminDb
        .collection("notificacoes")
        .where("usuario_id", "==", sessao.uid)
        .where("lida", "==", false)
        .get();

      const batch = adminDb.batch();
      for (const doc of snap.docs) {
        batch.update(doc.ref, { lida: true });
      }
      await batch.commit();
      return NextResponse.json({ success: true, count: snap.docs.length });
    }

    if (!id) {
      return NextResponse.json({ error: "INVALID_REQUEST", message: "ID da notificação é obrigatório." }, { status: 400 });
    }

    const docRef = adminDb.collection("notificacoes").doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return NextResponse.json({ error: "NOT_FOUND", message: "Notificação não encontrada." }, { status: 404 });
    }

    const data = doc.data();
    if (data?.usuario_id !== sessao.uid) {
      return NextResponse.json({ error: "FORBIDDEN", message: "Acesso negado." }, { status: 403 });
    }

    await docRef.update({ lida: true });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao atualizar notificação:", error);
    return NextResponse.json({ error: "SERVER_ERROR", message: "Erro ao atualizar notificação." }, { status: 500 });
  }
}
