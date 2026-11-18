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
    const [orientadoresSnap, usuariosOrientadorSnap, usuariosAvaliadorSnap] = await Promise.all([
      adminDb.collection("professores_orientadores").get(),
      adminDb.collection("usuarios").where("perfil", "==", PerfilEnum.ORIENTADOR).get(),
      adminDb.collection("usuarios").where("perfil", "==", PerfilEnum.AVALIADOR).get(),
    ]);

    const nomesMap = new Map<string, { nome: string; email: string }>();
    [...usuariosOrientadorSnap.docs, ...usuariosAvaliadorSnap.docs].forEach((doc) => {
      const data = doc.data();
      nomesMap.set(doc.id, {
        nome: data.nome ?? "Docente",
        email: data.email ?? "",
      });
    });

    const orientadores = orientadoresSnap.docs.map((doc) => {
      const data = doc.data();
      const usuarioId = data.usuario_id ?? doc.id;
      const usuario = nomesMap.get(usuarioId) ?? nomesMap.get(doc.id);
      return {
        id: doc.id,
        usuario_id: usuarioId,
        nome: usuario?.nome ?? data.nome ?? `Prof. ${doc.id.slice(0, 6)}`,
        email: usuario?.email ?? "",
        cursos: (data.cursos as string[]) ?? [],
      };
    });

    // Se houver usuários com perfil ORIENTADOR que ainda não têm documento em professores_orientadores, inclua-os
    [...usuariosOrientadorSnap.docs, ...usuariosAvaliadorSnap.docs].forEach((uDoc) => {
      const jaExiste = orientadores.some((o) => o.usuario_id === uDoc.id || o.id === uDoc.id);
      if (!jaExiste) {
        const uData = uDoc.data();
        orientadores.push({
          id: uDoc.id,
          usuario_id: uDoc.id,
          nome: uData.nome ?? "Docente",
          email: uData.email ?? "",
          cursos: [],
        });
      }
    });

    orientadores.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    return NextResponse.json({ orientadores });
  } catch (error) {
    console.error("Erro ao listar orientadores:", error);
    return NextResponse.json({ error: "SERVER_ERROR", message: "Erro ao buscar orientadores." }, { status: 500 });
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

  const { tccId, novoOrientadorId, novoOrientadorNome } = (body as {
    tccId?: string;
    novoOrientadorId?: string;
    novoOrientadorNome?: string;
  }) ?? {};

  if (!tccId) {
    return NextResponse.json({ error: "MISSING_FIELDS", message: "Identificador do TCC é obrigatório." }, { status: 400 });
  }

  try {
    const tccRef = adminDb.collection("tccs").doc(tccId);
    const tccDoc = await tccRef.get();
    if (!tccDoc.exists) {
      return NextResponse.json({ error: "NOT_FOUND", message: "TCC não encontrado." }, { status: 404 });
    }

    const tccData = tccDoc.data();
    let orientadorIdDestino = novoOrientadorId;
    let orientadorNomeFinal = novoOrientadorNome?.trim();

    // Se orientadorIdDestino foi fornecido, verifica e obtém nome
    if (orientadorIdDestino) {
      const orientadorDoc = await adminDb.collection("professores_orientadores").doc(orientadorIdDestino).get();
      if (!orientadorDoc.exists) {
        // Pode ser o usuario_id direto
        const userDoc = await adminDb.collection("usuarios").doc(orientadorIdDestino).get();
        if (userDoc.exists) {
          // Garante documento em professores_orientadores
          await adminDb.collection("professores_orientadores").doc(orientadorIdDestino).set({
            id: orientadorIdDestino,
            usuario_id: orientadorIdDestino,
          }, { merge: true });
          if (!orientadorNomeFinal) orientadorNomeFinal = userDoc.data()?.nome;
        }
      } else {
        const uId = orientadorDoc.data()?.usuario_id ?? orientadorDoc.id;
        const uDoc = await adminDb.collection("usuarios").doc(uId).get();
        if (uDoc.exists && !orientadorNomeFinal) {
          orientadorNomeFinal = uDoc.data()?.nome;
        }
      }
    } else if (orientadorNomeFinal) {
      // Busca pelo nome entre os usuários orientadores
      const usuariosSnap = await adminDb.collection("usuarios").where("perfil", "==", PerfilEnum.ORIENTADOR).get();
      const match = usuariosSnap.docs.find(
        (d) => d.data().nome?.trim().toLowerCase() === orientadorNomeFinal!.toLowerCase()
      );
      if (match) {
        orientadorIdDestino = match.id;
        orientadorNomeFinal = match.data().nome;
        await adminDb.collection("professores_orientadores").doc(match.id).set({
          id: match.id,
          usuario_id: match.id,
        }, { merge: true });
      } else {
        // Se não encontrar docente específico no banco, cria o registro do docente em professores_orientadores
        const novoDocRef = adminDb.collection("professores_orientadores").doc();
        await novoDocRef.set({
          id: novoDocRef.id,
          usuario_id: novoDocRef.id,
          nome: orientadorNomeFinal,
        });
        orientadorIdDestino = novoDocRef.id;
      }
    }

    if (!orientadorIdDestino) {
      return NextResponse.json({ error: "INVALID_REQUEST", message: "Novo orientador não identificado." }, { status: 400 });
    }

    // Atualiza o orientador_id no documento do TCC
    await tccRef.update({
      orientador_id: orientadorIdDestino,
    });

    return NextResponse.json({
      success: true,
      message: "Orientador atualizado com sucesso!",
      tccId,
      novoOrientadorId: orientadorIdDestino,
      novoOrientadorNome: orientadorNomeFinal,
    });
  } catch (error) {
    console.error("Erro ao transferir orientação:", error);
    return NextResponse.json({ error: "SERVER_ERROR", message: "Falha ao transferir orientação." }, { status: 500 });
  }
}
