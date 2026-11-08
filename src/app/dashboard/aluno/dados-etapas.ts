export interface MaterialApoio {
  id: string;
  nome: string;
  tamanho?: string;
  tipo?: string;
  url: string;
}

export interface PostagemSala {
  id: string;
  autorNome: string;
  autorPapel: string;
  dataHora: string;
  titulo: string;
  conteudo: string;
  anexos?: MaterialApoio[];
}

export interface HistoricoEnvioAluno {
  versao: number;
  arquivoNome: string;
  data: string;
  status: string;
  notaOuParecer?: string;
}

export type ColunaKanbanKey =
  | "Pendente"
  | "Em andamento"
  | "Para correção"
  | "Em correção"
  | "Concluído";

export function mapStatusParaColuna(status: string): ColunaKanbanKey {
  switch (status) {
    case "AGUARDANDO_ENVIO":
    case "ATRASADA":
      return "Pendente";
    case "EM_ANDAMENTO":
      return "Em andamento";
    case "PRONTA_PARA_REVISAO":
      return "Para correção";
    case "EM_REVISAO":
    case "SOLICITADA_CORRECAO":
      return "Em correção";
    case "CONCLUIDA":
      return "Concluído";
    default:
      return "Pendente";
  }
}

export function slugDoMarco(titulo: string, idx: number): string {
  const normalizado = titulo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
  return normalizado || `etapa-${idx + 1}`;
}

export interface SalaEtapaTcc {
  slug: string;
  titulo: string;
  progresso: number;
  dataEntrega: string;
  statusKanban: ColunaKanbanKey;
  comentarioOrientadora: string;
  descricaoInstrucoes: string;
  postagensProfessor: PostagemSala[];
  materiaisFixados: MaterialApoio[];
  historicoEnvios: HistoricoEnvioAluno[];
}

export const SALAS_ETAPAS_MOCK: SalaEtapaTcc[] = [];
export const ETAPAS_ALUNO_MOCK = SALAS_ETAPAS_MOCK;
