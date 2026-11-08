import { NextResponse } from "next/server";
import { adminDb, adminInitError } from "@/lib/firebase/admin";
import {
  createSessionCookie,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth/session";
import { homeDoPerfil } from "@/lib/auth/perfis";
import { getServerSsoConfig, isInstitutionalEmail } from "@/lib/auth/config";
import type { PerfilEnum } from "@/types";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "INVALID_REQUEST", message: "Corpo da requisição inválido." },
      { status: 400 },
    );
  }

  const { identifier, password } = (body as { identifier?: string; password?: string }) ?? {};

  if (!identifier || !password) {
    return NextResponse.json(
      {
        error: "INVALID_CREDENTIALS",
        message: "Credenciais inválidas ou usuário não encontrado.",
      },
      { status: 401 },
    );
  }

  let email = identifier.trim();

  // Se o identificador for uma matrícula (sem @), busca o e-mail correspondente no Firestore
  if (!email.includes("@")) {
    if (!adminDb) {
      return NextResponse.json(
        {
          error: "AUTH_SERVICE_UNAVAILABLE",
          message: "Serviço de autenticação e banco de dados temporariamente indisponível.",
        },
        { status: 503 },
      );
    }

    try {
      const alunoSnap = await adminDb.collection("alunos").doc(email).get();
      if (alunoSnap.exists) {
        const usuarioId = alunoSnap.data()?.usuario_id;
        if (usuarioId) {
          const userSnap = await adminDb.collection("usuarios").doc(usuarioId).get();
          if (userSnap.exists && userSnap.data()?.email) {
            email = userSnap.data()?.email;
          }
        }
      }
    } catch (dbErr) {
      console.error("Erro ao resolver matrícula no Firestore:", dbErr);
      return NextResponse.json(
        {
          error: "AUTH_SERVICE_UNAVAILABLE",
          message: "Serviço de banco de dados temporariamente indisponível.",
        },
        { status: 503 },
      );
    }
  }

  // Unificação de validação com o SSO institucional:
  // Se o domínio institucional estiver configurado no servidor, valida se o e-mail pertence ao domínio
  const ssoConfig = getServerSsoConfig();
  if (ssoConfig && ssoConfig.allowedEmailDomain && !isInstitutionalEmail(email, ssoConfig)) {
    return NextResponse.json(
      {
        error: "FORBIDDEN",
        message: "O e-mail não pertence ao domínio institucional permitido.",
      },
      { status: 403 },
    );
  }

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "SERVER_CONFIG", message: "API Key do Firebase não configurada." },
      { status: 500 },
    );
  }

  try {
    // Autentica as credenciais na API segura do Firebase Auth
    const authUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
    const authResponse = await fetch(authUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    });

    if (!authResponse.ok) {
      // AC1: mensagem de erro exata solicitada pelo critério de aceitação
      return NextResponse.json(
        {
          error: "INVALID_CREDENTIALS",
          message: "Credenciais inválidas ou usuário não encontrado.",
        },
        { status: 401 },
      );
    }

    const authData = (await authResponse.json()) as {
      idToken: string;
      localId: string;
      email: string;
      displayName?: string;
    };

    if (!adminDb) {
      return NextResponse.json(
        {
          error: "AUTH_SERVICE_UNAVAILABLE",
          message: "Serviço de banco de dados temporariamente indisponível.",
        },
        { status: 503 },
      );
    }

    // Busca o perfil do usuário no Firestore
    const userDoc = await adminDb.collection("usuarios").doc(authData.localId).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        {
          error: "PROFILE_NOT_FOUND",
          message:
            "Usuário autenticado, mas seu perfil institucional não está cadastrado. Solicite acesso ao Administrador ou conclua seu cadastro.",
        },
        { status: 403 },
      );
    }

    const dados = userDoc.data();
    const perfil = dados?.perfil as PerfilEnum | undefined;
    const nome = dados?.nome || authData.displayName || "Usuário";

    if (!perfil) {
      return NextResponse.json(
        {
          error: "PROFILE_NOT_FOUND",
          message:
            "Perfil institucional incompleto ou não definido. Entre em contato com o suporte ou administração.",
        },
        { status: 403 },
      );
    }

    // Cria o cookie de sessão seguro do SGTCC
    const sessionCookie = await createSessionCookie(authData.idToken);
    const destino = homeDoPerfil(perfil);

    const response = NextResponse.json({
      success: true,
      user: {
        uid: authData.localId,
        email: authData.email,
        nome,
        perfil,
      },
      redirectTo: destino,
    });

    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error) {
    console.error("Erro no login por credenciais:", error);
    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        message: "Ocorreu um erro ao processar o login institucional.",
      },
      { status: 500 },
    );
  }
}
