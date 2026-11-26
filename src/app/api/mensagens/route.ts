import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { requireSessao } from "@/lib/auth/server-session";
import { adminDb } from "@/lib/firebase/admin";
import { hasValidCsrfToken, isSameOriginRequest } from "@/lib/auth/csrf";
import { PerfilEnum } from "@/types";
import { criarNotificacoesEmLote } from "@/lib/notificacoes/service";

export const dynamic = "force-dynamic";

export interface ConversaItem {
  id: string;
  tipo: "DIRETA" | "GRUPO";
  titulo: string;
  subtitulo?: string;
  tccId?: string;
  participantesUids: string[];
  exParticipantesUids?: string[];
  somenteLeitura?: boolean;
  ultimaMensagem?: {
    texto: string;
    autorNome: string;
    hora: string;
    criadoEm: string;
  };
}

export interface MensagemChat {
  id: string;
  conversaId: string;
  autorId: string;
  autorNome: string;
  autorPerfil: string;
  texto: string;
  criadoEm: string;
  hora: string;
}

export async function GET(request: Request) {
  const sessao = await requireSessao();
  if (!sessao) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "Não autenticado." }, { status: 401 });
  }

  if (!adminDb) {
    return NextResponse.json({ error: "CONFIG_ERROR", message: "Firestore indisponível." }, { status: 503 });
  }

  const url = new URL(request.url);
  const conversaId = url.searchParams.get("conversaId");

  try {
    // Caso 1: Buscar mensagens de uma conversa específica
    if (conversaId) {
      // Verifica se o usuário é participante da conversa
      const conversaDoc = await adminDb.collection("conversas").doc(conversaId).get();
      if (!conversaDoc.exists) {
        return NextResponse.json({ error: "NOT_FOUND", message: "Conversa não encontrada." }, { status: 404 });
      }

      const conversaData = conversaDoc.data();
      const participantes: string[] = conversaData?.participantesUids ?? [];
      const exParticipantes: string[] = conversaData?.exParticipantesUids ?? [];
      const ehParticipanteAtual = participantes.includes(sessao.uid);
      const ehExParticipante = exParticipantes.includes(sessao.uid);

      if (!ehParticipanteAtual && !ehExParticipante && sessao.perfil !== PerfilEnum.ADMIN) {
        return NextResponse.json({ error: "FORBIDDEN", message: "Acesso negado." }, { status: 403 });
      }

      const saidaRaw = !ehParticipanteAtual && ehExParticipante ? conversaData?.saidaEm?.[sessao.uid] : null;
      const saidaMs =
        saidaRaw instanceof Timestamp
          ? saidaRaw.toMillis()
          : typeof saidaRaw === "string"
            ? new Date(saidaRaw).getTime()
            : null;

      const msgsSnap = await adminDb
        .collection("conversas")
        .doc(conversaId)
        .collection("mensagens")
        .orderBy("criadoEm", "asc")
        .limit(100)
        .get();

      const mensagens: MensagemChat[] = msgsSnap.docs
        .filter((doc) => {
          if (saidaMs === null || Number.isNaN(saidaMs)) return true;
          const d = doc.data();
          const msgMs =
            d.criadoEm instanceof Timestamp
              ? d.criadoEm.toMillis()
              : typeof d.criadoEm === "string"
                ? new Date(d.criadoEm).getTime()
                : 0;
          return msgMs <= saidaMs;
        })
        .map((doc) => {
        const d = doc.data();
        let criadoEmIso = new Date().toISOString();
        let hora = "";
        if (d.criadoEm instanceof Timestamp) {
          const dt = d.criadoEm.toDate();
          criadoEmIso = dt.toISOString();
          hora = `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
        } else if (typeof d.criadoEm === "string") {
          criadoEmIso = d.criadoEm;
          const dt = new Date(d.criadoEm);
          hora = `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
        }

        return {
          id: doc.id,
          conversaId,
          autorId: d.autorId ?? "",
          autorNome: d.autorNome ?? "Usuário",
          autorPerfil: d.autorPerfil ?? "",
          texto: d.texto ?? "",
          criadoEm: criadoEmIso,
          hora,
        };
      });

      return NextResponse.json({ mensagens });
    }

    // Caso 2: Listar conversas do usuário ou gerar automaticamente as conversas do TCC
    // Primeiro busca conversas existentes no Firestore onde ele é participante atual ou ex-participante (histórico)
    const [snap, snapEx] = await Promise.all([
      adminDb.collection("conversas").where("participantesUids", "array-contains", sessao.uid).get(),
      adminDb.collection("conversas").where("exParticipantesUids", "array-contains", sessao.uid).get(),
    ]);

    const docsMap = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
    for (const doc of snap.docs) docsMap.set(doc.id, doc);
    for (const doc of snapEx.docs) {
      if (!docsMap.has(doc.id)) docsMap.set(doc.id, doc);
    }

    const conversasExistentes: ConversaItem[] = Array.from(docsMap.values()).map((doc) => {
      const d = doc.data();
      const participantesUids: string[] = d.participantesUids ?? [];
      const exParticipantesUids: string[] = d.exParticipantesUids ?? [];
      return {
        id: doc.id,
        tipo: d.tipo ?? "DIRETA",
        titulo: d.titulo ?? "Conversa",
        subtitulo: d.subtitulo ?? "",
        tccId: d.tccId,
        participantesUids,
        exParticipantesUids,
        somenteLeitura: !participantesUids.includes(sessao.uid) && exParticipantesUids.includes(sessao.uid),
        ultimaMensagem: d.ultimaMensagem,
      };
    });

    // Gera conversas automáticas baseadas nos vínculos de TCC e Perfis se ainda não existirem
    // A. Descobre os TCCs relevantes do usuário
    const tccsDocs: FirebaseFirestore.DocumentSnapshot[] = [];
    if (sessao.perfil === PerfilEnum.ALUNO) {
      const aSnap = await adminDb.collection("alunos").where("usuario_id", "==", sessao.uid).get();
      if (!aSnap.empty) {
        const alunoDoc = aSnap.docs[0];
        const matricula = alunoDoc.data()?.matricula ?? alunoDoc.id;
        const tSnap = await adminDb.collection("tccs").where("aluno_id", "==", matricula).get();
        tccsDocs.push(...tSnap.docs);
      }
    } else if (sessao.perfil === PerfilEnum.ORIENTADOR) {
      const oSnap = await adminDb.collection("professores_orientadores").where("usuario_id", "==", sessao.uid).get();
      if (!oSnap.empty) {
        const tSnap = await adminDb.collection("tccs").where("orientador_id", "==", oSnap.docs[0].id).get();
        tccsDocs.push(...tSnap.docs);
      }
    } else if (sessao.perfil === PerfilEnum.COORDENACAO) {
      // Coordenador: busca os cursos sob sua coordenação
      const coordDoc = await adminDb.collection("usuarios").doc(sessao.uid).get();
      const coordData = coordDoc.exists ? coordDoc.data() : null;
      const cursosCoordenados: string[] =
        coordData?.cursosCoordenados ?? coordData?.cursos ?? [];

      let queryTccs: FirebaseFirestore.Query = adminDb.collection("tccs");
      if (cursosCoordenados.length > 0) {
        queryTccs = queryTccs.where("curso", "in", cursosCoordenados.slice(0, 10));
      }
      const tSnap = await queryTccs.get();
      tccsDocs.push(...tSnap.docs);

      // Além disso, cria/garante conversas diretas entre o coordenador e todos os alunos, orientadores e avaliadores desses cursos
      const usuariosRelacionados = new Map<string, { nome: string; papel: string }>();

      for (const doc of tSnap.docs) {
        const t = doc.data();
        if (!t) continue;

        // Orientador
        if (t.orientador_id) {
          const oDoc = await adminDb.collection("professores_orientadores").doc(t.orientador_id).get();
          if (oDoc.exists) {
            const oUid = oDoc.data()?.usuario_id;
            if (oUid && oUid !== sessao.uid && !usuariosRelacionados.has(oUid)) {
              const uDoc = await adminDb.collection("usuarios").doc(oUid).get();
              const nome = uDoc.data()?.nome ?? oDoc.data()?.nome ?? "Professor Orientador";
              usuariosRelacionados.set(oUid, { nome, papel: "Professor Orientador" });
            }
          }
        }

        // Aluno
        if (t.aluno_id) {
          const aDoc = await adminDb.collection("alunos").doc(t.aluno_id).get();
          if (aDoc.exists) {
            const aUid = aDoc.data()?.usuario_id;
            if (aUid && aUid !== sessao.uid && !usuariosRelacionados.has(aUid)) {
              const uDoc = await adminDb.collection("usuarios").doc(aUid).get();
              const nome = uDoc.data()?.nome ?? aDoc.data()?.nome ?? "Aluno";
              usuariosRelacionados.set(aUid, { nome, papel: "Aluno" });
            }
          }
        }

        // Avaliadores
        const avs: string[] = t.avaliadoresUids ?? [];
        for (const avUid of avs) {
          if (avUid && avUid !== sessao.uid && !usuariosRelacionados.has(avUid)) {
            const uDoc = await adminDb.collection("usuarios").doc(avUid).get();
            const nome = uDoc.data()?.nome ?? "Professor Avaliador";
            usuariosRelacionados.set(avUid, { nome, papel: "Professor Avaliador" });
          }
        }
      }

      // Cria conversas diretas com o coordenador caso não existam
      for (const [outroUid, info] of usuariosRelacionados.entries()) {
        const diretaCoordId = `direta-${[sessao.uid, outroUid].sort().join("-")}`;
        if (!conversasExistentes.some((c) => c.id === diretaCoordId)) {
          const novaCoordDireta = {
            id: diretaCoordId,
            tipo: "DIRETA" as const,
            titulo: info.nome,
            subtitulo: info.papel,
            participantesUids: [sessao.uid, outroUid],
            criadoEm: Timestamp.now(),
          };
          await adminDb.collection("conversas").doc(diretaCoordId).set(novaCoordDireta, { merge: true });
          conversasExistentes.push({
            id: diretaCoordId,
            tipo: "DIRETA",
            titulo: info.nome,
            subtitulo: info.papel,
            participantesUids: [sessao.uid, outroUid],
          });
        }
      }
    }

    for (const tccDoc of tccsDocs) {
      const tcc = tccDoc.data();
      if (!tcc) continue;

      // Busca orientador UID
      let orientadorUid = "";
      let orientadorNome = "Orientador";
      if (tcc.orientador_id) {
        const oDoc = await adminDb.collection("professores_orientadores").doc(tcc.orientador_id).get();
        if (oDoc.exists) {
          orientadorUid = oDoc.data()?.usuario_id;
          if (orientadorUid) {
            const uDoc = await adminDb.collection("usuarios").doc(orientadorUid).get();
            if (uDoc.exists) orientadorNome = uDoc.data()?.nome ?? orientadorNome;
          }
        }
      }

      // Busca aluno UID
      let alunoUid = "";
      let alunoNome = "Aluno";
      if (tcc.aluno_id) {
        const aDoc = await adminDb.collection("alunos").doc(tcc.aluno_id).get();
        if (aDoc.exists) {
          alunoUid = aDoc.data()?.usuario_id;
          if (alunoUid) {
            const uDoc = await adminDb.collection("usuarios").doc(alunoUid).get();
            if (uDoc.exists) alunoNome = uDoc.data()?.nome ?? alunoNome;
          }
        }
      }

      const avaliadoresUids: string[] = tcc.avaliadoresUids ?? [];

      // 1. Grupo do TCC (todos os integrantes do TCC: alunos + orientador + avaliadores)
      const grupoTccId = `grupo-tcc-${tccDoc.id}`;
      const integrantes = [...new Set([alunoUid, orientadorUid, ...avaliadoresUids].filter(Boolean))];
      const grupoExistente = conversasExistentes.find((c) => c.id === grupoTccId);

      if (!grupoExistente) {
        const grupoRef = adminDb.collection("conversas").doc(grupoTccId);
        const grupoSnap = await grupoRef.get();
        if (grupoSnap.exists) {
          const gd = grupoSnap.data() ?? {};
          const atuais: string[] = gd.participantesUids ?? [];
          const exAtuais: string[] = gd.exParticipantesUids ?? [];
          const mudou =
            atuais.length !== integrantes.length || integrantes.some((u) => !atuais.includes(u));

          if (mudou) {
            const removidos = atuais.filter((u) => !integrantes.includes(u));
            const novoEx = [...new Set([...exAtuais.filter((u) => !integrantes.includes(u)), ...removidos])];
            const saidaEmUpdate: Record<string, Timestamp> = { ...(gd.saidaEm ?? {}) };
            const agora = Timestamp.now();
            for (const r of removidos) saidaEmUpdate[r] = agora;

            await grupoRef.update({
              participantesUids: integrantes,
              exParticipantesUids: novoEx,
              saidaEm: saidaEmUpdate,
              subtitulo: `Grupo do TCC (${integrantes.length} integrantes)`,
            });
          }

          if (integrantes.includes(sessao.uid)) {
            conversasExistentes.push({
              id: grupoTccId,
              tipo: "GRUPO",
              titulo: gd.titulo ?? `Grupo: ${tcc.titulo}`,
              subtitulo: `Grupo do TCC (${integrantes.length} integrantes)`,
              tccId: tccDoc.id,
              participantesUids: integrantes,
              ultimaMensagem: gd.ultimaMensagem,
            });
          }
        } else if (integrantes.includes(sessao.uid)) {
          const novoGrupo = {
            id: grupoTccId,
            tipo: "GRUPO" as const,
            titulo: `Grupo: ${tcc.titulo}`,
            subtitulo: `Grupo do TCC (${integrantes.length} integrantes)`,
            tccId: tccDoc.id,
            participantesUids: integrantes,
            criadoEm: Timestamp.now(),
          };
          await grupoRef.set(novoGrupo, { merge: true });
          conversasExistentes.push({
            id: grupoTccId,
            tipo: "GRUPO",
            titulo: novoGrupo.titulo,
            subtitulo: novoGrupo.subtitulo,
            tccId: tccDoc.id,
            participantesUids: integrantes,
          });
        }
      } else {
        const atuais = grupoExistente.participantesUids ?? [];
        const mudou =
          atuais.length !== integrantes.length || integrantes.some((u) => !atuais.includes(u));
        if (mudou) {
          const grupoRef = adminDb.collection("conversas").doc(grupoTccId);
          const grupoSnap = await grupoRef.get();
          const gd = grupoSnap.data() ?? {};
          const exAtuais: string[] = gd.exParticipantesUids ?? [];
          const removidos = atuais.filter((u) => !integrantes.includes(u));
          const novoEx = [...new Set([...exAtuais.filter((u) => !integrantes.includes(u)), ...removidos])];
          const saidaEmUpdate: Record<string, Timestamp> = { ...(gd.saidaEm ?? {}) };
          const agora = Timestamp.now();
          for (const r of removidos) saidaEmUpdate[r] = agora;

          await grupoRef.update({
            participantesUids: integrantes,
            exParticipantesUids: novoEx,
            saidaEm: saidaEmUpdate,
            subtitulo: `Grupo do TCC (${integrantes.length} integrantes)`,
          });

          grupoExistente.participantesUids = integrantes;
          grupoExistente.exParticipantesUids = novoEx;
          grupoExistente.subtitulo = `Grupo do TCC (${integrantes.length} integrantes)`;
          grupoExistente.somenteLeitura = !integrantes.includes(sessao.uid) && novoEx.includes(sessao.uid);
        }
      }

      // 2. Chat direto Aluno <-> Orientador
      if (alunoUid && orientadorUid) {
        const diretaId = `direta-${[alunoUid, orientadorUid].sort().join("-")}`;
        if (!conversasExistentes.some((c) => c.id === diretaId)) {
          if (sessao.uid === alunoUid || sessao.uid === orientadorUid) {
            const outroNome = sessao.uid === alunoUid ? orientadorNome : alunoNome;
            const outroPapel = sessao.uid === alunoUid ? "Professor Orientador" : "Aluno Orientando";
            const novaDireta = {
              id: diretaId,
              tipo: "DIRETA" as const,
              titulo: outroNome,
              subtitulo: outroPapel,
              tccId: tccDoc.id,
              participantesUids: [alunoUid, orientadorUid],
              criadoEm: Timestamp.now(),
            };
            await adminDb.collection("conversas").doc(diretaId).set(novaDireta, { merge: true });
            conversasExistentes.push({
              id: diretaId,
              tipo: "DIRETA",
              titulo: outroNome,
              subtitulo: outroPapel,
              tccId: tccDoc.id,
              participantesUids: [alunoUid, orientadorUid],
            });
          }
        }
      }
    }

    // Professores (orientadores e avaliadores) devem ter acesso a mandar mensagem aos coordenadores de seus cursos
    if (sessao.perfil === PerfilEnum.ORIENTADOR || sessao.perfil === PerfilEnum.AVALIADOR) {
      const cursosDoProf = new Set<string>(
        tccsDocs.map((d) => d.data()?.curso as string | undefined).filter((c): c is string => Boolean(c)),
      );
      const coordsSnap = await adminDb.collection("usuarios").where("perfil", "==", PerfilEnum.COORDENACAO).get();
      for (const coordDoc of coordsSnap.docs) {
        const coordId = coordDoc.id;
        if (coordId === sessao.uid) continue;
        const coordData = coordDoc.data();
        const cursosCoord: string[] = coordData?.cursosCoordenados ?? coordData?.cursos ?? [];
        const atendeCurso =
          cursosCoord.length === 0 ||
          cursosDoProf.size === 0 ||
          cursosCoord.some((c) => cursosDoProf.has(c));

        if (!atendeCurso) continue;

        const canalCoordId = `direta-${[sessao.uid, coordId].sort().join("-")}`;
        if (!conversasExistentes.some((c) => c.id === canalCoordId)) {
          const novaCoord = {
            id: canalCoordId,
            tipo: "DIRETA" as const,
            titulo: coordData?.nome ?? "Coordenação de TCC",
            subtitulo: "Coordenação de TCC",
            participantesUids: [sessao.uid, coordId],
            criadoEm: Timestamp.now(),
          };
          await adminDb.collection("conversas").doc(canalCoordId).set(novaCoord, { merge: true });
          conversasExistentes.push({
            id: canalCoordId,
            tipo: "DIRETA",
            titulo: novaCoord.titulo,
            subtitulo: novaCoord.subtitulo,
            participantesUids: novaCoord.participantesUids,
          });
        }
      }
    }

    // Se o usuário for aluno ou professor e ainda não tiver conversas, oferece canal com a Coordenação
    if (conversasExistentes.length === 0) {
      const coordSnap = await adminDb.collection("usuarios").where("perfil", "==", PerfilEnum.COORDENACAO).limit(1).get();
      if (!coordSnap.empty) {
        const coordDoc = coordSnap.docs[0];
        const coordId = coordDoc.id;
        const canalCoordId = `direta-${[sessao.uid, coordId].sort().join("-")}`;
        const novaCoord = {
          id: canalCoordId,
          tipo: "DIRETA" as const,
          titulo: coordDoc.data().nome ?? "Coordenação de TCC",
          subtitulo: "Canal com a Coordenação",
          participantesUids: [sessao.uid, coordId],
          criadoEm: Timestamp.now(),
        };
        await adminDb.collection("conversas").doc(canalCoordId).set(novaCoord, { merge: true });
        conversasExistentes.push({
          id: canalCoordId,
          tipo: "DIRETA",
          titulo: novaCoord.titulo,
          subtitulo: novaCoord.subtitulo,
          participantesUids: novaCoord.participantesUids,
        });
      }
    }

    // Resolve dinamicamente o título e subtítulo de conversas DIRETA para o outro participante
    const outrosUids = Array.from(
      new Set(
        conversasExistentes
          .filter((c) => c.tipo === "DIRETA")
          .map((c) => c.participantesUids.find((uid) => uid !== sessao.uid))
          .filter((uid): uid is string => Boolean(uid))
      )
    );

    if (outrosUids.length > 0) {
      const usuariosMap = new Map<string, { nome: string; perfil: string }>();
      const refs = outrosUids.map((uid) => adminDb!.collection("usuarios").doc(uid));
      const docsUsuarios = await adminDb.getAll(...refs);
      for (const uDoc of docsUsuarios) {
        if (uDoc.exists) {
          const uData = uDoc.data();
          usuariosMap.set(uDoc.id, {
            nome: uData?.nome ?? "Usuário",
            perfil: uData?.perfil ?? "",
          });
        }
      }

      const papelLabel: Record<string, string> = {
        ALUNO: "Aluno",
        ORIENTADOR: "Professor Orientador",
        AVALIADOR: "Professor Avaliador",
        COORDENACAO: "Coordenação de TCC",
        ADMIN: "Administração",
      };

      for (const conv of conversasExistentes) {
        if (conv.tipo === "DIRETA") {
          const outroUid = conv.participantesUids.find((uid) => uid !== sessao.uid);
          if (outroUid && usuariosMap.has(outroUid)) {
            const info = usuariosMap.get(outroUid)!;
            conv.titulo = info.nome;
            conv.subtitulo = papelLabel[info.perfil] ?? conv.subtitulo;
          }
        }
      }
    }

    // Ordena as conversas: as que tiveram mensagem mais recente ficam no topo
    conversasExistentes.sort((a, b) => {
      const dataA = a.ultimaMensagem?.criadoEm ? new Date(a.ultimaMensagem.criadoEm).getTime() : 0;
      const dataB = b.ultimaMensagem?.criadoEm ? new Date(b.ultimaMensagem.criadoEm).getTime() : 0;
      return dataB - dataA;
    });

    return NextResponse.json({ conversas: conversasExistentes });
  } catch (error) {
    console.error("Erro ao carregar mensagens/conversas:", error);
    return NextResponse.json({ error: "SERVER_ERROR", message: "Erro ao processar mensagens." }, { status: 500 });
  }
}

