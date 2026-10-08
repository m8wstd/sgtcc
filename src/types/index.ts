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
  versaoFinalUrl?: string;
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

export interface Notificacao {
  id: string;
  mensagem: string;
  lida: boolean;
  usuario_id: string;
  criadoEm?: Date | string;
}
