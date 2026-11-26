"use client";

import { validarMetadadosArquivo } from "@/lib/entregas/regras";

async function tokenCsrf() {
  const res = await fetch("/api/auth/csrf", { credentials: "same-origin" });
  const json = (await res.json()) as { csrfToken?: string };
  if (!res.ok || !json.csrfToken) throw new Error("Não foi possível preparar o envio autenticado.");
  return json.csrfToken;
}

/** Reutiliza o fluxo original do projeto: POST multipart -> Supabase Storage -> Firestore. */
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

export async function alterarStatusEntrega(
  entregaId: string,
  acao: "INICIAR_REVISAO" | "SOLICITAR_CORRECAO" | "CONCLUIR",
  comentario?: string,
) {
  // 1. Obter revisão e status atual da entrega
  const getRes = await fetch(`/api/entregas/${encodeURIComponent(entregaId)}/status`, {
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!getRes.ok) {
    const getErr = await getRes.json().catch(() => null);
    throw new Error(getErr?.message || "Não foi possível carregar os dados da entrega.");
  }
  const entregaAtual = (await getRes.json()) as { id: string; status: string; revisao: string };

  // Se a ação for SOLICITAR_CORRECAO ou CONCLUIR e ainda estiver em PRONTA_PARA_REVISAO,
  // primeiro avança para EM_REVISAO se necessário
  let revisao = entregaAtual.revisao;
  let status = entregaAtual.status;
  const csrf = await tokenCsrf();

  if (status === "PRONTA_PARA_REVISAO" && (acao === "SOLICITAR_CORRECAO" || acao === "CONCLUIR")) {
    const transRes = await fetch(`/api/entregas/${encodeURIComponent(entregaId)}/status`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrf,
      },
      body: JSON.stringify({ acao: "INICIAR_REVISAO", revisaoEsperada: revisao }),
    });
    if (!transRes.ok) {
      const err = await transRes.json().catch(() => null);
      throw new Error(err?.message || "Falha ao iniciar revisão da entrega.");
    }
    // Re-obter revisão para próxima transição
    const reGet = await fetch(`/api/entregas/${encodeURIComponent(entregaId)}/status`, {
      credentials: "same-origin",
      cache: "no-store",
    });
    const reDados = (await reGet.json()) as { revisao: string };
    revisao = reDados.revisao;
  }

  const patchRes = await fetch(`/api/entregas/${encodeURIComponent(entregaId)}/status`, {
    method: "PATCH",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrf,
    },
    body: JSON.stringify({
      acao,
      revisaoEsperada: revisao,
      ...(comentario ? { comentario } : {}),
    }),
  });

  if (!patchRes.ok) {
    const err = await patchRes.json().catch(() => null);
    throw new Error(err?.message || "Não foi possível alterar o status da entrega.");
  }

  return (await patchRes.json()) as { entrega: { id: string; status: string } };
}
