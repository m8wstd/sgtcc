import { NextResponse } from "next/server";
import { requireSessao } from "@/lib/auth/server-session";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { PerfilEnum } from "@/types";
import { validarSenhaSegura, validarEmail } from "@/lib/auth/cadastro-tokens";

export async function PUT(request: Request) {
  const sessao = await requireSessao(PerfilEnum.ADMIN);
  if (!sessao) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "Acesso negado." }, { status: 403 });
  }

  if (!adminAuth || !adminDb) {
    return NextResponse.json(
      { error: "CONFIG_ERROR", message: "Serviço Firebase Admin indisponível." },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "INVALID_REQUEST", message: "Corpo da requisição inválido." },
      { status: 400 }
    );
  }

  const { id, nome, email, password, perfil, cursosCoordenados, matricula, curso, cursos } =
    (body as {
      id?: string;
      nome?: string;
      email?: string;
      password?: string;
      perfil?: PerfilEnum;
      cursosCoordenados?: string[];
      matricula?: string;
      curso?: string;
      cursos?: string[];
    }) ?? {};

  if (!id || !nome || !email || !perfil) {
    return NextResponse.json(
      { error: "MISSING_FIELDS", message: "ID, nome, email e perfil são obrigatórios." },
      { status: 400 }
    );
  }

  const emailLimpo = email.trim().toLowerCase();
  if (!validarEmail(emailLimpo)) {
    return NextResponse.json(
      { error: "INVALID_EMAIL", message: "Formato de e-mail inválido." },
      { status: 400 }
    );
  }

  // Se o admin definiu uma nova senha para o usuário
  if (password && password.trim()) {
    const validacaoSenha = validarSenhaSegura(password.trim());
    if (!validacaoSenha.valida) {
      return NextResponse.json(
        { error: "WEAK_PASSWORD", message: validacaoSenha.erros[0] },
        { status: 400 }
      );
    }
  }

  // Se for atribuir matrícula a ALUNO, valida se a matrícula já pertence a outro usuário
  const matriculaLimpa = matricula?.trim();
  if (perfil === PerfilEnum.ALUNO && matriculaLimpa) {
    const snapExistente = await adminDb.collection("alunos").doc(matriculaLimpa).get();
    if (snapExistente.exists) {
      const alunoData = snapExistente.data();
      if (alunoData?.usuario_id && alunoData.usuario_id !== id) {
        return NextResponse.json(
          {
            error: "MATRICULA_ALREADY_IN_USE",
            message: "Esta matrícula já está associada a outro aluno no sistema.",
          },
          { status: 409 }
        );
      }
    }
  }

  try {
    // 1. Atualiza no Firebase Auth (nome, e-mail e opcionalmente senha)
    try {
      const updatePayload: { displayName: string; email: string; password?: string } = {
        displayName: nome.trim(),
        email: emailLimpo,
      };
      if (password && password.trim()) {
        updatePayload.password = password.trim();
      }

      await adminAuth.updateUser(id, updatePayload);
      await adminAuth.setCustomUserClaims(id, {
        perfil,
        ...(perfil === PerfilEnum.ALUNO && matriculaLimpa && { matricula: matriculaLimpa }),
      });
    } catch (authError) {
      console.warn("Usuário não encontrado no Auth ou erro ao atualizar dados de autenticação:", authError);
    }

    // 2. Atualiza documento na coleção usuarios
    const dadosUsuario: Record<string, unknown> = {
      id,
      nome: nome.trim(),
      email: emailLimpo,
      perfil,
    };
    if (matriculaLimpa) dadosUsuario.matricula = matriculaLimpa;
    if (curso) dadosUsuario.curso = curso.trim();
    if (cursos) dadosUsuario.cursos = cursos;
    if (cursosCoordenados) dadosUsuario.cursosCoordenados = cursosCoordenados;

    await adminDb.collection("usuarios").doc(id).set(dadosUsuario, { merge: true });

    // 3. Atualiza na tabela específica do papel
    if (perfil === PerfilEnum.COORDENACAO) {
      await adminDb.collection("coordenadores").doc(id).set(
        {
          id,
          usuario_id: id,
          cursos: cursosCoordenados ?? cursos ?? [],
        },
        { merge: true }
      );
    } else if (perfil === PerfilEnum.ALUNO && matriculaLimpa) {
      await adminDb.collection("alunos").doc(matriculaLimpa).set(
        {
          matricula: matriculaLimpa,
          usuario_id: id,
          curso: curso ? curso.trim() : undefined,
        },
        { merge: true }
      );
    } else if (perfil === PerfilEnum.ORIENTADOR) {
      await adminDb.collection("professores_orientadores").doc(id).set(
        {
          id,
          usuario_id: id,
          nome: nome.trim(),
          email: emailLimpo,
          cursos: cursos ?? [],
        },
        { merge: true }
      );
    } else if (perfil === PerfilEnum.AVALIADOR) {
      await adminDb.collection("professores_avaliadores").doc(id).set(
        {
          id,
          usuario_id: id,
          nome: nome.trim(),
          email: emailLimpo,
          cursos: cursos ?? [],
        },
        { merge: true }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Usuário e permissões atualizados com sucesso!",
      usuario: dadosUsuario,
    });
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Falha ao salvar alterações do usuário." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const sessao = await requireSessao(PerfilEnum.ADMIN);
  if (!sessao) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "Acesso negado." }, { status: 403 });
  }

  if (!adminAuth || !adminDb) {
    return NextResponse.json(
      { error: "CONFIG_ERROR", message: "Serviço Firebase Admin indisponível." },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "INVALID_REQUEST", message: "Corpo da requisição inválido." },
      { status: 400 }
    );
  }

  const { id } = (body as { id?: string }) ?? {};
  if (!id || typeof id !== "string") {
    return NextResponse.json(
      { error: "MISSING_ID", message: "ID do usuário é obrigatório." },
      { status: 400 }
    );
  }

  // Impede que o próprio admin logado se exclua
  if (id === sessao.usuario.id) {
    return NextResponse.json(
      { error: "CANNOT_DELETE_SELF", message: "Você não pode excluir sua própria conta de administrador." },
      { status: 400 }
    );
  }

  try {
    // 1. Busca dados do usuário para identificar coleções filhas
    const userDoc = await adminDb.collection("usuarios").doc(id).get();
    const dados = userDoc.data();
    const perfil = dados?.perfil as PerfilEnum | undefined;
    const matricula = dados?.matricula as string | undefined;

    // 2. Remove do Firebase Auth
    try {
      await adminAuth.deleteUser(id);
    } catch (authError) {
      console.warn("Usuário não encontrado no Auth ou já deletado:", authError);
    }

    // 3. Remove das coleções específicas do papel
    const batch = adminDb.batch();

    // Remove da coleção principal usuarios
    batch.delete(adminDb.collection("usuarios").doc(id));

    // Remove de alunos
    if (matricula) {
      batch.delete(adminDb.collection("alunos").doc(matricula));
    }
    // Procura também por usuario_id caso o id do doc não seja a matrícula
    const snapAlunos = await adminDb.collection("alunos").where("usuario_id", "==", id).get();
    snapAlunos.docs.forEach((doc) => batch.delete(doc.ref));

    // Remove de professores_orientadores
    batch.delete(adminDb.collection("professores_orientadores").doc(id));
    const snapOrientadores = await adminDb.collection("professores_orientadores").where("usuario_id", "==", id).get();
    snapOrientadores.docs.forEach((doc) => batch.delete(doc.ref));

    // Remove de professores_avaliadores
    batch.delete(adminDb.collection("professores_avaliadores").doc(id));
    const snapAvaliadores = await adminDb.collection("professores_avaliadores").where("usuario_id", "==", id).get();
    snapAvaliadores.docs.forEach((doc) => batch.delete(doc.ref));

    // Remove de coordenadores
    batch.delete(adminDb.collection("coordenadores").doc(id));
    const snapCoordenadores = await adminDb.collection("coordenadores").where("usuario_id", "==", id).get();
    snapCoordenadores.docs.forEach((doc) => batch.delete(doc.ref));

    // Executa a remoção atômica
    await batch.commit();

    return NextResponse.json({
      success: true,
      message: "Conta e dados do usuário excluídos com sucesso!",
    });
  } catch (error) {
    console.error("Erro ao excluir usuário:", error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Falha ao excluir a conta do usuário." },
      { status: 500 }
    );
  }
}