export async function POST(request: Request) {
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
    const { conversaId, texto } = body as { conversaId?: string; texto?: string };

    if (!conversaId || typeof conversaId !== "string") {
      return NextResponse.json({ error: "INVALID_REQUEST", message: "Conversa não informada." }, { status: 400 });
    }

    const textoLimpo = typeof texto === "string" ? texto.trim() : "";
    if (!textoLimpo) {
      return NextResponse.json({ error: "INVALID_REQUEST", message: "Digite uma mensagem." }, { status: 400 });
    }

    const conversaRef = adminDb.collection("conversas").doc(conversaId);
    const conversaDoc = await conversaRef.get();
    if (!conversaDoc.exists) {
      return NextResponse.json({ error: "NOT_FOUND", message: "Conversa não encontrada." }, { status: 404 });
    }

    const conversaData = conversaDoc.data();
    const participantes: string[] = conversaData?.participantesUids ?? [];
    if (!participantes.includes(sessao.uid) && sessao.perfil !== PerfilEnum.ADMIN) {
      return NextResponse.json({ error: "FORBIDDEN", message: "Você não faz parte desta conversa." }, { status: 403 });
    }

    const agora = Timestamp.now();
    const dt = agora.toDate();
    const hora = `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;

    const novaMsgRef = conversaRef.collection("mensagens").doc();
    const novaMensagem = {
      id: novaMsgRef.id,
      conversaId,
      autorId: sessao.uid,
      autorNome: sessao.nome ?? "Usuário",
      autorPerfil: sessao.perfil,
      texto: textoLimpo,
      criadoEm: agora,
    };

    await novaMsgRef.set(novaMensagem);

    // Atualiza a última mensagem na conversa
    await conversaRef.update({
      ultimaMensagem: {
        texto: textoLimpo,
        autorNome: sessao.nome ?? "Usuário",
        hora,
        criadoEm: dt.toISOString(),
      },
      atualizadoEm: agora,
    });

    // Notifica os demais participantes
    const outrosParticipantes = participantes.filter((uid) => uid !== sessao.uid);
    if (outrosParticipantes.length > 0) {
      const tituloConversa = conversaData?.tipo === "GRUPO" ? conversaData.titulo : (sessao.nome ?? "Novo contato");
      criarNotificacoesEmLote(
        outrosParticipantes,
        `Nova mensagem de ${sessao.nome ?? "Contato"} em "${tituloConversa}": "${textoLimpo.slice(0, 50)}${textoLimpo.length > 50 ? "..." : ""}"`,
        `/dashboard/mensagens?conversa=${conversaId}`
      ).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      mensagem: {
        id: novaMsgRef.id,
        conversaId,
        autorId: sessao.uid,
        autorNome: sessao.nome ?? "Usuário",
        autorPerfil: sessao.perfil,
        texto: textoLimpo,
        criadoEm: dt.toISOString(),
        hora,
      },
    });
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error);
    return NextResponse.json({ error: "SERVER_ERROR", message: "Falha ao enviar mensagem." }, { status: 500 });
  }
}
