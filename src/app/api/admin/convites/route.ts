import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { requireSessao } from "@/lib/auth/server-session";
import { PerfilEnum } from "@/types";
import {
  validarEmail,
  validarSenhaSegura,
  gerarTokenConvite,
  gerarMatriculaAluno,
  gerarMatriculaProfessorOuCoordenador,
} from "@/lib/auth/cadastro-tokens";

export interface ConviteCadastroDoc {
  id: string; // token
  nome: string;
  email: string;
  perfil: PerfilEnum;
  matricula: string;
  curso?: string;
  cursosCoordenados?: string[];
  enviarEmail: boolean;
  emailEnviado?: boolean;
  criadoPor: string;
  criadoEm: string;
  expiraEm: string; // ISO date (7 dias a partir de criadoEm)
  usado: boolean;
  usadoEm?: string;
}

// GET: Consulta convite de um usuário específico (por ?email=) ou lista os últimos 50 convites (Apenas ADMIN)
export async function GET(request: Request) {
  const sessao = await requireSessao(PerfilEnum.ADMIN);
  if (!sessao) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "Acesso negado." }, { status: 403 });
  }

  if (!adminDb) {
    return NextResponse.json({ error: "CONFIG_ERROR", message: "Firebase indisponível" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const emailParam = searchParams.get("email");

  try {
    if (emailParam) {
      const emailLimpo = emailParam.trim().toLowerCase();
      // Não combinamos where("email") com where("usado") e orderBy("criadoEm") para evitar necessidade de índice composto
      const snap = await adminDb
        .collection("convites_cadastro")
        .where("email", "==", emailLimpo)
        .get();

      if (snap.empty) {
        return NextResponse.json({ convite: null });
      }

      // Filtra em memória os convites não usados e pega o mais recente
      const convitesValidos = snap.docs
        .map((d) => ({ doc: d, data: d.data() as ConviteCadastroDoc }))
        .filter((item) => !item.data.usado)
        .sort((a, b) => new Date(b.data.criadoEm).getTime() - new Date(a.data.criadoEm).getTime());

      if (convitesValidos.length === 0) {
        return NextResponse.json({ convite: null });
      }

      const { doc, data } = convitesValidos[0];
      const agora = Date.now();
      const expira = data.expiraEm ? new Date(data.expiraEm).getTime() : 0;

      // Se expirou, queima o convite e retorna null (não deve aparecer)
      if (expira < agora) {
        await doc.ref.update({ usado: true, expirado: true });
        return NextResponse.json({ convite: null });
      }

      return NextResponse.json({
        convite: {
          ...data,
          id: doc.id,
        },
      });
    }

    const snap = await adminDb.collection("convites_cadastro").orderBy("criadoEm", "desc").limit(50).get();
    const convites = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ convites });
  } catch (error) {
    console.error("Erro ao consultar convites:", error);
    return NextResponse.json({ convites: [], convite: null });
  }
}

