import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { ROTULO_PERFIL } from "@/lib/auth/perfis";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "MISSING_TOKEN", message: "Token não fornecido." }, { status: 400 });
  }

  if (!adminDb) {
    return NextResponse.json({ error: "CONFIG_ERROR", message: "Firebase indisponível" }, { status: 503 });
  }

  try {
    const doc = await adminDb.collection("convites_cadastro").doc(token).get();
    if (!doc.exists) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Link de convite inválido ou inexistente." },
        { status: 404 }
      );
    }

    const data = doc.data();
    if (!data) {
      return NextResponse.json({ error: "INVALID", message: "Convite corrompido." }, { status: 400 });
    }

    if (data.usado) {
      return NextResponse.json(
        { error: "ALREADY_USED", message: "Este link já foi utilizado e queimado." },
        { status: 410 }
      );
    }

    const expirado = data.expiraEm ? new Date(data.expiraEm).getTime() < Date.now() : false;
    if (expirado) {
      return NextResponse.json(
        { error: "EXPIRED", message: "Este convite expirou (validade de 1 semana) e foi queimado." },
        { status: 410 }
      );
    }

    return NextResponse.json({
      valido: true,
      nome: data.nome,
      email: data.email,
      perfil: data.perfil,
      perfilRotulo: ROTULO_PERFIL[data.perfil as keyof typeof ROTULO_PERFIL] || data.perfil,
      matricula: data.matricula,
      curso: data.curso,
    });
  } catch (error) {
    console.error("Erro ao validar convite:", error);
    return NextResponse.json({ error: "SERVER_ERROR", message: "Erro ao verificar convite." }, { status: 500 });
  }
}
