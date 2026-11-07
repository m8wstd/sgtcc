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

// GET: Lista todos os convites pendentes/gerados (Apenas ADMIN)
export async function GET() {
  const sessao = await requireSessao(PerfilEnum.ADMIN);
  if (!sessao) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "Acesso negado." }, { status: 403 });
  }

  if (!adminDb) {
    return NextResponse.json({ error: "CONFIG_ERROR", message: "Firebase indisponível" }, { status: 503 });
  }

  try {
    const snap = await adminDb.collection("convites_cadastro").orderBy("criadoEm", "desc").limit(50).get();
    const convites = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ convites });
  } catch (error) {
    console.error("Erro ao listar convites:", error);
    return NextResponse.json({ convites: [] });
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
  try {
    const usuarioExistente = await adminDb.collection("usuarios").where("email", "==", emailLimpo).limit(1).get();
    if (!usuarioExistente.empty) {
      return NextResponse.json(
        { error: "EMAIL_EXISTS", message: "Este e-mail já possui uma conta ativa na plataforma." },
        { status: 409 }
      );
    }
  } catch (err) {
    console.warn("Erro ao checar e-mail duplicado:", err);
  }

  // Define ou gera matrícula única com base na regra de negócio
  let matriculaFinal = matricula?.trim();
  if (!matriculaFinal) {
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

    // Cria o usuário imediatamente no Firebase Auth e nas tabelas
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

    await adminAuth.setCustomUserClaims(uid, {
      perfil,
      ...(matriculaFinal && { matricula: matriculaFinal }),
    });

    const dadosUsuario = {
      id: uid,
      nome: nome.trim(),
      email: emailLimpo,
      perfil,
      matricula: matriculaFinal,
      curso: curso ? curso.trim() : undefined,
      cursosCoordenados: perfil === PerfilEnum.COORDENACAO ? (cursosCoordenados ?? ["Engenharia de Software"]) : undefined,
      criadoEm: new Date().toISOString(),
    };

    await adminDb.collection("usuarios").doc(uid).set(dadosUsuario);

    if (perfil === PerfilEnum.ALUNO) {
      await adminDb.collection("alunos").doc(matriculaFinal).set({
        matricula: matriculaFinal,
        usuario_id: uid,
      });
    } else if (perfil === PerfilEnum.ORIENTADOR) {
      await adminDb.collection("professores_orientadores").doc(uid).set({
        id: uid,
        usuario_id: uid,
      });
    } else if (perfil === PerfilEnum.AVALIADOR) {
      await adminDb.collection("professores_avaliadores").doc(uid).set({
        id: uid,
        usuario_id: uid,
      });
    } else if (perfil === PerfilEnum.COORDENACAO) {
      await adminDb.collection("coordenadores").doc(uid).set({
        id: uid,
        usuario_id: uid,
        cursos: cursosCoordenados ?? ["Engenharia de Software"],
      });
    }

    return NextResponse.json({
      success: true,
      message: "Usuário cadastrado com sucesso com a senha configurada pelo Administrador!",
      usuarioCriado: dadosUsuario,
    });
  }

  // Se não forneceu senha, gera token de convite para o usuário criar a senha
  const token = gerarTokenConvite();
  const agora = new Date();
  const expira = new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 dias (1 semana)

  const convite: ConviteCadastroDoc = {
    id: token,
    nome: nome.trim(),
    email: emailLimpo,
    perfil,
    matricula: matriculaFinal,
    curso: curso ? curso.trim() : (perfil === PerfilEnum.ALUNO ? "Engenharia de Software" : undefined),
    cursosCoordenados: perfil === PerfilEnum.COORDENACAO ? (cursosCoordenados || ["Engenharia de Software"]) : undefined,
    enviarEmail: Boolean(enviarEmail),
    emailEnviado: false,
    criadoPor: sessao.usuario.id,
    criadoEm: agora.toISOString(),
    expiraEm: expira.toISOString(),
    usado: false,
  };

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
