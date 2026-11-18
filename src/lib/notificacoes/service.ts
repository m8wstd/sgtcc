import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";

export interface CriarNotificacaoParams {
  usuarioId: string;
  mensagem: string;
  link?: string;
}

/**
 * Cria uma notificação no Firestore para um usuário específico.
 */
export async function criarNotificacao({
  usuarioId,
  mensagem,
  link,
}: CriarNotificacaoParams): Promise<string | null> {
  if (!adminDb || !usuarioId) return null;

  try {
    const notifRef = adminDb.collection("notificacoes").doc();
    await notifRef.set({
      id: notifRef.id,
      usuario_id: usuarioId,
      mensagem,
      link: link ?? null,
      lida: false,
      criadoEm: Timestamp.now(),
    });
    return notifRef.id;
  } catch (error) {
    console.error("Erro ao criar notificação:", error);
    return null;
  }
}

/**
 * Cria notificações em lote para múltiplos usuários (ex: todos do TCC).
 */
export async function criarNotificacoesEmLote(
  usuarioIds: string[],
  mensagem: string,
  link?: string
): Promise<void> {
  if (!adminDb || !usuarioIds.length) return;

  try {
    const unicos = [...new Set(usuarioIds.filter(Boolean))];
    const batch = adminDb.batch();
    const agora = Timestamp.now();

    for (const uid of unicos) {
      const notifRef = adminDb.collection("notificacoes").doc();
      batch.set(notifRef, {
        id: notifRef.id,
        usuario_id: uid,
        mensagem,
        link: link ?? null,
        lida: false,
        criadoEm: agora,
      });
    }

    await batch.commit();
  } catch (error) {
    console.error("Erro ao criar notificações em lote:", error);
  }
}
