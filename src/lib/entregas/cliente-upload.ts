"use client";

import { validarMetadadosArquivo } from "@/lib/entregas/regras";

async function tokenCsrf() {
  const res = await fetch("/api/auth/csrf", { credentials: "same-origin" });
  const json = (await res.json()) as { csrfToken?: string };
  if (!res.ok || !json.csrfToken) throw new Error("Não foi possível preparar o envio autenticado.");
  return json.csrfToken;
}

/** Reutiliza o fluxo original do projeto: POST multipart -> Vercel Blob -> Firestore. */
export async function enviarArquivoTcc(tccId: string, marcoId: string, arquivo: File) {
  const validacao = validarMetadadosArquivo(arquivo.name, arquivo.size);
  if (!validacao.ok) throw new Error(validacao.mensagem);
  if (!tccId || !marcoId) throw new Error("TCC ou marco não identificado.");

  const form = new FormData();
  form.set("marcoId", marcoId);
  form.set("arquivo", arquivo);

  const res = await fetch(`/api/tcc/${encodeURIComponent(tccId)}/entregas`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "X-CSRF-Token": await tokenCsrf() },
    // Sem Content-Type: o navegador define o boundary do multipart.
    body: form,
  });
  const corpo = (await res.json().catch(() => null)) as {
    versao?: { id: string; numeroVersao: number };
    message?: string;
  } | null;
  if (!res.ok || !corpo?.versao) {
    throw new Error(corpo?.message ?? `Não foi possível enviar o arquivo (HTTP ${res.status}).`);
  }
  return corpo.versao;
}

export async function verificarDocumento(id: string): Promise<string> {
  const url = `/api/documentos/${encodeURIComponent(id)}`;
  const res = await fetch(url, { method: "HEAD", credentials: "same-origin", cache: "no-store" });
  if (!res.ok) throw new Error(res.headers.get("x-document-error") || "Arquivo indisponível no armazenamento.");
  return url;
}
