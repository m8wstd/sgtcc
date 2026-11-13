import { createHash } from "node:crypto";
import { head } from "@vercel/blob";
import { Timestamp } from "firebase-admin/firestore";
import { assertTccAccess } from "@/lib/auth/authorization";
import { hasValidCsrfToken, isSameOriginRequest } from "@/lib/auth/csrf";
import { toAuthErrorResponse, AuthHttpError } from "@/lib/auth/errors";
import { getTccAccessRecord } from "@/lib/auth/firestore-repository";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { adminDb } from "@/lib/firebase/admin";
import { TAMANHO_MAXIMO_BYTES, podeSubmeter, extensaoDe } from "@/lib/entregas/regras";
import { PerfilEnum, type Entrega, type MarcoCronograma } from "@/types";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ tccId: string }> }) {
  try {
    if (!isSameOriginRequest(request) || !hasValidCsrfToken(request)) {
      return Response.json({ error: "CSRF_INVALID", message: "Requisição não autorizada." }, { status: 403 });
    }
    const { tccId } = await params;
    const sessao = await getAuthenticatedSession(request);
    if (sessao.perfil !== PerfilEnum.ALUNO) return Response.json({ message: "Apenas o aluno envia arquivos." }, { status: 403 });
    if (!adminDb) throw new Error("Firestore Admin indisponível.");
    const db = adminDb;
    const { marcoId, url } = (await request.json()) as { marcoId?: string; url?: string };
    if (typeof marcoId !== "string" || !marcoId || typeof url !== "string") return Response.json({ message: "Dados inválidos." }, { status: 400 });
    const registro = await getTccAccessRecord(tccId, sessao);
    if (!registro) return Response.json({ message: "TCC não encontrado." }, { status: 404 });
    assertTccAccess(sessao, registro.tcc, registro.context);

    // URL verificada pelo SDK, não por um fetch arbitrário (evita SSRF).
    const blob = await head(url).catch(() => null);
    const prefixo = `tccs/${encodeURIComponent(tccId)}/marcos/${encodeURIComponent(marcoId)}/`;
    if (!blob || blob.url !== url || !blob.pathname.startsWith(prefixo) || !extensaoDe(blob.pathname) ||
      blob.size <= 0 || blob.size > TAMANHO_MAXIMO_BYTES) {
      return Response.json({ error: "BLOB_NOT_FOUND", message: "Arquivo não encontrado na store Vercel Blob configurada ou metadados inválidos." }, { status: 404 });
    }
    const sufixo = blob.pathname.slice(prefixo.length);
    if (!/^[a-f0-9-]{36}_[A-Za-z0-9._-]+\.(pdf|docx)$/i.test(sufixo)) {
      return Response.json({ message: "Arquivo não corresponde a um envio autorizado." }, { status: 403 });
    }
    const esperado = extensaoDe(blob.pathname) === ".pdf"
      ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    if (blob.contentType !== esperado) return Response.json({ message: "Tipo de arquivo inválido." }, { status: 400 });

    const [marcoDoc, entregaSnap] = await Promise.all([
      db.collection("marcos_cronograma").doc(marcoId).get(),
      db.collection("entregas").where("tcc_id", "==", tccId).where("marco_id", "==", marcoId).limit(1).get(),
    ]);
    if (!marcoDoc.exists) return Response.json({ message: "Marco não encontrado." }, { status: 404 });
    const marco = marcoDoc.data() as MarcoCronograma;
    const entregaExistente = entregaSnap.docs[0];
    const idEntrega = entregaExistente?.id ?? `${tccId}__${marcoId}`;
    const entregaRef = db.collection("entregas").doc(idEntrega);
    const idVersao = `blob-${createHash("sha256").update(url).digest("hex").slice(0, 40)}`;
    const versaoRef = db.collection("versoes_arquivo").doc(idVersao);
    // Versões antigas podem existir sem um contador na entrega.
    const anteriores = await db.collection("versoes_arquivo").where("entrega_id", "==", idEntrega).get();
    const maiorExistente = anteriores.docs.reduce((m, d) => Math.max(m, Number(d.data().numeroVersao) || 0), 0);
    const result = await db.runTransaction(async (tx) => {
      const [versaoAtual, entregaAtual] = await Promise.all([tx.get(versaoRef), tx.get(entregaRef)]);
      if (versaoAtual.exists) return { id: idVersao, numeroVersao: Number(versaoAtual.data()?.numeroVersao) };
      const entrega = entregaAtual.exists ? entregaAtual.data() as Entrega : null;
      const permissao = podeSubmeter(marco, entrega);
      if (!permissao.ok) throw new Error(permissao.motivo);
      const numeroVersao = Math.max(maiorExistente, Number(entregaAtual.data()?.ultimaVersao) || 0) + 1;
      const agora = Timestamp.now();
      tx.create(versaoRef, { id: idVersao, entrega_id: idEntrega, numeroVersao, arquivoUrl: url, dataUpload: agora });
      if (entregaAtual.exists) {
        tx.update(entregaRef, { dataSubmissao: agora, ultimaVersao: numeroVersao, status: "PRONTA_PARA_REVISAO" });
      } else {
        tx.create(entregaRef, { id: idEntrega, tcc_id: tccId, marco_id: marcoId, status: "PRONTA_PARA_REVISAO", dataSubmissao: agora, ultimaVersao: numeroVersao });
      }
      return { id: idVersao, numeroVersao };
    });
    return Response.json({ versao: result }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthHttpError) return toAuthErrorResponse(error);
    console.error("[RF03] Falha na confirmação do upload:", error);
    return Response.json({ error: "CONFIRM_FAILED", message: error instanceof Error ? error.message : "Não foi possível confirmar o envio." }, { status: 500 });
  }
}
