import { NextResponse } from "next/server";
import { requireSessao } from "@/lib/auth/server-session";
import { adminDb } from "@/lib/firebase/admin";
import { PerfilEnum } from "@/types";
import { semestreAtual } from "@/lib/semestre";
import { criarNotificacoesEmLote } from "@/lib/notificacoes/service";

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

  const {
    titulo,
    alunoMatricula,
    alunoUid,
    alunos, // Array opcional de alunos [{ matricula?: string, uid?: string }] ou strings com matriculas/uids
    orientadorId,
    curso,
    fase,
    semestre,
  } = (body as {
    titulo?: string;
    alunoMatricula?: string;
    alunoUid?: string;
    alunos?: Array<{ matricula?: string; uid?: string } | string>;
    orientadorId?: string;
    curso?: string;
    fase?: 1 | 2 | string | number;
    semestre?: string;
  }) ?? {};

  if (!titulo || !titulo.trim()) {
    return NextResponse.json({ error: "INVALID_REQUEST", message: "Título do TCC é obrigatório." }, { status: 400 });
  }

  // Lista de alunos a serem vinculados
  const listaAlunosEntrada: Array<{ matricula?: string; uid?: string }> = [];
  if (Array.isArray(alunos) && alunos.length > 0) {
    for (const item of alunos) {
      if (typeof item === "string") {
        listaAlunosEntrada.push({ matricula: item, uid: item });
      } else if (item && typeof item === "object") {
        listaAlunosEntrada.push(item);
      }
    }
  } else if (alunoMatricula || alunoUid) {
    listaAlunosEntrada.push({ matricula: alunoMatricula, uid: alunoUid });
  }

  if (listaAlunosEntrada.length === 0) {
    return NextResponse.json({ error: "INVALID_REQUEST", message: "Pelo menos um aluno é obrigatório." }, { status: 400 });
  }

  if (!orientadorId) {
    return NextResponse.json({ error: "INVALID_REQUEST", message: "Orientador é obrigatório." }, { status: 400 });
  }

  try {
    const cursoFinal = (curso && curso.trim()) || "Engenharia de Software";

    // 1. Processa cada aluno para garantir registro em 'alunos' e obter matrícula e uid
    const matriculasFinais: string[] = [];
    const uidsAlunosFinais: string[] = [];

    for (const al of listaAlunosEntrada) {
      let matriculaFinal = al.matricula?.trim();
      let uidAlunoFinal = al.uid?.trim();

      if (matriculaFinal && !uidAlunoFinal) {
        const alunoDoc = await adminDb.collection("alunos").doc(matriculaFinal).get();
        if (alunoDoc.exists) {
          uidAlunoFinal = alunoDoc.data()?.usuario_id;
        }
      } else if (uidAlunoFinal && !matriculaFinal) {
        const alunoSnap = await adminDb.collection("alunos").where("usuario_id", "==", uidAlunoFinal).limit(1).get();
        if (!alunoSnap.empty) {
          matriculaFinal = alunoSnap.docs[0].id;
        } else {
          const uDoc = await adminDb.collection("usuarios").doc(uidAlunoFinal).get();
          matriculaFinal = uDoc.data()?.matricula ?? uidAlunoFinal;
        }
      }

      if (!matriculaFinal) {
        matriculaFinal = uidAlunoFinal || `mat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      }

      // Garante documento em 'alunos'
      const alunoRef = adminDb.collection("alunos").doc(matriculaFinal);
      const alunoDoc = await alunoRef.get();
      if (!alunoDoc.exists) {
        await alunoRef.set({
          matricula: matriculaFinal,
          usuario_id: uidAlunoFinal ?? matriculaFinal,
          curso: cursoFinal,
        }, { merge: true });
      }

      matriculasFinais.push(matriculaFinal);
      if (uidAlunoFinal) uidsAlunosFinais.push(uidAlunoFinal);
    }

    // 2. Determina o identificador do Orientador
    let orientadorIdFinal = orientadorId.trim();
    let orientadorUid = orientadorIdFinal;
    const orientadorDoc = await adminDb.collection("professores_orientadores").doc(orientadorIdFinal).get();
    if (orientadorDoc.exists) {
      orientadorUid = orientadorDoc.data()?.usuario_id ?? orientadorIdFinal;
    } else {
      await adminDb.collection("professores_orientadores").doc(orientadorIdFinal).set({
        id: orientadorIdFinal,
        usuario_id: orientadorIdFinal,
      }, { merge: true });
    }

    // 3. Monta e salva o TCC
    const faseNum: 1 | 2 = Number(fase) === 2 ? 2 : 1;
    const semestreFinal = (semestre && semestre.trim()) || semestreAtual();

    const novoTccRef = adminDb.collection("tccs").doc();
    const novoTccId = novoTccRef.id;

    const tccData = {
      id: novoTccId,
      titulo: titulo.trim(),
      statusGeral: "EM_ANDAMENTO",
      fase: faseNum,
      semestre: semestreFinal,
      curso: cursoFinal,
      aluno_id: matriculasFinais[0],
      alunos_ids: matriculasFinais,
      orientador_id: orientadorIdFinal,
    };

    await novoTccRef.set(tccData);

    // 4. Notifica todos os Alunos e o Orientador
    (async () => {
      try {
        const destinatarios = Array.from(new Set([...uidsAlunosFinais, orientadorUid].filter(Boolean)));
        if (destinatarios.length > 0) {
          await criarNotificacoesEmLote(
            destinatarios,
            `Você foi vinculado ao novo projeto de TCC "${tccData.titulo}" (${tccData.semestre} - Fase ${faseNum}).`,
            `/dashboard/tcc/${novoTccId}`
          );
        }
      } catch (errNotif) {
        console.error("Erro ao notificar participantes do novo TCC:", errNotif);
      }
    })();

    return NextResponse.json({
      success: true,
      message: "TCC criado e vinculado ao cronograma com sucesso!",
      tcc: tccData,
    });
  } catch (error) {
    console.error("Erro ao criar TCC pela coordenação:", error);
    return NextResponse.json({ error: "SERVER_ERROR", message: "Falha ao criar e vincular TCC." }, { status: 500 });
  }
}
