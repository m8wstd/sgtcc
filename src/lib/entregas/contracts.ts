import type { Aluno, Entrega, ProfessorOrientador, StatusEntrega, TCC, VersaoArquivo } from "@/types";
import type { AuthenticatedSession } from "@/lib/auth/session";
import type { AcaoEntrega } from "./status";

export interface TimestampRevision { seconds: number; nanoseconds: number }

export function revisaoDocumento(timestamp: TimestampRevision): string {
  return `${timestamp.seconds}:${timestamp.nanoseconds}`;
}

export interface VersaoPersistida {
  versao: VersaoArquivo;
  criadaEmMillis: number;
  uploadEmMillis: number;
}

export interface RegistroEntrega {
  entrega: Entrega;
  tcc: TCC;
  contexto: { aluno?: Aluno; orientador?: ProfessorOrientador };
  revisao: string;
  atualizadaEmMillis: number;
  versoes: VersaoPersistida[];
}

export interface ComandoStatus {
  acao: AcaoEntrega;
  revisaoEsperada: string;
  comentario?: string;
}

export interface MudancaEntrega {
  status: StatusEntrega;
  comentario?: string;
}

export interface ResultadoStatus {
  entrega: { id: string; status: StatusEntrega };
}

export interface EntregaRepository {
  alterarEmTransacao(
    entregaId: string,
    sessao: AuthenticatedSession,
    decidir: (registro: RegistroEntrega) => Promise<MudancaEntrega>,
  ): Promise<ResultadoStatus>;
}

/** RF03 deve confirmar, em modo somente leitura, que a versão persistida é real e imutável. */
export interface ConfirmadorSubmissao {
  confirmar(versao: VersaoArquivo, entrega: Entrega, tcc: TCC): Promise<boolean>;
}
