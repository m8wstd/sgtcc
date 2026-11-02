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
  // ── 1. CONCLUÍDO (3 Blocos) ────────────────────────────────────────────────
  {
    slug: "definicao-tema",
    titulo: "Definição do Tema e Problema de Pesquisa",
    progresso: 100,
    dataEntrega: "05/06/2026",
    statusKanban: "Concluído",
    comentarioOrientadora: "Excelente delimitação do problema e justificativa técnica muito sólida.",
    descricaoInstrucoes:
      "Alinhamento da proposta de pesquisa, questão central, hipóteses e relevância acadêmica e profissional.",
    materiaisFixados: [
      {
        id: "mat-dt-1",
        nome: "Guia_Escolha_Tema_TCC.pdf",
        tamanho: "320 KB",
        tipo: "PDF",
        url: "#",
      },
    ],
    postagensProfessor: [
      {
        id: "post-dt-1",
        autorNome: "Prof.ª Joana Jordão",
        autorPapel: "Professora Orientadora",
        dataHora: "01/06/2026 às 09:00",
        titulo: "Validação do Tema de Pesquisa",
        conteudo:
          "Parabéns pelo tema escolhido! A proposta é extremamente relevante para a gestão de TCC e atende às diretrizes do curso.",
      },
    ],
    historicoEnvios: [
      {
        versao: 1,
        arquivoNome: "Proposta_Tema_Jorge.pdf",
        data: "04/06/2026 14:00",
        status: "Aprovado",
        notaOuParecer: "Tema aprovado com louvor.",
      },
    ],
  },
  {
    slug: "plano-trabalho",
    titulo: "Plano de Trabalho e Termo de Compromisso",
    progresso: 100,
    dataEntrega: "20/06/2026",
    statusKanban: "Concluído",
    comentarioOrientadora: "Documento de plano de trabalho e termo de orientação homologados pela coordenação.",
    descricaoInstrucoes:
      "Sala inicial de alinhamento de escopo, objetivos preliminares e assinatura do Termo de Compromisso de Orientação de TCC.",
    materiaisFixados: [
      {
        id: "mat-pt-1",
        nome: "Termo_Compromisso_Orientacao_Assinado.pdf",
        tamanho: "340 KB",
        tipo: "PDF",
        url: "#",
      },
      {
        id: "mat-pt-2",
        nome: "Cronograma_Geral_Semestral_2026_2.pdf",
        tamanho: "490 KB",
        tipo: "PDF",
        url: "#",
      },
    ],
    postagensProfessor: [
      {
        id: "post-pt-1",
        autorNome: "Prof.ª Joana Jordão",
        autorPapel: "Professora Orientadora",
        dataHora: "10/06/2026 às 10:00",
        titulo: "Início Oficial do Período de Orientação",
        conteudo:
          "O seu plano de trabalho foi revisado e aprovado com sucesso. As etapas e prazos do semestre já estão sincronizados.",
      },
    ],
    historicoEnvios: [
      {
        versao: 1,
        arquivoNome: "Plano_Trabalho_Jorge_v1.pdf",
        data: "18/06/2026 15:30",
        status: "Homologado",
        notaOuParecer: "Aprovado pela coordenação do curso.",
      },
    ],
  },
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
        titulo: "Bem-vindos à Etapa: Estrutura da Introdução",
        conteudo:
          "Olá! Disponibilizei nos anexos o modelo em Word e o guia de escrita científica. Lembrem-se de que a contextualização deve levar de forma natural ao problema da pesquisa. O prazo final desta sala é 15/07.",
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
        arquivoNome: "Introducao_v1_Jorge.docx",
        data: "14/07/2026 18:20",
        status: "Concluído",
        notaOuParecer: "Aprovado sem ressalvas. Nota: 10.0",
      },
    ],
  },

  // ── 2. EM CORREÇÃO (2 Blocos) ──────────────────────────────────────────────
  {
    slug: "revisao-abnt",
    titulo: "Revisão Textual e Normas ABNT",
    progresso: 70,
    dataEntrega: "20/09/2026",
    statusKanban: "Em correção",
    comentarioOrientadora: "Ajustando formatação das tabelas e citações no padrão institucional.",
    descricaoInstrucoes:
      "Sala de revisão gramatical, padronização de sumário, numeração progressiva de seções, referências bibliográficas e normas institucionais do Ifes.",
    materiaisFixados: [
      {
        id: "mat-abnt-1",
        nome: "Manual_Normatizacao_TCC_Ifes.pdf",
        tamanho: "2.1 MB",
        tipo: "PDF",
        url: "#",
      },
    ],
    postagensProfessor: [
      {
        id: "post-abnt-1",
        autorNome: "Prof.ª Joana Jordão",
        autorPapel: "Professora Orientadora",
        dataHora: "15/09/2026 às 14:00",
        titulo: "Checklist de Formatação ABNT",
        conteudo:
          "Estou revisando as margens (superior/esquerda 3cm, inferior/direita 2cm), espaçamento 1,5 entre linhas e fontes permitidas (Arial ou Times New Roman 12). Acompanhem as notas no arquivo compartilhado.",
      },
    ],
    historicoEnvios: [
      {
        versao: 1,
        arquivoNome: "Capitulos_Unificados_v1.docx",
        data: "14/09/2026 18:30",
        status: "Em Correção pelo Orientador",
        notaOuParecer: "Professora inserindo comentários e correções em vermelho.",
      },
    ],
  },
  {
    slug: "capitulos-integrados",
    titulo: "Capítulos 1 e 2 Integrados",
    progresso: 65,
    dataEntrega: "18/09/2026",
    statusKanban: "Em correção",
    comentarioOrientadora: "Orientadora inserindo notas e sugestões de reescrita nos parágrafos introdutórios.",
    descricaoInstrucoes:
      "Unificação do capítulo de introdução com a fundamentação teórica para garantir a fluidez da leitura acadêmica.",
    materiaisFixados: [
      {
        id: "mat-ci-1",
        nome: "Roteiro_Coesao_Textual_Academica.pdf",
        tamanho: "410 KB",
        tipo: "PDF",
        url: "#",
      },
    ],
    postagensProfessor: [
      {
        id: "post-ci-1",
        autorNome: "Prof.ª Joana Jordão",
        autorPapel: "Professora Orientadora",
        dataHora: "16/09/2026 às 11:30",
        titulo: "Revisão da Transição entre Seções",
        conteudo:
          "Estou realizando a leitura integrada dos capítulos 1 e 2. Até o final do dia envio o documento com as anotações.",
      },
    ],
    historicoEnvios: [
      {
        versao: 1,
        arquivoNome: "Capitulos_1_e_2_Jorge_rev.docx",
        data: "17/09/2026 09:40",
        status: "Em Análise pela Orientadora",
        notaOuParecer: "Leitura em andamento.",
      },
    ],
  },

  // ── 3. PARA CORREÇÃO (3 Blocos) ────────────────────────────────────────────
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
          "Prezados, deem prioridade para artigos publicados entre 2021 e 2026 nas bases IEEE Xplore, Scopus e SciELO. Evitem citações excessivas de websites informais.",
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
        notaOuParecer: "Inclua mais fontes dos últimos cinco anos na seção 2.3.",
      },
      {
        versao: 2,
        arquivoNome: "Referencial_Teorico_v2_com_novas_fontes.pdf",
        data: "12/08/2026 21:10",
        status: "Aguardando Revisão",
        notaOuParecer: "Arquivo submetido pelo aluno. Aguardando leitura da orientadora.",
      },
    ],
  },
  {
    slug: "trabalhos-correlatos",
    titulo: "Trabalhos Correlatos",
    progresso: 75,
    dataEntrega: "20/08/2026",
    statusKanban: "Para correção",
    comentarioOrientadora: "Adicionar tabela comparativa dos diferenciais da ferramenta.",
    descricaoInstrucoes:
      "Mapeamento sistemático de soluções semelhantes e identificação das lacunas atendidas pela pesquisa.",
    materiaisFixados: [
      {
        id: "mat-tc-1",
        nome: "Template_Quadro_Comparativo.xlsx",
        tamanho: "190 KB",
        tipo: "XLSX",
        url: "#",
      },
    ],
    postagensProfessor: [
      {
        id: "post-tc-1",
        autorNome: "Prof.ª Joana Jordão",
        autorPapel: "Professora Orientadora",
        dataHora: "14/08/2026 às 10:10",
        titulo: "Quadro Comparativo de Soluções",
        conteudo:
          "Construa uma tabela sintetizando pelo menos 4 soluções de mercado ou acadêmicas, evidenciando pontos fortes e limitações.",
      },
    ],
    historicoEnvios: [
      {
        versao: 1,
        arquivoNome: "Quadro_Correlatos_v1.pdf",
        data: "19/08/2026 16:20",
        status: "Para Correção",
        notaOuParecer: "Ajustar critérios de pontuação da tabela comparativa.",
      },
    ],
  },
  {
    slug: "resumo-abstract",
    titulo: "Resumo e Abstract",
    progresso: 60,
    dataEntrega: "25/08/2026",
    statusKanban: "Para correção",
    comentarioOrientadora: "Revisar síntese dos objetivos no resumo em inglês (Abstract).",
    descricaoInstrucoes:
      "Sala para redação do resumo em língua vernácula (Português) e em língua estrangeira (Inglês), acompanhado de 3 a 5 palavras-chave.",
    materiaisFixados: [
      {
        id: "mat-ra-1",
        nome: "Guia_Redacao_Resumo_ABNT_NBR_6028.pdf",
        tamanho: "380 KB",
        tipo: "PDF",
        url: "#",
      },
    ],
    postagensProfessor: [
      {
        id: "post-ra-1",
        autorNome: "Prof.ª Joana Jordão",
        autorPapel: "Professora Orientadora",
        dataHora: "18/08/2026 às 11:20",
        titulo: "Estrutura Padrão do Resumo",
        conteudo:
          "O resumo deve conter de 150 a 500 palavras em parágrafo único, cobrindo contexto, objetivo, método, principais resultados e conclusão. Evitem tradutores automáticos literais no abstract.",
      },
    ],
    historicoEnvios: [
      {
        versao: 1,
        arquivoNome: "Resumo_e_Abstract_v1.docx",
        data: "24/08/2026 17:00",
        status: "Em Correção",
        notaOuParecer: "Ajustar a tradução dos termos técnicos na versão em inglês.",
      },
    ],
  },

  // ── 4. EM ANDAMENTO (3 Blocos) ─────────────────────────────────────────────
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
      {
        id: "post-5b",
        autorNome: "Prof.ª Joana Jordão",
        autorPapel: "Professora Orientadora",
        dataHora: "28/08/2026 às 15:30",
        titulo: "Definição Clara da Amostra",
        conteudo:
          "Atenção para quem aplicará questionário com alunos ou professores: explicitem quantos participantes pretendem atingir e os critérios de inclusão e exclusão.",
      },
    ],
    historicoEnvios: [
      {
        versao: 1,
        arquivoNome: "Rascunho_Metodologia_v1.pdf",
        data: "05/09/2026 11:15",
        status: "Em Análise",
        notaOuParecer: "Em análise pela orientadora. Aguardando detalhamento amostral.",
      },
    ],
  },
  {
    slug: "prototipacao-testes",
    titulo: "Prototipação e Testes de Usabilidade",
    progresso: 40,
    dataEntrega: "22/09/2026",
    statusKanban: "Em andamento",
    comentarioOrientadora: "Aplicar o questionário SUS com pelo menos 10 usuários para validar o fluxo.",
    descricaoInstrucoes:
      "Desenvolvimento dos protótipos de alta fidelidade e realização de baterias de testes com usuários reais.",
    materiaisFixados: [
      {
        id: "mat-proto-1",
        nome: "Escala_SUS_Questionario_Usabilidade.pdf",
        tamanho: "280 KB",
        tipo: "PDF",
        url: "#",
      },
    ],
    postagensProfessor: [
      {
        id: "post-proto-1",
        autorNome: "Prof.ª Joana Jordão",
        autorPapel: "Professora Orientadora",
        dataHora: "08/09/2026 às 14:00",
        titulo: "Aplicação do Questionário SUS",
        conteudo:
          "Utilize o modelo da escala SUS padronizada de 10 perguntas. Documente o tempo de execução de cada tarefa pelos alunos testadores.",
      },
    ],
    historicoEnvios: [
      {
        versao: 1,
        arquivoNome: "Relatorio_Preliminar_Usabilidade.pdf",
        data: "18/09/2026 16:30",
        status: "Em Testes",
        notaOuParecer: "Primeiros 5 testes concluídos com sucesso.",
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
    historicoEnvios: [
      {
        versao: 1,
        arquivoNome: "Tabulacao_Preliminar_Dados.xlsx",
        data: "20/09/2026 16:50",
        status: "Em Elaboração",
        notaOuParecer: "Planilha com primeiras respostas coletadas.",
      },
    ],
  },

  // ── 5. PENDENTE (3 Blocos) ─────────────────────────────────────────────────
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
  {
    slug: "apresentacao-banca",
    titulo: "Apresentação e Defesa na Banca",
    progresso: 0,
    dataEntrega: "15/11/2026",
    statusKanban: "Pendente",
    comentarioOrientadora: "Aguardando homologação final do manuscrito da monografia.",
    descricaoInstrucoes:
      "Ambiente de submissão dos slides de defesa, agendamento de data/horário da banca avaliadora e envio da ata final.",
    materiaisFixados: [
      {
        id: "mat-banca-1",
        nome: "Modelo_Oficial_Slides_Defesa_TCC.pptx",
        tamanho: "4.2 MB",
        tipo: "PPTX",
        url: "#",
      },
    ],
    postagensProfessor: [
      {
        id: "post-banca-1",
        autorNome: "Prof.ª Joana Jordão",
        autorPapel: "Professora Orientadora",
        dataHora: "05/10/2026 às 16:00",
        titulo: "Orientações para a Apresentação Oral",
        conteudo:
          "O tempo de fala para o aluno será de exatamente 20 minutos, seguido por 20 minutos de arguição dos membros da banca examinadora.",
      },
    ],
    historicoEnvios: [],
  },
  {
    slug: "entrega-biblioteca",
    titulo: "Entrega Final na Biblioteca e Ficha Catalográfica",
    progresso: 0,
    dataEntrega: "05/12/2026",
    statusKanban: "Pendente",
    comentarioOrientadora: "Aguardando aprovação e assinatura da ata pela banca examinadora.",
    descricaoInstrucoes:
      "Emissão da ficha catalográfica com a bibliotecária e submissão da versão final no Repositório Institucional do Ifes (RI-Ifes).",
    materiaisFixados: [
      {
        id: "mat-bib-1",
        nome: "Formulario_Solicitacao_Ficha_Catalografica.pdf",
        tamanho: "220 KB",
        tipo: "PDF",
        url: "#",
      },
    ],
    postagensProfessor: [
      {
        id: "post-bib-1",
        autorNome: "Prof.ª Joana Jordão",
        autorPapel: "Professora Orientadora",
        dataHora: "20/10/2026 às 10:00",
        titulo: "Procedimentos Pós-Defesa",
        conteudo:
          "Após a aprovação na banca, vocês terão 15 dias corridos para inserir a ficha catalográfica na página 2 e submeter no repositório institucional.",
      },
    ],
    historicoEnvios: [],
  },
];

// Alias para compatibilidade
export const ETAPAS_ALUNO_MOCK = SALAS_ETAPAS_MOCK;
export type EtapaTcc = SalaEtapaTcc;
