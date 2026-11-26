import { supabaseAdmin, BUCKET_NAME } from "@/lib/supabase/client";

/**
 * Faz o upload de um arquivo para o Supabase Storage.
 * Retorna a URL pública do arquivo armazenado.
 */
export async function uploadParaSupabase(
  caminho: string,
  bytes: Buffer,
  contentType: string
): Promise<{ url: string; path: string }> {
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .upload(caminho, bytes, {
      contentType,
      upsert: true,
    });

  if (error) {
    console.error("[Supabase Storage] Erro no upload:", error);
    throw new Error(`Falha no armazenamento do arquivo: ${error.message}`);
  }

  const { data: publicUrlData } = supabaseAdmin.storage
    .from(BUCKET_NAME)
    .getPublicUrl(caminho);

  return {
    url: publicUrlData.publicUrl,
    path: caminho,
  };
}

/**
 * Remove um arquivo do Supabase Storage dado o seu caminho relativo ou URL.
 */
export async function removerDoSupabase(caminhoOuUrl: string): Promise<void> {
  let caminho = caminhoOuUrl;
  if (caminhoOuUrl.includes(`/storage/v1/object/public/${BUCKET_NAME}/`)) {
    caminho = caminhoOuUrl.split(`/storage/v1/object/public/${BUCKET_NAME}/`)[1];
  }

  const { error } = await supabaseAdmin.storage.from(BUCKET_NAME).remove([caminho]);
  if (error) {
    console.warn("[Supabase Storage] Falha ao excluir arquivo:", error.message);
  }
}

/**
 * Recupera o stream/buffer de um arquivo no Supabase Storage.
 */
export async function baixarDoSupabase(caminhoOuUrl: string): Promise<{
  data: Blob;
  contentType: string | null;
} | null> {
  let caminho = caminhoOuUrl;
  if (caminhoOuUrl.includes(`/storage/v1/object/public/${BUCKET_NAME}/`)) {
    caminho = caminhoOuUrl.split(`/storage/v1/object/public/${BUCKET_NAME}/`)[1];
  }

  const { data, error } = await supabaseAdmin.storage.from(BUCKET_NAME).download(caminho);
  if (error || !data) {
    return null;
  }

  return {
    data,
    contentType: data.type || null,
  };
}
