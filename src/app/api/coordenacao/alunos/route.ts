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
    // 1. Busca todos os usuários com perfil ALUNO
    const [usuariosSnap, alunosSnap, tccsSnap] = await Promise.all([
      adminDb.collection("usuarios").where("perfil", "==", PerfilEnum.ALUNO).get(),
      adminDb.collection("alunos").get(),
      adminDb.collection("tccs").get(),
    ]);

    // Mapeamento de matrícula e dados da collection 'alunos'
    const alunosMap = new Map<string, { matricula: string; curso?: string; usuario_id?: string }>();
    alunosSnap.docs.forEach((doc) => {
      const data = doc.data();
      const matricula = data.matricula ?? doc.id;
      const uid = data.usuario_id ?? doc.id;
      alunosMap.set(uid, { matricula, curso: data.curso, usuario_id: uid });
      alunosMap.set(matricula, { matricula, curso: data.curso, usuario_id: uid });
    });

    // Mapeia TCCs já associados para informar se o aluno já tem TCC
    const tccsPorAluno = new Map<string, string[]>();
    tccsSnap.docs.forEach((doc) => {
      const data = doc.data();
      const aId = data.aluno_id;
      if (aId) {
        const arr = tccsPorAluno.get(aId) ?? [];
        arr.push(doc.id);
        tccsPorAluno.set(aId, arr);
      }
    });

    const listaAlunos: Array<{
      id: string; // usuario id
      matricula: string;
      nome: string;
      email: string;
      curso: string;
      temTcc: boolean;
      tccsCount: number;
    }> = [];

    // Prioriza usuários cadastrados
    usuariosSnap.docs.forEach((doc) => {
      const uData = doc.data();
      const alunoInfo = alunosMap.get(doc.id);
      const matricula = alunoInfo?.matricula ?? uData.matricula ?? doc.id;
      const curso = alunoInfo?.curso ?? uData.curso ?? "Engenharia de Software";
      const tccsCount = (tccsPorAluno.get(matricula)?.length ?? 0) + (tccsPorAluno.get(doc.id)?.length ?? 0);

      listaAlunos.push({
        id: doc.id,
        matricula,
        nome: uData.nome ?? "Aluno sem nome",
        email: uData.email ?? "",
        curso,
        temTcc: tccsCount > 0,
        tccsCount,
      });
    });

    // Adiciona também alunos que estejam na collection 'alunos' mas sem perfil em 'usuarios' (caso de seeds antigos)
    alunosSnap.docs.forEach((doc) => {
      const aData = doc.data();
      const matricula = aData.matricula ?? doc.id;
      const jaAdicionado = listaAlunos.some((a) => a.matricula === matricula || a.id === aData.usuario_id);
      if (!jaAdicionado) {
        const tccsCount = tccsPorAluno.get(matricula)?.length ?? 0;
        listaAlunos.push({
          id: aData.usuario_id ?? matricula,
          matricula,
          nome: aData.nome ?? `Aluno ${matricula}`,
          email: aData.email ?? "",
          curso: aData.curso ?? "Engenharia de Software",
          temTcc: tccsCount > 0,
          tccsCount,
        });
      }
    });

    listaAlunos.sort((a, b) => a.nome.localeCompare(b.nome));

    return NextResponse.json({ alunos: listaAlunos });
  } catch (error) {
    console.error("Erro ao listar alunos para a coordenação:", error);
    return NextResponse.json({ error: "SERVER_ERROR", message: "Erro ao buscar alunos." }, { status: 500 });
  }
}
