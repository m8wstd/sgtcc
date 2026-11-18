import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { requireSessao } from "@/lib/auth/server-session";
import { adminDb } from "@/lib/firebase/admin";
import { PerfilEnum } from "@/types";

export const dynamic = "force-dynamic";

export interface EventoCronograma {
  id: string;
  titulo: string;
  data: string; // YYYY-MM-DD
  tipo: "ENTREGA" | "DEFESA" | "REVISAO" | "GERAL";
  descricao?: string;
  tccTitulo?: string;
  tccId?: string;
  responsavel?: string;
}

export async function GET() {
  const sessao = await requireSessao();
  if (!sessao) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "Não autenticado." }, { status: 401 });
  }

  if (!adminDb) {
    return NextResponse.json({ error: "CONFIG_ERROR", message: "Firestore indisponível." }, { status: 503 });
  }

  try {
    const eventos: EventoCronograma[] = [];

    // 1. Marcos institucionais do cronograma (prazos gerais para alunos e professores)
    const marcosSnap = await adminDb.collection("marcos_cronograma").get();
    for (const doc of marcosSnap.docs) {
      const data = doc.data();
      let dataIso = "";
      if (data.dataLimite instanceof Timestamp) {
        dataIso = data.dataLimite.toDate().toISOString().split("T")[0];
      } else if (typeof data.dataLimite === "string") {
        dataIso = data.dataLimite.split("T")[0];
      }

      if (dataIso) {
        eventos.push({
          id: `marco-${doc.id}`,
          titulo: data.titulo ?? "Prazo de Etapa",
          data: dataIso,
          tipo: data.tipo === "DEFESA" ? "DEFESA" : "ENTREGA",
          descricao: data.descricao || (data.fase ? `Etapa do TCC ${data.fase}` : "Prazo institucional"),
          responsavel: "Todos os alunos e orientadores",
        });
      }
    }

    // 2. Se for ALUNO: buscar defesas e entregas específicas dos seus TCCs
    if (sessao.perfil === PerfilEnum.ALUNO) {
      const alunoSnap = await adminDb.collection("alunos").where("usuario_id", "==", sessao.uid).get();
      if (!alunoSnap.empty) {
        const alunoDoc = alunoSnap.docs[0];
        const matricula = alunoDoc.data()?.matricula ?? alunoDoc.id;
        const tccsSnap = await adminDb.collection("tccs").where("aluno_id", "==", matricula).get();
        for (const tccDoc of tccsSnap.docs) {
          const tccData = tccDoc.data();
          if (tccData.defesaEm) {
            let defesaIso = "";
            if (tccData.defesaEm instanceof Timestamp) {
              defesaIso = tccData.defesaEm.toDate().toISOString().split("T")[0];
            } else if (typeof tccData.defesaEm === "string") {
              defesaIso = tccData.defesaEm.split("T")[0];
            }
            if (defesaIso) {
              eventos.push({
                id: `defesa-${tccDoc.id}`,
                titulo: `Defesa de TCC: ${tccData.titulo}`,
                data: defesaIso,
                tipo: "DEFESA",
                descricao: `Sua apresentação perante a banca examinadora (${tccData.curso ?? "Curso"}).`,
                tccTitulo: tccData.titulo,
                tccId: tccDoc.id,
                responsavel: "Você e sua banca",
              });
            }
          }
        }
      }
    }

    // 3. Se for ORIENTADOR: buscar defesas dos TCCs que orienta
    if (sessao.perfil === PerfilEnum.ORIENTADOR) {
      const orientSnap = await adminDb.collection("professores_orientadores").where("usuario_id", "==", sessao.uid).get();
      if (!orientSnap.empty) {
        const orientId = orientSnap.docs[0].id;
        const tccsSnap = await adminDb.collection("tccs").where("orientador_id", "==", orientId).get();
        for (const tccDoc of tccsSnap.docs) {
          const tccData = tccDoc.data();
          if (tccData.defesaEm) {
            let defesaIso = "";
            if (tccData.defesaEm instanceof Timestamp) {
              defesaIso = tccData.defesaEm.toDate().toISOString().split("T")[0];
            } else if (typeof tccData.defesaEm === "string") {
              defesaIso = tccData.defesaEm.split("T")[0];
            }
            if (defesaIso) {
              eventos.push({
                id: `defesa-orient-${tccDoc.id}`,
                titulo: `Defesa de TCC: ${tccData.titulo}`,
                data: defesaIso,
                tipo: "DEFESA",
                descricao: `Orientando com defesa agendada.`,
                tccTitulo: tccData.titulo,
                tccId: tccDoc.id,
                responsavel: "Seu orientando",
              });
            }
          }
        }
      }
    }

    // 4. Se for AVALIADOR: buscar defesas que ele avalia
    if (sessao.perfil === PerfilEnum.AVALIADOR) {
      const tccsSnap = await adminDb.collection("tccs").where("avaliadoresUids", "array-contains", sessao.uid).get();
      for (const tccDoc of tccsSnap.docs) {
        const tccData = tccDoc.data();
        if (tccData.defesaEm) {
          let defesaIso = "";
          if (tccData.defesaEm instanceof Timestamp) {
            defesaIso = tccData.defesaEm.toDate().toISOString().split("T")[0];
          } else if (typeof tccData.defesaEm === "string") {
            defesaIso = tccData.defesaEm.split("T")[0];
          }
          if (defesaIso) {
            eventos.push({
              id: `defesa-banca-${tccDoc.id}`,
              titulo: `Banca de Avaliação: ${tccData.titulo}`,
              data: defesaIso,
              tipo: "DEFESA",
              descricao: `Avaliação do TCC perante a banca.`,
              tccTitulo: tccData.titulo,
              tccId: tccDoc.id,
              responsavel: "Membro da Banca",
            });
          }
        }
      }
    }

    // Ordenar cronologicamente
    eventos.sort((a, b) => a.data.localeCompare(b.data));

    return NextResponse.json({ eventos });
  } catch (error) {
    console.error("Erro ao carregar eventos do cronograma:", error);
    return NextResponse.json({ error: "SERVER_ERROR", message: "Erro ao buscar cronograma." }, { status: 500 });
  }
}
