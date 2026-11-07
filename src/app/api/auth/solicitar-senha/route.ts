import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { validarEmail } from "@/lib/auth/cadastro-tokens";

// POST /api/auth/solicitar-senha
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
    // "Se uma pessoa já tem cadastro, ela não pode conseguir enviar (a funcionalidade do e-mail não vai funcionar ainda)."
    const usuarioSnap = await adminDb
      .collection("usuarios")
      .where("email", "==", emailLimpo)
      .limit(1)
      .get();

    if (!usuarioSnap.empty) {
      return NextResponse.json(
        {
          error: "ALREADY_REGISTERED",
          message:
            "Este e-mail já possui cadastro ativo na plataforma. Acesse com sua senha ou contate a coordenação para redefinição.",
        },
        { status: 400 }
      );
    }

    // Também verifica se tem convite pendente
    const conviteSnap = await adminDb
      .collection("convites_cadastro")
      .where("email", "==", emailLimpo)
      .where("usado", "==", false)
      .limit(1)
      .get();

    if (conviteSnap.empty) {
      return NextResponse.json(
        {
          error: "NOT_PRE_REGISTERED",
          message:
            "Nenhum pré-cadastro institucional encontrado para este e-mail. Solicite seu acesso ao Administrador do sistema.",
        },
        { status: 404 }
      );
    }

    // A funcionalidade de envio de e-mail ainda não vai funcionar (conforme especificado)
    return NextResponse.json({
      success: true,
      message:
        "Solicitação registrada! Um link de criação de senha será enviado assim que o serviço de e-mail estiver ativo.",
    });
  } catch (error) {
    console.error("Erro na solicitação de senha:", error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Falha ao processar solicitação." },
      { status: 500 }
    );
  }
}