// POST: Admin cria uma solicitação de cadastro OU cadastra o usuário diretamente se informar a senha
export async function POST(request: Request) {
  const sessao = await requireSessao(PerfilEnum.ADMIN);
  if (!sessao) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "Apenas administradores podem cadastrar usuários." }, { status: 403 });
  }

  if (!adminDb || !adminAuth) {
    return NextResponse.json({ error: "CONFIG_ERROR", message: "Firebase indisponível" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_REQUEST", message: "Corpo inválido." }, { status: 400 });
  }

  const {
    nome,
    email,
    password,
    perfil,
    matricula,
    curso,
    cursosCoordenados,
    enviarEmail = true,
  } = (body as {
    nome?: string;
    email?: string;
    password?: string;
    perfil?: PerfilEnum;
    matricula?: string;
    curso?: string;
    cursosCoordenados?: string[];
    enviarEmail?: boolean;
  }) ?? {};

  if (!nome || !email || !perfil) {
    return NextResponse.json(
      { error: "MISSING_FIELDS", message: "Nome, e-mail e perfil são obrigatórios." },
      { status: 400 }
    );
  }

  const emailLimpo = email.trim().toLowerCase();
  if (!validarEmail(emailLimpo)) {
    return NextResponse.json(
      { error: "INVALID_EMAIL", message: "Formato de e-mail inválido ou inexistente." },
      { status: 400 }
    );
  }

  // Verifica se o e-mail já existe na base de usuários cadastrados
  // Nota: Se for uma solicitação de geração de link de conclusão de cadastro (gerarLinkConclusao = true),
  // permitimos gerar link para um usuário já cadastrado que ainda precisa definir/concluir sua senha ou cadastro.
  const { gerarLinkConclusao } = (body as { gerarLinkConclusao?: boolean }) ?? {};

  try {
    const usuarioExistente = await adminDb.collection("usuarios").where("email", "==", emailLimpo).limit(1).get();
    if (!usuarioExistente.empty && !gerarLinkConclusao) {
      return NextResponse.json(
        { error: "EMAIL_EXISTS", message: "Este e-mail já possui uma conta ativa na plataforma." },
        { status: 409 }
      );
    }
  } catch (err) {
    console.warn("Erro ao checar e-mail duplicado:", err);
  }

  // Validação e unicidade da matrícula
  let matriculaFinal = matricula?.trim();
  if (matriculaFinal) {
    if (perfil === PerfilEnum.ALUNO) {
      const snapAluno = await adminDb.collection("alunos").doc(matriculaFinal).get();
      if (snapAluno.exists) {
        // Se for geração de link de cadastro para usuário existente, verifica se a matrícula pertence a ele
        const donoMatricula = snapAluno.data()?.usuario_id;
        const usuarioDoc = await adminDb.collection("usuarios").where("email", "==", emailLimpo).limit(1).get();
        const usuarioExistenteId = !usuarioDoc.empty ? usuarioDoc.docs[0].id : null;

        if (donoMatricula && donoMatricula !== usuarioExistenteId) {
          return NextResponse.json(
            { error: "MATRICULA_ALREADY_IN_USE", message: "Esta matrícula já está associada a outro aluno no sistema." },
            { status: 409 }
          );
        }
      }
    }
  } else {
    if (perfil === PerfilEnum.ALUNO) {
      matriculaFinal = gerarMatriculaAluno();
      try {
        let existe = await adminDb.collection("alunos").doc(matriculaFinal).get();
        while (existe.exists) {
          matriculaFinal = gerarMatriculaAluno();
          existe = await adminDb.collection("alunos").doc(matriculaFinal).get();
        }
      } catch {
        // continua
      }
    } else {
      matriculaFinal = gerarMatriculaProfessorOuCoordenador();
      try {
        let existe = await adminDb.collection("usuarios").where("matricula", "==", matriculaFinal).limit(1).get();
        while (!existe.empty) {
          matriculaFinal = gerarMatriculaProfessorOuCoordenador();
          existe = await adminDb.collection("usuarios").where("matricula", "==", matriculaFinal).limit(1).get();
        }
      } catch {
        // continua
      }
    }
  }

  // Se o admin já forneceu a senha no cadastro:
  const senhaInformada = password?.trim();
  if (senhaInformada) {
    const validacao = validarSenhaSegura(senhaInformada);
    if (!validacao.valida) {
      return NextResponse.json(
        { error: "WEAK_PASSWORD", message: validacao.erros[0] },
        { status: 400 }
      );
    }

    // Cria o usuário no Firebase Auth com compensação atômica em caso de falha no Firestore
    let uid: string;
    try {
      const userRecord = await adminAuth.createUser({
        email: emailLimpo,
        password: senhaInformada,
        displayName: nome.trim(),
        emailVerified: true,
      });
      uid = userRecord.uid;
    } catch (authError: unknown) {
      const err = authError as { code?: string; message?: string };
      if (err.code === "auth/email-already-exists") {
        return NextResponse.json(
          { error: "EMAIL_EXISTS", message: "Este e-mail já está cadastrado no sistema." },
          { status: 409 }
        );
      }
      throw authError;
    }

    try {
      await adminAuth.setCustomUserClaims(uid, {
        perfil,
        ...(matriculaFinal && { matricula: matriculaFinal }),
      });

      const dadosUsuario: Record<string, unknown> = {
        id: uid,
        nome: nome.trim(),
        email: emailLimpo,
        perfil,
        matricula: matriculaFinal,
        criadoEm: new Date().toISOString(),
      };
      if (curso && curso.trim()) {
        dadosUsuario.curso = curso.trim();
      }
      if (perfil === PerfilEnum.COORDENACAO) {
        dadosUsuario.cursosCoordenados = cursosCoordenados && cursosCoordenados.length > 0
          ? cursosCoordenados
          : ["Engenharia de Software"];
      }

      const batch = adminDb.batch();
      batch.set(adminDb.collection("usuarios").doc(uid), dadosUsuario);

      if (perfil === PerfilEnum.ALUNO) {
        batch.set(adminDb.collection("alunos").doc(matriculaFinal), {
          matricula: matriculaFinal,
          usuario_id: uid,
        });
      } else if (perfil === PerfilEnum.ORIENTADOR) {
        batch.set(adminDb.collection("professores_orientadores").doc(uid), {
          id: uid,
          usuario_id: uid,
        });
      } else if (perfil === PerfilEnum.AVALIADOR) {
        batch.set(adminDb.collection("professores_avaliadores").doc(uid), {
          id: uid,
          usuario_id: uid,
        });
      } else if (perfil === PerfilEnum.COORDENACAO) {
        batch.set(adminDb.collection("coordenadores").doc(uid), {
          id: uid,
          usuario_id: uid,
          cursos: cursosCoordenados ?? ["Engenharia de Software"],
        });
      }

      await batch.commit();

      return NextResponse.json({
        success: true,
        message: "Usuário cadastrado com sucesso com a senha configurada pelo Administrador!",
        usuarioCriado: dadosUsuario,
      });
    } catch (saveError) {
      console.error("Falha ao salvar usuário no Firestore após criação no Auth. Compensando:", saveError);
      try {
        await adminAuth.deleteUser(uid);
      } catch (delErr) {
        console.error("Falha ao deletar usuário do Auth durante rollback:", delErr);
      }
      return NextResponse.json(
        { error: "SERVER_ERROR", message: "Erro ao registrar usuário no banco de dados. O e-mail foi liberado para nova tentativa." },
        { status: 500 }
      );
    }
  }

  // Se não forneceu senha, gera token de convite para o usuário criar a senha
  const token = gerarTokenConvite();
  const agora = new Date();
  const expira = new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 dias (1 semana)

  // Se for gerar um novo convite para um e-mail, invalida/queima convites anteriores pendentes para o mesmo e-mail
  try {
    const convitesAntigos = await adminDb
      .collection("convites_cadastro")
      .where("email", "==", emailLimpo)
      .get();

    for (const doc of convitesAntigos.docs) {
      if (!doc.data().usado) {
        await doc.ref.update({ usado: true, substituidoPor: token });
      }
    }
  } catch (err) {
    console.warn("Aviso ao invalidar convites anteriores:", err);
  }

  const convite: Record<string, unknown> = {
    id: token,
    nome: nome.trim(),
    email: emailLimpo,
    perfil,
    matricula: matriculaFinal,
    enviarEmail: Boolean(enviarEmail),
    emailEnviado: false,
    criadoPor: sessao.usuario.id,
    criadoEm: agora.toISOString(),
    expiraEm: expira.toISOString(),
    usado: false,
  };

  if (curso && curso.trim()) {
    convite.curso = curso.trim();
  } else if (perfil === PerfilEnum.ALUNO) {
    convite.curso = "Engenharia de Software";
  }

  if (perfil === PerfilEnum.COORDENACAO) {
    convite.cursosCoordenados = cursosCoordenados && cursosCoordenados.length > 0
      ? cursosCoordenados
      : ["Engenharia de Software"];
  }

  try {
    await adminDb.collection("convites_cadastro").doc(token).set(convite);
  } catch (error) {
    console.error("Erro ao salvar convite:", error);
    return NextResponse.json({ error: "SAVE_ERROR", message: "Não foi possível gerar o link de cadastro." }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: enviarEmail
      ? "Solicitação criada! O envio por e-mail foi agendado e o link está disponível abaixo para compartilhamento imediato."
      : "Solicitação criada sem envio de e-mail! O link exclusivo está pronto para compartilhamento manual pelo Admin.",
    token,
    convite,
  });
}
