import { assertDocumentAccess } from "@/lib/auth/authorization";
import { getDocumentAccessRecord } from "@/lib/auth/firestore-repository";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { AuthHttpError, toAuthErrorResponse } from "@/lib/auth/errors";
import { nomeExibicaoDoArquivo } from "@/lib/entregas/regras";
import { baixarDoSupabase } from "@/lib/supabase/storage";

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

    let stream: ReadableStream<Uint8Array> | null = null;
    let mime: string | null = null;

    // 1. Suporte nativo a Supabase Storage
    if (arquivoUrl.includes(".supabase.co/storage/v1/object/public/")) {
      const resSupabase = await baixarDoSupabase(arquivoUrl);
      if (!resSupabase) {
        const msg = "Arquivo não encontrado no Supabase Storage.";
        return new Response(somenteVerificar ? null : JSON.stringify({ error: "STORAGE_NOT_FOUND", message: msg }), {
          status: 404,
          headers: { "x-document-error": msg, ...(somenteVerificar ? {} : { "Content-Type": "application/json" }) },
        });
      }
      stream = resSupabase.data.stream() as unknown as ReadableStream<Uint8Array>;
      mime = resSupabase.contentType;
    }
    // 2. Retrocompatibilidade para URLs do Vercel Blob público
    else if (/^https:\/\/[^/]+\.(private|public)\.blob\.vercel-storage\.com\//i.test(arquivoUrl)) {
      const remoto = await fetch(arquivoUrl, { cache: "no-store" });
      if (!remoto.ok || !remoto.body) {
        const msg = "Arquivo não encontrado no storage legado.";
        return new Response(null, { status: 404, headers: { "x-document-error": msg } });
      }
      stream = remoto.body;
      mime = remoto.headers.get("content-type");
    } else {
      const msg = "Registro de arquivo sem armazenamento ativo associado.";
      return new Response(somenteVerificar ? null : JSON.stringify({ error: "NOT_FOUND", message: msg }), {
        status: 404,
        headers: { "x-document-error": msg, ...(somenteVerificar ? {} : { "Content-Type": "application/json" }) },
      });
    }

    if (!stream) {
      const msg = "Não foi possível carregar os dados do arquivo.";
      return new Response(null, { status: 404, headers: { "x-document-error": msg } });
    }

    if (somenteVerificar) {
      await stream.cancel().catch(() => {});
      return new Response(null, { status: 200, headers: { "Cache-Control": "private, no-store" } });
    }

    const nome = nomeExibicaoDoArquivo(arquivoUrl).replace(/["\\\r\n]/g, "_");
    const baixar = new URL(request.url).searchParams.get("download") === "1";
    const contentType = nome.toLowerCase().endsWith(".pdf")
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

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
    return Response.json(
      { error: "DOCUMENT_ERROR", message: "Não foi possível recuperar o documento no Storage." },
      { status: 503 }
    );
  }
}

export async function GET(request: Request, context: Context) {
  return acessar(request, context, false);
}
export async function HEAD(request: Request, context: Context) {
  return acessar(request, context, true);
}
