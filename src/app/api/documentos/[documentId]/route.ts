import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { assertTccAccess } from "@/lib/auth/authorization";
import { getTccAccessRecord } from "@/lib/auth/firestore-repository";
import { AuthHttpError, toAuthErrorResponse } from "@/lib/auth/errors";

export async function GET(
  request: Request,
  context: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await context.params;
    const session = await getAuthenticatedSession(request);

    if (!adminDb) throw new Error("Firestore Admin não configurado");

    // 1. Busca a versão do documento no banco
    const versaoDoc = await adminDb.collection("versoes_arquivo").doc(documentId).get();
    if (!versaoDoc.exists) {
      return NextResponse.json({ message: "Documento não encontrado" }, { status: 404 });
    }
    const versao = versaoDoc.data()!;

    // 2. Busca a entrega original para descobrir o tcc_id CORRETO
    const entregaDoc = await adminDb.collection("entregas").doc(versao.entrega_id).get();
    if (!entregaDoc.exists) {
      return NextResponse.json({ message: "Entrega associada não encontrada" }, { status: 404 });
    }
    const tccId = entregaDoc.data()!.tcc_id;
    
    // 3. Valida se o professor/aluno tem acesso ao TCC
    const registro = await getTccAccessRecord(tccId, session);
    if (!registro) {
      throw new AuthHttpError(403, "FORBIDDEN", "Acesso negado ao TCC.");
    }
    assertTccAccess(session, registro.tcc, registro.context);

    const urlSegura = versao.arquivoUrl;

    // Se o cliente (como a tela do professor) esperava abrir diretamente num link ou iframe
    const acceptHeader = request.headers.get("accept") || "";
    if (acceptHeader.includes("text/html")) {
      return NextResponse.redirect(urlSegura);
    }

    // Retorno compatível com ambos os formatos (tanto .document quanto direto .url)
    return NextResponse.json({ 
      document: { url: urlSegura },
      url: urlSegura 
    });
    
  } catch (error: any) {
    console.error("[Erro ao abrir documento]:", error);
    if (error instanceof AuthHttpError) return toAuthErrorResponse(error);
    return NextResponse.json({ message: error.message || "Erro interno no servidor" }, { status: 500 });
  }
}