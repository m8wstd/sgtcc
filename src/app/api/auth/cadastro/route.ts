import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { homeDoPerfil } from "@/lib/auth/perfis";
import { validarSenhaSegura, validarEmail } from "@/lib/auth/cadastro-tokens";
import { PerfilEnum } from "@/types";

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

  // Restrição estrita de papéis: Somente ALUNO, ORIENTADOR, AVALIADOR e COORDENACAO são permitidos via convite
  const perfisPermitidos = [
    PerfilEnum.ALUNO,
    PerfilEnum.ORIENTADOR,
    PerfilEnum.AVALIADOR,
    PerfilEnum.COORDENACAO,
  ];
  if (!perfil || !perfisPermitidos.includes(perfil)) {
    return NextResponse.json(
      {
        error: "FORBIDDEN_ROLE",
        message: "O convite possui um papel de usuário inválido ou restrito.",
      },
      { status: 403 }
    );
  }

  // Validação sintática do e-mail
  if (!validarEmail(email)) {
    return NextResponse.json(
      { error: "INVALID_EMAIL", message: "O e-mail cadastrado no convite é inválido." },
      { status: 400 }
    );
  }

  const matriculaLimpa = matricula ? matricula.trim() : "";

  // Integridade de Matrícula e Prevenção de Colisão:
  // Se for ALUNO, a matrícula é obrigatória e deve ser única.
  // Se já existir registro em 'alunos/{matricula}', verifica se pertence a outro usuário para impedir roubo de TCC/vínculo.
  if (perfil === PerfilEnum.ALUNO) {
    if (!matriculaLimpa) {
      return NextResponse.json(
        { error: "MATRICULA_REQUIRED", message: "Matrícula é obrigatória para o cadastro de aluno." },
        { status: 400 }
      );
    }

    try {
      const alunoExistente = await adminDb.collection("alunos").doc(matriculaLimpa).get();
      if (alunoExistente.exists) {
        // Se a matrícula já existe, verifica se pertence ao mesmo usuário (caso de conclusão de cadastro)
        // Se pertencer a outro usuário, impede colisão e roubo de TCC
        const donoMatricula = alunoExistente.data()?.usuario_id;
        const usuarioDoc = await adminDb.collection("usuarios").where("email", "==", email.trim().toLowerCase()).limit(1).get();
        const usuarioExistenteId = !usuarioDoc.empty ? usuarioDoc.docs[0].id : null;

        if (donoMatricula && donoMatricula !== usuarioExistenteId) {
          return NextResponse.json(
            {
              error: "MATRICULA_ALREADY_IN_USE",
              message: "Esta matrícula já está associada a outro aluno na plataforma.",
            },
            { status: 409 }
          );
        }
      }
    } catch (err) {
      console.error("Erro ao verificar duplicidade de matrícula:", err);
      return NextResponse.json(
        { error: "DB_ERROR", message: "Erro ao validar unicidade da matrícula." },
        { status: 503 }
      );
    }
  }

  let uid: string | null = null;
  let usuarioJaExistiaNoAuth = false;
  const docsCriados: { collection: string; id: string }[] = [];

  try {
    // 4. Cria o usuário no Firebase Auth (ou atualiza a senha caso o usuário já tenha sido pré-registrado)
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
        // Se o usuário já existia no Auth (ex: criado previamente pelo admin para conclusão posterior),
        // busca o UID e atualiza a senha para concluir o cadastro com sucesso
        try {
          const usuarioAuthExistente = await adminAuth.getUserByEmail(email.trim().toLowerCase());
          uid = usuarioAuthExistente.uid;
          usuarioJaExistiaNoAuth = true;
          await adminAuth.updateUser(uid, {
            password,
            displayName: nome.trim(),
            emailVerified: true,
          });
        } catch {
          return NextResponse.json(
            { error: "EMAIL_EXISTS", message: "Este e-mail institucional já está cadastrado no sistema." },
            { status: 409 }
          );
        }
      } else {
        throw authError;
      }
    }

    // 5. Define Custom Claims
    await adminAuth.setCustomUserClaims(uid, {
      perfil,
      ...(perfil === PerfilEnum.ALUNO && matriculaLimpa && { matricula: matriculaLimpa }),
    });

    // 6. Transação / Gravação no Firestore com Rollback compensatório
    const batch = adminDb.batch();

    // 6.1 Salva documento na coleção usuarios
    const userRef = adminDb.collection("usuarios").doc(uid);
    batch.set(userRef, {
      id: uid,
      nome: nome.trim(),
      email: email.trim().toLowerCase(),
      perfil,
      matricula: matriculaLimpa,
      ...(curso && { curso: curso.trim() }),
      ...(cursosCoordenados && { cursosCoordenados }),
      criadoEm: new Date().toISOString(),
    });
    docsCriados.push({ collection: "usuarios", id: uid });

    // 6.2 Salva registro estritamente na tabela do papel específico
    // Regra de Integridade: Apenas ALUNO pode ter registro na coleção 'alunos'
    if (perfil === PerfilEnum.ALUNO && matriculaLimpa) {
      const alunoRef = adminDb.collection("alunos").doc(matriculaLimpa);
      batch.set(alunoRef, {
        matricula: matriculaLimpa,
        usuario_id: uid,
      });
      docsCriados.push({ collection: "alunos", id: matriculaLimpa });
    } else if (perfil === PerfilEnum.ORIENTADOR) {
      const orientadorRef = adminDb.collection("professores_orientadores").doc(uid);
      batch.set(orientadorRef, {
        id: uid,
        usuario_id: uid,
      });
      docsCriados.push({ collection: "professores_orientadores", id: uid });
    } else if (perfil === PerfilEnum.AVALIADOR) {
      const avaliadorRef = adminDb.collection("professores_avaliadores").doc(uid);
      batch.set(avaliadorRef, {
        id: uid,
        usuario_id: uid,
      });
      docsCriados.push({ collection: "professores_avaliadores", id: uid });
    } else if (perfil === PerfilEnum.COORDENACAO) {
      const coordenadorRef = adminDb.collection("coordenadores").doc(uid);
      batch.set(coordenadorRef, {
        id: uid,
        usuario_id: uid,
        cursos: cursosCoordenados ?? [curso ?? "Engenharia de Software"],
      });
      docsCriados.push({ collection: "coordenadores", id: uid });
    }

    // 6.3 Queima o token
    batch.update(conviteDoc.ref, {
      usado: true,
      usadoEm: new Date().toISOString(),
      usuarioCriadoId: uid,
    });

    // Executa as gravações no banco atomicamente
    await batch.commit();

    return NextResponse.json({
      success: true,
      message: "Cadastro concluído com sucesso!",
      redirectTo: homeDoPerfil(perfil),
      user: {
        uid,
        email,
        nome,
        perfil,
        matricula: matriculaLimpa,
      },
    });
  } catch (error) {
    console.error("Erro no cadastro via token (iniciando compensação/rollback):", error);

    // Rollback / Compensação para não deixar o e-mail preso nem documentos órfãos
    // Se o usuário já existia no Auth antes deste cadastro, não o deletamos
    if (uid && !usuarioJaExistiaNoAuth) {
      try {
        await adminAuth.deleteUser(uid);
        console.log(`Compensação executada com sucesso: usuário ${uid} removido do Auth.`);
      } catch (authDelErr) {
        console.error(`Falha no rollback do Firebase Auth para o usuário ${uid}:`, authDelErr);
      }

      // Limpa documentos do Firestore que possam ter sido criados parcialmente
      for (const item of docsCriados) {
        try {
          await adminDb.collection(item.collection).doc(item.id).delete();
        } catch (cleanupErr) {
          console.error(`Falha na limpeza do doc ${item.collection}/${item.id}:`, cleanupErr);
        }
      }
    }

    return NextResponse.json(
      {
        error: "SERVER_ERROR",
        message: "Erro ao concluir cadastro. As etapas parciais foram revertidas com segurança. Tente novamente.",
      },
      { status: 500 }
    );
  }
}
