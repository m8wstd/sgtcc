import { get } from "@vercel/blob";
import { assertDocumentAccess } from "@/lib/auth/authorization";
import { getDocumentAccessRecord } from "@/lib/auth/firestore-repository";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { AuthHttpError, toAuthErrorResponse } from "@/lib/auth/errors";
import { nomeExibicaoDoArquivo } from "@/lib/entregas/regras";

export const runtime = "nodejs";

type Context = { params: Promise<{ documentId: string }> };

async function acessar(request: Request, context: Context, somenteVerificar: boolean) {
  try {
    const { documentId } = await context.params;
    if (!documentId) return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
    const sessao = await getAuthenticatedSession(request);
    const registro = await getDocumentAccessRecord(documentId, sessao);
    if (!registro) return Response.json({ error: "NOT_FOUND", message: "Documento não encontrado." }, { status: 404 });
    assertDocumentAccess(sessao, registro.tcc, registro.context);

    const arquivoUrl = registro.arquivo.arquivoUrl;
    // Registros antigos do seed possuem apenas caminhos, sem bytes no Blob.
    if (!/^https:\/\/[^/]+\.(private|public)\.blob\.vercel-storage\.com\//i.test(arquivoUrl)) {
      const msg = "Este registro não possui arquivo real no Vercel Blob. Envie uma nova versão ou migre o documento.";
      return new Response(somenteVerificar ? null : JSON.stringify({ error: "BLOB_NOT_FOUND", message: msg }), {
        status: 404, headers: { "x-document-error": msg, ...(somenteVerificar ? {} : { "Content-Type": "application/json" }) },
      });
    }

    let stream: ReadableStream<Uint8Array> | null = null;
    let mime: string | null = null;
    if (new URL(arquivoUrl).hostname.endsWith(".private.blob.vercel-storage.com")) {
      const resultado = await get(arquivoUrl, { access: "private" });
      if (!resultado || resultado.statusCode !== 200 || !resultado.stream) {
        const msg = "Arquivo não encontrado na store privada configurada. Verifique BLOB_READ_WRITE_TOKEN.";
        return new Response(null, { status: 404, headers: { "x-document-error": msg } });
      }
      stream = resultado.stream;
      mime = resultado.blob.contentType;
    } else {
      // Compatibilidade com a store pública já utilizada pelo grupo.
      // A URL nunca é devolvida ao navegador, mas o objeto antigo continua público na origem.
      const remoto = await fetch(arquivoUrl, { cache: "no-store" });
      if (!remoto.ok || !remoto.body) {
        const msg = "Arquivo não encontrado no Vercel Blob público.";
        return new Response(null, { status: 404, headers: { "x-document-error": msg } });
      }
      stream = remoto.body;
      mime = remoto.headers.get("content-type");
    }

    if (somenteVerificar) {
      await stream.cancel().catch(() => {});
      return new Response(null, { status: 200, headers: { "Cache-Control": "private, no-store" } });
    }

    const nome = nomeExibicaoDoArquivo(arquivoUrl).replace(/["\\\r\n]/g, "_");
    const baixar = new URL(request.url).searchParams.get("download") === "1";
    const contentType = nome.toLowerCase().endsWith(".pdf") ? "application/pdf" :
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    return new Response(stream, {
      headers: {
        "Content-Type": mime && mime !== "application/octet-stream" ? mime : contentType,
        "Content-Disposition": `${baixar ? "attachment" : "inline"}; filename="${nome}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "SAMEORIGIN",
      },
    });
  } catch (error) {
    if (error instanceof AuthHttpError) return toAuthErrorResponse(error);
    console.error("[RF03] Falha ao recuperar documento:", error);
    return Response.json({ error: "DOCUMENT_ERROR", message: "Não foi possível recuperar o documento no Blob." }, { status: 503 });
  }
}

export async function GET(request: Request, context: Context) { return acessar(request, context, false); }
export async function HEAD(request: Request, context: Context) { return acessar(request, context, true); }
