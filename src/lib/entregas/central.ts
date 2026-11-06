import type { PainelTcc } from "@/lib/data/queries";
import { nomeExibicaoDoArquivo, podeSubmeter } from "@/lib/entregas/regras";
import type { StatusEntrega } from "@/types";

/** Versão de arquivo como a tela precisa: sem expor o caminho interno do Storage. */
export interface VersaoView {
  id: string;
  numeroVersao: number;
  dataUpload: string;
  nomeArquivo: string;
}

export interface MarcoEntregaView {
  marcoId: string;
  titulo: string;
  dataLimite: string;
  status: StatusEntrega;
  bloqueioEstrito: boolean;
  podeEnviar: boolean;
  /** Preenchido quando `podeEnviar` é falso. */
  motivoBloqueio?: string;
  /** Prazo vencido, mas o envio ainda é aceito (o marco não bloqueia). */
  emAtraso: boolean;
  /** Mais recente primeiro. */
  versoes: VersaoView[];
}

/** Transforma o painel do TCC (dados reais do Firestore) na lista da Central de Entregas. */
export function montarCentralEntregas(painel: PainelTcc, agora: number = Date.now()): MarcoEntregaView[] {
  return painel.itens.map(({ marco, entrega, statusEfetivo, versoes }) => {
    const permissao = podeSubmeter(marco, entrega, agora);
    return {
      marcoId: marco.id,
      titulo: marco.titulo,
      dataLimite: String(marco.dataLimite),
      status: statusEfetivo,
      bloqueioEstrito: marco.bloqueioEstrito === true,
      podeEnviar: permissao.ok,
      motivoBloqueio: permissao.ok ? undefined : permissao.motivo,
      emAtraso: permissao.ok && permissao.emAtraso,
      versoes: [...versoes]
        .sort((a, b) => b.numeroVersao - a.numeroVersao)
        .map((v) => ({
          id: v.id,
          numeroVersao: v.numeroVersao,
          dataUpload: String(v.dataUpload),
          nomeArquivo: nomeExibicaoDoArquivo(v.arquivoUrl),
        })),
    };
  });
}
