import { NextResponse } from "next/server";
import { requireSessao } from "@/lib/auth/server-session";
import { adminDb } from "@/lib/firebase/admin";
import { PerfilEnum } from "@/types";

export const runtime = "nodejs";

export async function GET() {
  const sessao = await requireSessao(PerfilEnum.COORDENACAO, PerfilEnum.ADMIN);
  if (!sessao) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "Acesso restrito." }, { status: 403 });
  }

  if (!adminDb) {
    return NextResponse.json({ error: "CONFIG_ERROR", message: "Firestore indisponível." }, { status: 503 });
  }

  try {
    const [avaliadoresSnap, usuariosSnap] = await Promise.all([
      adminDb.collection("professores_avaliadores").get(),
      adminDb.collection("usuarios").where("perfil", "==", PerfilEnum.AVALIADOR).get(),
    ]);

    const nomesMap = new Map<string, { nome: string; email: string }>();
    usuariosSnap.docs.forEach((doc) => {
      const data = doc.data();
      nomesMap.set(doc.id, {
        nome: data.nome ?? "Docente Avaliador",
        email: data.email ?? "",
      });
    });

    const avaliadores = avaliadoresSnap.docs.map((doc) => {
      const data = doc.data();
      const usuarioId = data.usuario_id ?? doc.id;
      const usuario = nomesMap.get(usuarioId) ?? nomesMap.get(doc.id);
      return {
        id: doc.id,
        usuario_id: usuarioId,
        nome: usuario?.nome ?? data.nome ?? `Prof. Avaliador ${doc.id.slice(0, 6)}`,
        email: usuario?.email ?? "",
        cursos: (data.cursos as string[]) ?? [],
      };
    });

    // Se houver usuários com perfil AVALIADOR que ainda não têm doc em professores_avaliadores
    usuariosSnap.docs.forEach((uDoc) => {
      const jaExiste = avaliadores.some((a) => a.usuario_id === uDoc.id || a.id === uDoc.id);
      if (!jaExiste) {
        const uData = uDoc.data();
        avaliadores.push({
          id: uDoc.id,
          usuario_id: uDoc.id,
          nome: uData.nome ?? "Docente Avaliador",
          email: uData.email ?? "",
          cursos: (uData.cursosCoordenados as string[]) ?? [],
        });
      }
    });

    avaliadores.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    return NextResponse.json({ avaliadores });
  } catch (error) {
    console.error("Erro ao listar avaliadores:", error);
    return NextResponse.json({ error: "SERVER_ERROR", message: "Erro ao buscar avaliadores." }, { status: 500 });
  }
}

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

  const { tccId, avaliadoresUids } = (body as {
    tccId?: string;
    avaliadoresUids?: string[];
  }) ?? {};

  if (!tccId || !Array.isArray(avaliadoresUids)) {
    return NextResponse.json({ error: "MISSING_FIELDS", message: "TCC e lista de avaliadores são obrigatórios." }, { status: 400 });
  }

  try {
    const tccRef = adminDb.collection("tccs").doc(tccId);
    const tccDoc = await tccRef.get();
    if (!tccDoc.exists) {
      return NextResponse.json({ error: "NOT_FOUND", message: "TCC não encontrado." }, { status: 404 });
    }

    // Atualiza avaliadoresUids no documento do TCC
    await tccRef.update({
      avaliadoresUids,
    });

    // Cria os registros correspondentes em bancas_avaliacao caso não existam
    for (const uid of avaliadoresUids) {
      const bancaId = `banca-${tccId}-${uid}`;
      await adminDb.collection("bancas_avaliacao").doc(bancaId).set({
        id: bancaId,
        tcc_id: tccId,
        avaliador_id: uid,
      }, { merge: true });
    }

    return NextResponse.json({
      success: true,
      message: "Professores avaliadores alocados com sucesso!",
      tccId,
      avaliadoresUids,
    });
  } catch (error) {
    console.error("Erro ao alocar avaliadores:", error);
    return NextResponse.json({ error: "SERVER_ERROR", message: "Falha ao alocar avaliadores." }, { status: 500 });
  }
}
