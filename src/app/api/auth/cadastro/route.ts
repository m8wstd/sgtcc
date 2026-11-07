import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { homeDoPerfil } from "@/lib/auth/perfis";
import { validarSenhaSegura, validarEmail } from "@/lib/auth/cadastro-tokens";
import type { PerfilEnum } from "@/types";

export async function POST(request: Request) {
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

  const { token, password } = (body as { token?: string; password?: string }) ?? {};

  if (!token) {
    return NextResponse.json(
      {
        error: "TOKEN_REQUIRED",
        message: "O cadastro na plataforma requer um convite ou link válido emitido pela administração.",
      },
      { status: 403 }
    );
  }

  if (!password) {
    return NextResponse.json(
      { error: "PASSWORD_REQUIRED", message: "Defina sua senha de acesso." },
      { status: 400 }
    );
  }

  // Validação de senha segura:
  // - Pelo menos 8 caracteres, no máximo 32
  // - Pelo menos 1 maiúscula, 1 minúscula, 1 número, 1 símbolo
  const validacao = validarSenhaSegura(password);
  if (!validacao.valida) {
    return NextResponse.json(
      {
        error: "WEAK_PASSWORD",
        message: validacao.erros[0] || "A senha não atende aos requisitos de segurança.",
        erros: validacao.erros,
      },
      { status: 400 }
    );
  }

  // 1. Busca o token no banco
  let conviteDoc;
  try {
    conviteDoc = await adminDb.collection("convites_cadastro").doc(token).get();
  } catch (err) {
    console.error("Erro ao buscar convite:", err);
    return NextResponse.json({ error: "DB_ERROR", message: "Erro ao consultar token." }, { status: 500 });
  }

  if (!conviteDoc.exists) {
    return NextResponse.json(
      {
        error: "INVALID_TOKEN",
        message: "Link de cadastro inválido ou não encontrado. Solicite um novo link ao administrador.",
      },
      { status: 404 }
    );
  }

  const convite = conviteDoc.data();
  if (!convite) {
    return NextResponse.json({ error: "INVALID_TOKEN", message: "Convite corrompido." }, { status: 400 });
  }

  // 2. Se alguém se cadastra, queima o token!
  if (convite.usado) {
    return NextResponse.json(
      {
        error: "TOKEN_ALREADY_USED",
        message: "Este link de convite já foi utilizado para cadastro e foi queimado.",
      },
      { status: 410 }
    );
  }

  // 3. Se alguém ignora o link por mais de uma semana, também queima o token!
  const agora = Date.now();
  const dataExpira = convite.expiraEm ? new Date(convite.expiraEm).getTime() : 0;
  if (dataExpira < agora) {
    // Queima o token expirado
    await conviteDoc.ref.update({ usado: true, expirado: true });
    return NextResponse.json(
      {
        error: "TOKEN_EXPIRED",
        message: "Este link de convite expirou (validade máxima de 1 semana) e foi queimado. Solicite novo link ao administrador.",
      },
      { status: 410 }
    );
  }

  const { nome, email, perfil, matricula, curso, cursosCoordenados } = convite as {
    nome: string;
    email: string;
    perfil: PerfilEnum;
    matricula: string;
    curso?: string;
    cursosCoordenados?: string[];
  };

  // Validação sintática do e-mail
  if (!validarEmail(email)) {
    return NextResponse.json(
      { error: "INVALID_EMAIL", message: "O e-mail cadastrado no convite é inválido." },
      { status: 400 }
    );
  }

  try {
    // 4. Cria o usuário no Firebase Auth
    let uid: string;
    try {
      const userRecord = await adminAuth.createUser({
        email: email.trim().toLowerCase(),
        password,
        displayName: nome.trim(),
        emailVerified: true,
      });
      uid = userRecord.uid;
    } catch (authError: unknown) {
      const err = authError as { code?: string; message?: string };
      if (err.code === "auth/email-already-exists") {
        return NextResponse.json(
          { error: "EMAIL_EXISTS", message: "Este e-mail institucional já está cadastrado no sistema." },
          { status: 409 }
        );
      }
      throw authError;
    }

    // 5. Define Custom Claims
    await adminAuth.setCustomUserClaims(uid, {
      perfil,
      ...(matricula && { matricula: matricula.trim() }),
    });

    // 6. Salva documento na coleção usuarios
    await adminDb.collection("usuarios").doc(uid).set({
      id: uid,
      nome: nome.trim(),
      email: email.trim().toLowerCase(),
      perfil,
      matricula: matricula.trim(),
      ...(curso && { curso: curso.trim() }),
      ...(cursosCoordenados && { cursosCoordenados }),
      criadoEm: new Date().toISOString(),
    });

    // 7. Salva registro na tabela de papel específico
    if (perfil === "ALUNO" && matricula) {
      await adminDb.collection("alunos").doc(matricula).set({
        matricula,
        usuario_id: uid,
      });
    } else if (perfil === "ORIENTADOR") {
      await adminDb.collection("professores_orientadores").doc(uid).set({
        id: uid,
        usuario_id: uid,
      });
    } else if (perfil === "AVALIADOR") {
      await adminDb.collection("professores_avaliadores").doc(uid).set({
        id: uid,
        usuario_id: uid,
      });
    } else if (perfil === "COORDENACAO") {
      await adminDb.collection("coordenadores").doc(uid).set({
        id: uid,
        usuario_id: uid,
        cursos: cursosCoordenados ?? [curso ?? "Engenharia de Software"],
      });
    }

    // 8. Queima o token
    await conviteDoc.ref.update({
      usado: true,
      usadoEm: new Date().toISOString(),
      usuarioCriadoId: uid,
    });

    return NextResponse.json({
      success: true,
      message: "Cadastro concluído com sucesso!",
      redirectTo: homeDoPerfil(perfil),
      user: {
        uid,
        email,
        nome,
        perfil,
        matricula,
      },
    });
  } catch (error) {
    console.error("Erro no cadastro via token:", error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Erro ao concluir cadastro." },
      { status: 500 }
    );
  }
}
