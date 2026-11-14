import type { AuthenticatedSession } from "@/lib/auth/session";
import { exigirPermissaoAcao } from "./authorization";
import type { ComandoStatus, ConfirmadorSubmissao, EntregaRepository } from "./contracts";
import { EntregaError } from "./errors";
import { proximoStatus } from "./status";
import { selecionarSubmissao } from "./submission";

export const LIMITE_COMENTARIO = 4000;

export function criarServicoEntregas(repository: EntregaRepository, confirmador: ConfirmadorSubmissao) {
  return {
    alterarStatus(entregaId: string, sessao: AuthenticatedSession, comando: ComandoStatus) {
      return repository.alterarEmTransacao(entregaId, sessao, async (registro) => {
        exigirPermissaoAcao(sessao, registro.tcc, registro.contexto, comando.acao);
        if (registro.revisao !== comando.revisaoEsperada) {
          throw new EntregaError(409, "STALE_REVISION", "A entrega foi atualizada por outra operação. Atualize a página antes de continuar.");
        }
        const status = proximoStatus(registro.entrega.status, comando.acao);
        const comentario = comando.comentario?.trim();
        if (comando.acao === "SOLICITAR_CORRECAO" && (!comentario || comentario.length > LIMITE_COMENTARIO)) {
          throw new EntregaError(400, "COMMENT_REQUIRED", `Descreva a correção em um comentário de até ${LIMITE_COMENTARIO} caracteres.`);
        }
        const { versao } = selecionarSubmissao(registro);
        if (!await confirmador.confirmar(versao, registro.entrega, registro.tcc)) {
          throw new EntregaError(409, "SUBMISSION_NOT_CONFIRMED", "O envio da versão mais recente ainda não foi confirmado. Nenhuma alteração foi realizada.");
        }
        return {
          status,
          ...(comando.acao === "SOLICITAR_CORRECAO" ? { comentario } : {}),
        };
      });
    },
  };
}
