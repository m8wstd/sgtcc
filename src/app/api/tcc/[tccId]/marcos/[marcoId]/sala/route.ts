import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { requireSessao } from "@/lib/auth/server-session";
import { adminDb } from "@/lib/firebase/admin";
import { assertTccAccess } from "@/lib/auth/authorization";
import { getTccAccessRecord } from "@/lib/auth/firestore-repository";
import { PerfilEnum } from "@/types";

export const runtime = "nodejs";

// GET: Recupera os dados dinâmicos da sala (postagens, materiais, instrucoes customizadas, status/data)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ tccId: string; marcoId: string }> }
) {
  try {
    const { tccId, marcoId } = await params;
    const sessao = await requireSessao();
    if (!sessao) {
      return NextResponse.json({ error: "UNAUTHORIZED", message: "Não autenticado." }, { status: 401 });
    }

    if (!adminDb) {
      return NextResponse.json({ error: "CONFIG_ERROR", message: "Firestore indisponível." }, { status: 503 });
    }

    const registro = await getTccAccessRecord(tccId, sessao);
    if (!registro) {
      return NextResponse.json({ error: "NOT_FOUND", message: "TCC não encontrado." }, { status: 404 });
    }
    assertTccAccess(sessao, registro.tcc, registro.context);

    // Documento específico da sala da etapa para este TCC
    const salaDocId = `${tccId}__${marcoId}`;
    const salaDoc = await adminDb.collection("etapas_sala").doc(salaDocId).get();
    const salaData = salaDoc.exists ? salaDoc.data() : null;

    return NextResponse.json({
      success: true,
      sala: {
        postagens: salaData?.postagens ?? [],
        materiais: salaData?.materiais ?? [],
        instrucoesCustomizadas: salaData?.instrucoesCustomizadas ?? null,
        dataEntregaCustomizada: salaData?.dataEntregaCustomizada ?? null,
        statusCustomizado: salaData?.statusCustomizado ?? null,
      },
    });
  } catch (error) {
    console.error("Erro ao carregar dados da sala da etapa:", error);
    return NextResponse.json({ error: "SERVER_ERROR", message: "Falha ao obter dados da sala." }, { status: 500 });
  }
}

