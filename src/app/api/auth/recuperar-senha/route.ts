import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { validarEmail, gerarTokenConvite } from "@/lib/auth/cadastro-tokens";

// POST /api/auth/recuperar-senha
export async function POST(request: Request) {
  if (!adminDb) {
    return NextResponse.json(
      { error: "CONFIG_ERROR", message: "Serviço Firebase indisponível." },
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

  const { email } = (body as { email?: string }) ?? {};

  if (!email) {
    return NextResponse.json(
      { error: "EMAIL_REQUIRED", message: "Informe seu e-mail institucional." },
      { status: 400 }
    );
  }

  const emailLimpo = email.trim().toLowerCase();
  if (!validarEmail(emailLimpo)) {
    return NextResponse.json(
      { error: "INVALID_EMAIL", message: "E-mail inválido ou inexistente." },
      { status: 400 }
    );
  }

  try {
    // 1. Verifica se a conta existe no banco
    const usuarioSnap = await adminDb
      .collection("usuarios")
      .where("email", "==", emailLimpo)
      .limit(1)
      .get();

    if (usuarioSnap.empty) {
      return NextResponse.json(
        {
          error: "USER_NOT_FOUND",
          message: "Nenhuma conta institucional encontrada com este e-mail. Verifique o endereço ou procure a administração.",
        },
        { status: 404 }
      );
    }

    const usuarioDoc = usuarioSnap.docs[0];
    const usuarioData = usuarioDoc.data();

    // 2. Gera um token de recuperação de senha com validade de 1 hora
    const token = gerarTokenConvite();
    const expira = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await adminDb.collection("recuperacao_senha").doc(token).set({
      id: token,
      usuarioId: usuarioDoc.id,
      email: emailLimpo,
      nome: usuarioData.nome,
      perfil: usuarioData.perfil,
      criadoEm: new Date().toISOString(),
      expiraEm: expira.toISOString(),
      usado: false,
    });

    return NextResponse.json({
      success: true,
      message: "Instruções de redefinição de senha enviadas! Verifique sua caixa de entrada institucional (o serviço de envio automático será ativado em breve).",
      token, // Para permitir testes e visualização em dev
    });
  } catch (error) {
    console.error("Erro na recuperação de senha:", error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Falha ao processar solicitação de recuperação de senha." },
      { status: 500 }
    );
  }
}
