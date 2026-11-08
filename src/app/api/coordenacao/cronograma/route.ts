import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { requireSessao } from "@/lib/auth/server-session";
import { adminDb } from "@/lib/firebase/admin";
import { PerfilEnum } from "@/types";

export async function GET() {
  const sessao = await requireSessao(PerfilEnum.COORDENACAO, PerfilEnum.ADMIN);
  if (!sessao) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "Acesso restrito." }, { status: 403 });
  }

  if (!adminDb) {
    return NextResponse.json({ error: "CONFIG_ERROR", message: "Firestore indisponível." }, { status: 503 });
  }

  try {
    const snap = await adminDb.collection("marcos_cronograma").get();
    const marcos = snap.docs.map((doc) => {
      const data = doc.data();
      const limite = data.dataLimite instanceof Timestamp
        ? data.dataLimite.toDate().toISOString()
        : data.dataLimite;

      return {
        id: doc.id,
        titulo: data.titulo ?? doc.id,
        dataLimite: limite,
        cronograma_id: data.cronograma_id ?? "2026-2",
        fase: data.fase ?? (doc.id.startsWith("tcc1") ? 1 : 2),
        ordem: data.ordem ?? 0,
        tipo: data.tipo ?? (doc.id === "entrega-final" ? "ENTREGA_FINAL" : doc.id === "defesa" ? "DEFESA" : "COMUM"),
        descricao: data.descricao ?? "",
        exigeArquivo: data.exigeArquivo ?? (doc.id !== "defesa"),
      };
    });

    marcos.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));

    return NextResponse.json({ marcos });
  } catch (error) {
    console.error("Erro ao listar marcos do cronograma:", error);
    return NextResponse.json({ error: "SERVER_ERROR", message: "Erro ao buscar marcos." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
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

  const { marcos, excluirIds } = (body as {
    marcos?: Array<{
      id: string;
      titulo: string;
      dataLimite: string;
      cronograma_id?: string;
      fase?: 1 | 2;
      ordem?: number;
      tipo?: "COMUM" | "ENTREGA_FINAL" | "DEFESA";
      descricao?: string;
      exigeArquivo?: boolean;
    }>;
    excluirIds?: string[];
  }) ?? {};

  if (!Array.isArray(marcos) || marcos.length === 0) {
    return NextResponse.json({ error: "INVALID_REQUEST", message: "Lista de etapas obrigatória." }, { status: 400 });
  }

  try {
    const batch = adminDb.batch();

    // Exclusão de etapas removidas (apenas tipo COMUM)
    if (Array.isArray(excluirIds) && excluirIds.length > 0) {
      for (const idParaExcluir of excluirIds) {
        if (idParaExcluir !== "entrega-final" && idParaExcluir !== "defesa") {
          const docRef = adminDb.collection("marcos_cronograma").doc(idParaExcluir);
          batch.delete(docRef);
        }
      }
    }

    for (let i = 0; i < marcos.length; i++) {
      const m = marcos[i];
      if (!m.id || !m.titulo || !m.dataLimite) continue;

      const docRef = adminDb.collection("marcos_cronograma").doc(m.id);
      const dataIso = m.dataLimite.includes("T") ? m.dataLimite : `${m.dataLimite}T23:59:00.000Z`;
      const ts = Timestamp.fromDate(new Date(dataIso));

      const tipoFinal = m.tipo ?? (m.id === "entrega-final" ? "ENTREGA_FINAL" : m.id === "defesa" ? "DEFESA" : "COMUM");
      const exigeArquivo = tipoFinal === "DEFESA" ? false : (m.exigeArquivo ?? true);

      batch.set(
        docRef,
        {
          id: m.id,
          titulo: m.titulo.trim(),
          dataLimite: ts,
          cronograma_id: m.cronograma_id ?? "2026-2",
          fase: m.fase ?? 1,
          ordem: m.ordem ?? i + 1,
          tipo: tipoFinal,
          exigeArquivo,
          descricao: m.descricao?.trim() ?? "",
          bloqueioEstrito: m.id === "entrega-final",
        },
        { merge: true }
      );
    }

    await batch.commit();

    return NextResponse.json({ success: true, message: "Cronograma atualizado com sucesso!" });
  } catch (error) {
    console.error("Erro ao atualizar cronograma:", error);
    return NextResponse.json({ error: "SERVER_ERROR", message: "Falha ao salvar cronograma." }, { status: 500 });
  }
}
