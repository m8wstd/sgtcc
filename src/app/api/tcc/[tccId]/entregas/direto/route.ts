import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { assertTccAccess } from "@/lib/auth/authorization";
import { hasValidCsrfToken, isSameOriginRequest } from "@/lib/auth/csrf";
import { getTccAccessRecord } from "@/lib/auth/firestore-repository";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { adminDb } from "@/lib/firebase/admin";
import { podeSubmeter, TAMANHO_MAXIMO_BYTES } from "@/lib/entregas/regras";
import { PerfilEnum, type Entrega, type MarcoCronograma } from "@/types";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ tccId: string }> }) {
  try {
    const { tccId } = await params;
    const body = (await request.json()) as HandleUploadBody;
    const response = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!isSameOriginRequest(request)) throw new Error("Origem não autorizada.");
        const dados = JSON.parse(clientPayload || "{}") as { marcoId?: string; csrf?: string };
        const headers = new Headers(request.headers);
        headers.set("x-csrf-token", dados.csrf || "");
        if (!hasValidCsrfToken(new Request(request.url, { headers }))) throw new Error("CSRF_INVALID");
        const sessao = await getAuthenticatedSession(request);
        if (sessao.perfil !== PerfilEnum.ALUNO) throw new Error("Apenas alunos podem enviar.");
        if (!dados.marcoId || !adminDb) throw new Error("Marco ou Firestore indisponível.");
        const registro = await getTccAccessRecord(tccId, sessao);
        if (!registro) throw new Error("TCC inexistente.");
        assertTccAccess(sessao, registro.tcc, registro.context);
        const prefixo = `tccs/${encodeURIComponent(tccId)}/marcos/${encodeURIComponent(dados.marcoId)}/`;
        if (!pathname.startsWith(prefixo) || !/\.(pdf|docx)$/i.test(pathname)) {
          throw new Error("Caminho ou extensão de arquivo inválido.");
        }
        const [marcoDoc, entregaSnap] = await Promise.all([
          adminDb.collection("marcos_cronograma").doc(dados.marcoId).get(),
          adminDb.collection("entregas").where("tcc_id", "==", tccId).where("marco_id", "==", dados.marcoId).limit(1).get(),
        ]);
        if (!marcoDoc.exists) throw new Error("Marco não encontrado.");
        const marco = marcoDoc.data() as MarcoCronograma;
        const entrega = entregaSnap.docs[0]?.data() as Entrega | undefined;
        const permissao = podeSubmeter(marco, entrega ?? null);
        if (!permissao.ok) throw new Error(permissao.motivo);
        return {
          allowedContentTypes: ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
          maximumSizeInBytes: TAMANHO_MAXIMO_BYTES,
          addRandomSuffix: false,
          tokenPayload: JSON.stringify({ tccId, marcoId: dados.marcoId, usuarioId: sessao.usuario.id }),
        };
      },
      // Persistência confirmada pela requisição do navegador, inclusive em localhost.
      onUploadCompleted: async () => {},
    });
    return Response.json(response);
  } catch (error) {
    console.error("[RF03] Emissão do token de upload falhou:", error);
    return Response.json({ error: "UPLOAD_TOKEN_FAILED", message: error instanceof Error ? error.message : "Não foi possível autorizar o upload." }, { status: 400 });
  }
}
