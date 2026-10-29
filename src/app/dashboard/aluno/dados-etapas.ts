export interface MaterialApoio {
  id: string;
  nome: string;
  tamanho: string;
  tipo: string;
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

export interface SalaEtapaTcc {
  slug: string;
  titulo: string;
  progresso: number;
  dataEntrega: string;
  statusKanban: "Pendente" | "Em andamento" | "Para correção" | "Em correção" | "Concluído";
  comentarioOrientadora: string;
  descricaoInstrucoes: string;
  postagensProfessor: PostagemSala[];
  materiaisFixados: MaterialApoio[];
  historicoEnvios: HistoricoEnvioAluno[];
}

export const SALAS_ETAPAS_MOCK: SalaEtapaTcc[] = [
  {
    slug: "introducao",
    titulo: "Introdução",
    progresso: 100,
    dataEntrega: "15/07/2026",
    statusKanban: "Concluído",
    comentarioOrientadora: "Boa delimitação do problema e objetivos bem claros.",
    descricaoInstrucoes:
      "Nesta sala, o professor disponibiliza o modelo institucional da introdução, critérios de avaliação do problema e objetivos da pesquisa. O aluno realiza o upload do capítulo para correção.",
    materiaisFixados: [
      {
        id: "mat-1",
        nome: "Modelo_ABNT_Introducao_TCC.docx",
        tamanho: "1.2 MB",
        tipo: "DOCX",
        url: "#",
      },
      {
        id: "mat-2",
        nome: "Guia_Pratico_Escrita_Cientifica.pdf",
        tamanho: "850 KB",
        tipo: "PDF",
        url: "#",
      },
    ],
    postagensProfessor: [
      {
        id: "post-1",
        autorNome: "Prof.ª Joana Jordão",
        autorPapel: "Professora Orientadora",
        dataHora: "02/07/2026 às 14:30",
        titulo: "Bem-vindos à Etapa 1: Estrutura da Introdução",
        conteudo:
          "Olá! Disponibilizei nos anexos o modelo em Word e o guia de escrita científica. Lembrem-se de que a contextualização deve levar de forma natural ao problema da pesquisa. O prazo final desta sala é 15/07.",
        anexos: [
          {
            id: "anx-1",
            nome: "Rubrica_Avaliacao_Introducao.pdf",
            tamanho: "320 KB",
            tipo: "PDF",
            url: "#",
          },
        ],
      },
      {
        id: "post-2",
        autorNome: "Prof.ª Joana Jordão",
        autorPapel: "Professora Orientadora",
        dataHora: "16/07/2026 às 10:15",
        titulo: "Aprovação do Bloco de Introdução",
        conteudo:
          "Parabéns! A introdução foi avaliada e considerada concluída com êxito. O problema está bem delimitado e os objetivos específicos respondem adequadamente à questão central.",
      },
    ],
    historicoEnvios: [
      {
        versao: 1,
        arquivoNome: "Introducao_v1_rev.docx",
        data: "14/07/2026 18:20",
        status: "Concluído",
        notaOuParecer: "Aprovado sem ressalvas.",
      },
    ],
  },
  {
    slug: "referencial-teorico",
    titulo: "Referencial teórico",
    progresso: 85,
    dataEntrega: "12/08/2026",
    statusKanban: "Para correção",
    comentarioOrientadora: "Inclua mais fontes dos últimos cinco anos.",
    descricaoInstrucoes:
      "Sala destinada à fundamentação teórico-conceitual do trabalho. Postagens com bases de dados recomendadas, gerenciadores de referências e orientações para citações diretas e indiretas.",
    materiaisFixados: [
      {
        id: "mat-3",
        nome: "Artigos_Recomendados_Base_Scielo.pdf",
        tamanho: "3.4 MB",
        tipo: "PDF",
        url: "#",
      },
      {
        id: "mat-4",
        nome: "Tutorial_Mendeley_Citacoes.pdf",
        tamanho: "1.1 MB",
        tipo: "PDF",
        url: "#",
      },
    ],
    postagensProfessor: [
      {
        id: "post-3",
        autorNome: "Prof.ª Joana Jordão",
        autorPapel: "Professora Orientadora",
        dataHora: "20/07/2026 às 09:10",
        titulo: "Fontes de Pesquisa e Periódicos Qualificados",
        conteudo:
          "Prezados, deem prioridade para artigos publicados entre 2021 e 2026 nas bases IEEE, Scopus e SciELO. Evitem citações excessivas de websites informais.",
      },
      {
        id: "post-4",
        autorNome: "Prof.ª Joana Jordão",
        autorPapel: "Professora Orientadora",
        dataHora: "11/08/2026 às 16:45",
        titulo: "Ajuste Necessário na Seção 2.3",
        conteudo:
          "Revisei a primeira versão enviada. A estrutura está coerente, mas precisamos reforçar os trabalhos correlatos dos últimos 5 anos. Façam o reenvio corrigido nesta sala.",
      },
    ],
    historicoEnvios: [
      {
        versao: 1,
        arquivoNome: "Referencial_Teorico_v1.pdf",
        data: "10/08/2026 15:40",
        status: "Correção Solicitada",
        notaOuParecer: "Inclua mais fontes dos últimos cinco anos.",
      },
    ],
  },
  {
    slug: "metodologia",
    titulo: "Metodologia",
    progresso: 50,
    dataEntrega: "09/09/2026",
    statusKanban: "Em andamento",
    comentarioOrientadora: "Detalhe os critérios de seleção da amostra.",
    descricaoInstrucoes:
      "Sala da definição do percurso metodológico: classificação da pesquisa, população e amostra, instrumentos de coleta e procedimentos de análise.",
    materiaisFixados: [
      {
        id: "mat-5",
        nome: "Roteiro_Aprovacao_Comite_Etica.pdf",
        tamanho: "420 KB",
        tipo: "PDF",
        url: "#",
      },
      {
        id: "mat-6",
        nome: "Exemplo_Metodologia_Quali_Quanti.docx",
        tamanho: "980 KB",
        tipo: "DOCX",
        url: "#",
      },
    ],
    postagensProfessor: [
      {
        id: "post-5",
        autorNome: "Prof.ª Joana Jordão",
        autorPapel: "Professora Orientadora",
        dataHora: "15/08/2026 às 11:00",
        titulo: "Orientações sobre o Comitê de Ética e Coleta",
        conteudo:
          "Se a pesquisa envolver aplicação de questionários ou entrevistas com seres humanos, consultem o roteiro do comitê de ética anexado. Detalhem com clareza o tamanho amostral.",
      },
    ],
    historicoEnvios: [
      {
        versao: 1,
        arquivoNome: "Rascunho_Metodologia.pdf",
        data: "05/09/2026 11:15",
        status: "Em Análise",
      },
    ],
  },
  {
    slug: "resultados",
    titulo: "Resultados",
    progresso: 10,
    dataEntrega: "07/10/2026",
    statusKanban: "Em andamento",
    comentarioOrientadora: "Aguardando dados para a análise.",
    descricaoInstrucoes:
      "Sala para triangulação e apresentação dos resultados obtidos, acompanhados de gráficos, quadros e discussão fundamentada.",
    materiaisFixados: [
      {
        id: "mat-7",
        nome: "Planilha_Template_Tabulacao_Dados.xlsx",
        tamanho: "540 KB",
        tipo: "XLSX",
        url: "#",
      },
    ],
    postagensProfessor: [
      {
        id: "post-6",
        autorNome: "Prof.ª Joana Jordão",
        autorPapel: "Professora Orientadora",
        dataHora: "10/09/2026 às 15:20",
        titulo: "Template para Tabulação de Dados",
        conteudo:
          "Disponibilizei a planilha modelo para organização dos dados brutos. Lembrem-se de cruzar os achados com os autores citados no referencial teórico.",
      },
    ],
    historicoEnvios: [],
  },
  {
    slug: "conclusao",
    titulo: "Conclusão",
    progresso: 0,
    dataEntrega: "28/10/2026",
    statusKanban: "Pendente",
    comentarioOrientadora: "Bloco ainda não iniciado.",
    descricaoInstrucoes:
      "Sala da entrega final das considerações finais, limitações do estudo e proposição de trabalhos futuros.",
    materiaisFixados: [
      {
        id: "mat-8",
        nome: "Instrucoes_Consideracoes_Finais.pdf",
        tamanho: "310 KB",
        tipo: "PDF",
        url: "#",
      },
    ],
    postagensProfessor: [
      {
        id: "post-7",
        autorNome: "Prof.ª Joana Jordão",
        autorPapel: "Professora Orientadora",
        dataHora: "01/10/2026 às 08:30",
        titulo: "Abertura da Sala de Conclusão",
        conteudo:
          "A conclusão deve sintetizar como cada objetivo específico foi atingido. Evitem incluir dados ou teorias novas que não foram abordados anteriormente.",
      },
    ],
    historicoEnvios: [],
  },
];

// Alias para compatibilidade
export const ETAPAS_ALUNO_MOCK = SALAS_ETAPAS_MOCK;
export type EtapaTcc = SalaEtapaTcc;