// POST: Realiza ações (postar no mural, adicionar/remover material, atualizar configurações ou marcar status)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ tccId: string; marcoId: string }> }
) {
  try {
    const { tccId, marcoId } = await params;
    const sessao = await requireSessao();
    if (!sessao) {
      return NextResponse.json({ error: "UNAUTHORIZED", message: "Não autenticado." }, { status: 401 });
    }

    if (!adminDb) {
      return NextResponse.json({ error: "CONFIG_ERROR", message: "Firestore indisponível." }, { status: 503 });
    }

    const registro = await getTccAccessRecord(tccId, sessao);
    if (!registro) {
      return NextResponse.json({ error: "NOT_FOUND", message: "TCC não encontrado." }, { status: 404 });
    }
    assertTccAccess(sessao, registro.tcc, registro.context);

    const isOrientador =
      sessao.perfil === PerfilEnum.ORIENTADOR ||
      sessao.perfil === PerfilEnum.COORDENACAO ||
      sessao.perfil === PerfilEnum.ADMIN;

    if (!isOrientador) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Apenas o professor orientador pode modificar a etapa." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { tipo, postagem, material, materialIdParaRemover, config, novoStatus, parecer } = body as {
      tipo: "NOVA_POSTAGEM" | "NOVO_MATERIAL" | "REMOVER_MATERIAL" | "EDITAR_CONFIG" | "MARCAR_STATUS";
      postagem?: { titulo: string; conteudo: string };
      material?: { nome: string; url?: string; tipo?: string; tamanho?: string };
      materialIdParaRemover?: string;
      config?: { titulo?: string; instrucoes?: string; dataEntrega?: string };
      novoStatus?: "EM_REVISAO" | "CONCLUIDA" | "SOLICITADA_CORRECAO";
      parecer?: string;
    };

    const salaDocId = `${tccId}__${marcoId}`;
    const salaRef = adminDb.collection("etapas_sala").doc(salaDocId);
    const salaDoc = await salaRef.get();
    const dadosAtuais = salaDoc.exists ? salaDoc.data() : { postagens: [], materiais: [] };

    const agora = Timestamp.now();
    const agoraIso = new Date().toLocaleDateString("pt-BR") + " às " + new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    if (tipo === "NOVA_POSTAGEM") {
      if (!postagem?.titulo?.trim() || !postagem?.conteudo?.trim()) {
        return NextResponse.json({ error: "INVALID_REQUEST", message: "Título e conteúdo são obrigatórios." }, { status: 400 });
      }

      const novaPostagemObj = {
        id: `post-${Date.now()}`,
        autorNome: sessao.nome ?? "Professor(a) Orientador(a)",
        autorPapel: "Professor(a) Orientador(a)",
        dataHora: agoraIso,
        criadoEm: agoraIso,
        titulo: postagem.titulo.trim(),
        conteudo: postagem.conteudo.trim(),
      };

      const postagensAtualizadas = [novaPostagemObj, ...(dadosAtuais?.postagens ?? [])];
      await salaRef.set({ postagens: postagensAtualizadas }, { merge: true });

      return NextResponse.json({ success: true, postagem: novaPostagemObj });
    }

    if (tipo === "NOVO_MATERIAL") {
      if (!material?.nome?.trim()) {
        return NextResponse.json({ error: "INVALID_REQUEST", message: "Nome do material é obrigatório." }, { status: 400 });
      }

      const novoMaterialObj = {
        id: `mat-${Date.now()}`,
        nome: material.nome.trim(),
        tipo: material.tipo?.toUpperCase() ?? "DOCUMENTO",
        tamanho: material.tamanho ?? "Arquivo",
        url: material.url?.trim() || "#",
        criadoEm: agoraIso,
      };

      const materiaisAtualizados = [novoMaterialObj, ...(dadosAtuais?.materiais ?? [])];
      await salaRef.set({ materiais: materiaisAtualizados }, { merge: true });

      return NextResponse.json({ success: true, material: novoMaterialObj });
    }

    if (tipo === "REMOVER_MATERIAL") {
      if (!materialIdParaRemover) {
        return NextResponse.json({ error: "INVALID_REQUEST", message: "ID do material não informado." }, { status: 400 });
      }

      const materiaisAtualizados = (dadosAtuais?.materiais ?? []).filter(
        (m: { id: string }) => m.id !== materialIdParaRemover
      );
      await salaRef.set({ materiais: materiaisAtualizados }, { merge: true });

      return NextResponse.json({ success: true, materialIdRemovido: materialIdParaRemover });
    }

    if (tipo === "EDITAR_CONFIG") {
      const updates: Record<string, unknown> = {};
      if (config?.instrucoes !== undefined) updates.instrucoesCustomizadas = config.instrucoes.trim();
      if (config?.dataEntrega !== undefined) updates.dataEntregaCustomizada = config.dataEntrega.trim();

      await salaRef.set(updates, { merge: true });

      // Se editou título ou prazo do marco original, também atualiza se for permitido
      if (config?.titulo?.trim()) {
        await adminDb.collection("marcos_cronograma").doc(marcoId).set(
          { titulo: config.titulo.trim() },
          { merge: true }
        );
      }

      return NextResponse.json({ success: true, config });
    }

    if (tipo === "MARCAR_STATUS") {
      if (!novoStatus) {
        return NextResponse.json({ error: "INVALID_REQUEST", message: "Status não informado." }, { status: 400 });
      }

      // 1. Localiza ou cria a entrega no Firestore (busca por tcc_id e marco_id para cobrir tanto IDs customizados quanto seed)
      const snapEntregas = await adminDb
        .collection("entregas")
        .where("tcc_id", "==", tccId)
        .where("marco_id", "==", marcoId)
        .limit(1)
        .get();

      let entregaDocRef: FirebaseFirestore.DocumentReference;

      if (!snapEntregas.empty) {
        entregaDocRef = snapEntregas.docs[0].ref;
        await entregaDocRef.update({
          status: novoStatus,
          dataAtualizacao: agora,
        });
      } else {
        const entregaId = `${tccId}__${marcoId}`;
        entregaDocRef = adminDb.collection("entregas").doc(entregaId);
        await entregaDocRef.set({
          id: entregaId,
          tcc_id: tccId,
          marco_id: marcoId,
          status: novoStatus,
          dataSubmissao: agora,
          dataAtualizacao: agora,
        });
      }

      // 2. Se houver parecer, salva na collection feedbacks e na sala
      const parecerTexto = parecer?.trim();
      if (parecerTexto) {
        await adminDb.collection("feedbacks").add({
          entrega_id: entregaDocRef.id,
          autor_id: sessao.usuario?.id ?? sessao.uid,
          comentario: parecerTexto,
          data: agora,
        });
      }

      // 3. Salva também no status da sala
      const salaUpdates: Record<string, unknown> = { statusCustomizado: novoStatus };
      if (parecerTexto) {
        salaUpdates.parecerMaisRecente = parecerTexto;
      }
      await salaRef.set(salaUpdates, { merge: true });

      return NextResponse.json({ success: true, novoStatus });
    }

    return NextResponse.json({ error: "INVALID_ACTION", message: "Ação não reconhecida." }, { status: 400 });
  } catch (error) {
    console.error("Erro ao modificar sala da etapa:", error);
    return NextResponse.json({ error: "SERVER_ERROR", message: "Erro ao processar ação na etapa." }, { status: 500 });
  }
}
