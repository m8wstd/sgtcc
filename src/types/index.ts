/**
 * Definições de Tipos e Entidades do Domínio SGTCC
 * Baseado em: docs/data.puml e docs/classes.puml
 */

export enum PerfilEnum {
  ADMIN = "ADMIN",
  COORDENACAO = "COORDENACAO",
  ORIENTADOR = "ORIENTADOR",
  ALUNO = "ALUNO",
  AVALIADOR = "AVALIADOR",
}

export type StatusEntrega =
  | "AGUARDANDO_ENVIO"
  | "PRONTA_PARA_REVISAO"
  | "EM_REVISAO"
  | "SOLICITADA_CORRECAO"
  | "CONCLUIDA"
  | "ATRASADA";

export type StatusGeralTCC =
  | "EM_ANDAMENTO"
  | "AGUARDANDO_BANCA"
  | "DEFENDIDO"
  | "APROVADO"
  | "REPROVADO";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  senhaHash?: string;
  perfil: PerfilEnum;
  criadoEm?: Date | string;
}

export interface Aluno {
  matricula: string;
  usuario_id: string;
  usuario?: Usuario;
}

export interface ProfessorOrientador {
  id: string;
  usuario_id: string;
  usuario?: Usuario;
}

export interface ProfessorAvaliador {
  id: string;
  usuario_id: string;
  usuario?: Usuario;
}

export interface Coordenador {
  id: string;
  usuario_id: string;
  usuario?: Usuario;
}

export interface TCC {
  id: string;
  titulo: string;
  statusGeral: StatusGeralTCC;
  fase?: 1 | 2; // TCC 1 ou TCC 2
  curso?: string; // ex: "Engenharia de Software", "Sistemas de Informação"
  versaoFinalUrl?: string;
  /** Data/hora da defesa (usada pelo painel da banca para ordenar e alertar). */
  defesaEm?: Date | string;
  aluno_id: string;
  orientador_id: string;
}

export interface Cronograma {
  id: string;
  semestre: string; // ex: "2026/2"
}

export interface MarcoCronograma {
  id: string;
  titulo: string;
  dataLimite: Date | string;
  cronograma_id: string;
  /** Se true, o sistema recusa envios de arquivo depois de `dataLimite` (RF03). */
  bloqueioEstrito?: boolean;
}

export interface Entrega {
  id: string;
  status: StatusEntrega;
  dataSubmissao?: Date | string;
  marco_id: string;
  tcc_id: string;
}

export interface VersaoArquivo {
  id: string;
  numeroVersao: number;
  arquivoUrl: string;
  dataUpload: Date | string;
  entrega_id: string;
}

export interface Feedback {
  id: string;
  comentario: string;
  data: Date | string;
  entrega_id: string;
  autor_id: string;
}

export interface BancaAvaliacao {
  id: string;
  tcc_id: string;
  avaliador_id: string;
}

export type StatusAvaliacao = "RASCUNHO" | "FINALIZADA";

export type DecisaoBanca = "APROVADO" | "APROVADO_RESSALVAS" | "REPROVADO";

/**
 * Resultado da avaliação de UM membro da banca sobre UM TCC.
 * O id do documento é o mesmo da BancaAvaliacao (banca_id): 1 avaliação por vínculo.
 * Depois de FINALIZADA é imutável (mesma lógica de RN02 para o histórico).
 */
export interface Avaliacao {
  id: string;
  banca_id: string;
  tcc_id: string;
  avaliador_id: string;
  status: StatusAvaliacao;
  decisao?: DecisaoBanca;
  nota?: number; // 0 a 10
  parecer: string;
  atualizadoEm?: Date | string;
  dataAvaliacao?: Date | string; // preenchida ao finalizar
}

export interface Notificacao {
  id: string;
  mensagem: string;
  lida: boolean;
  usuario_id: string;
  criadoEm?: Date | string;
}
