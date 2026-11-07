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

  const { id, nome, email, password, perfil, cursosCoordenados, matricula, curso } =
    (body as {
      id?: string;
      nome?: string;
      email?: string;
      password?: string;
      perfil?: PerfilEnum;
      cursosCoordenados?: string[];
      matricula?: string;
      curso?: string;
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
        ...(matricula && { matricula: matricula.trim() }),
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
    if (matricula) dadosUsuario.matricula = matricula.trim();
    if (curso) dadosUsuario.curso = curso.trim();
    if (cursosCoordenados) dadosUsuario.cursosCoordenados = cursosCoordenados;

    await adminDb.collection("usuarios").doc(id).set(dadosUsuario, { merge: true });

    // 3. Atualiza na tabela específica do papel
    if (perfil === PerfilEnum.COORDENACAO) {
      await adminDb.collection("coordenadores").doc(id).set(
        {
          id,
          usuario_id: id,
          cursos: cursosCoordenados ?? [],
        },
        { merge: true }
      );
    } else if (perfil === PerfilEnum.ALUNO && matricula) {
      await adminDb.collection("alunos").doc(matricula.trim()).set(
        {
          matricula: matricula.trim(),
          usuario_id: id,
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
