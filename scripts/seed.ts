import { config } from "dotenv";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

config({ path: ".env.local" });

const SENHA = process.env.SEED_PASSWORD;
if (!SENHA) {
  throw new Error("Defina SEED_PASSWORD no .env.local antes de rodar o seed.");
}

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
});

const auth = getAuth();
const db = getFirestore();

type Perfil = "ADMIN" | "COORDENACAO" | "ORIENTADOR" | "AVALIADOR" | "ALUNO";

async function criarUsuario(
  nome: string,
  email: string,
  perfil: Perfil,
  matricula?: string
) {
  let uid: string;
  try {
    uid = (await auth.getUserByEmail(email)).uid;
    await auth.updateUser(uid, { password: SENHA, displayName: nome });
  } catch {
    uid = (await auth.createUser({ email, password: SENHA, displayName: nome })).uid;
  }
  await auth.setCustomUserClaims(uid, { perfil, ...(matricula && { matricula }) });
  await db.collection("usuarios").doc(uid).set({ id: uid, nome, email, perfil });
  return uid;
}

// ---------- Dados de demonstração da banca (Professor Avaliador) ----------

const DIA_MS = 24 * 60 * 60 * 1000;
/** Datas relativas a "agora": o painel da banca sempre mostra prazos próximos e passados. */
const emDias = (n: number) => Timestamp.fromDate(new Date(Date.now() + n * DIA_MS));

/** PDF mínimo válido (1 página, só ASCII) para o leitor embutido da sala da banca. */
function gerarPdf(linhas: string[]): Buffer {
  const esc = (t: string) =>
    t
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/[^\x20-\x7e]/g, "?")
      .replace(/([\\()])/g, "\\$1");
  const fluxo = ["BT", "/F1 14 Tf", "72 760 Td", "22 TL", ...linhas.flatMap((l) => [`(${esc(l)}) Tj`, "T*"]), "ET"].join("\n");
  const objetos = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(fluxo)} >>\nstream\n${fluxo}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objetos.forEach((o, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

async function enviarPdf(caminho: string, linhas: string[]) {
  try {
    await getStorage().bucket().file(caminho).save(gerarPdf(linhas), {
      contentType: "application/pdf",
      resumable: false,
    });
  } catch (e) {
    console.warn(`Aviso: não consegui enviar ${caminho} ao Storage (${(e as Error).message}).`);
  }
}

type DecisaoSeed = "APROVADO" | "APROVADO_RESSALVAS" | "REPROVADO";
interface AvaliacaoSeed {
  avaliador: string; // uid
  status: "RASCUNHO" | "FINALIZADA";
  nota?: number;
  decisao?: DecisaoSeed;
  parecer: string;
}
interface TccBancaSeed {
  chave: string;
  matricula: string;
  titulo: string;
  fase: 1 | 2;
  curso: string;
  statusGeral: "EM_ANDAMENTO" | "AGUARDANDO_BANCA" | "DEFENDIDO" | "APROVADO" | "REPROVADO";
  orientador: string;
  avaliadores: string[];
  defesaEmDias: number;
  /** null = o aluno ainda não enviou a versão final */
  versaoFinal: { versoes: number; enviadoHaDias: number } | null;
  avaliacoes: AvaliacaoSeed[];
}

async function main() {
  // 1. Usuários (Auth + claims + doc em /usuarios)
  await criarUsuario("Administrador", "admin@teste.sgtcc.dev", "ADMIN");
  const claudio = await criarUsuario("Cláudio Carvalho", "claudio@teste.sgtcc.dev", "COORDENACAO");
  const joana = await criarUsuario("Joana Jordão", "joana@teste.sgtcc.dev", "ORIENTADOR");
  const orient2 = await criarUsuario("Orientador Antigo", "orientador2@teste.sgtcc.dev", "ORIENTADOR");
  const silvia = await criarUsuario("Silvia Silva", "silvia@teste.sgtcc.dev", "AVALIADOR");
  const jorge = await criarUsuario("Jorge", "jorge@teste.sgtcc.dev", "ALUNO", "2026001");
  const maria = await criarUsuario("Maria", "maria@teste.sgtcc.dev", "ALUNO", "2026002");

  // Elenco extra para o painel da banca
  const roberto = await criarUsuario("Roberto Alves", "roberto@teste.sgtcc.dev", "AVALIADOR");
  const orientMarcos = await criarUsuario("Marcos Tavares", "marcos@teste.sgtcc.dev", "ORIENTADOR");
  const extras = [
    { nome: "Carlos Mendes", email: "carlos@teste.sgtcc.dev", matricula: "2026003" },
    { nome: "Fernanda Lima", email: "fernanda@teste.sgtcc.dev", matricula: "2026004" },
    { nome: "Rafael Souza", email: "rafael@teste.sgtcc.dev", matricula: "2026005" },
    { nome: "Beatriz Costa", email: "beatriz@teste.sgtcc.dev", matricula: "2026006" },
    { nome: "Lucas Pereira", email: "lucas@teste.sgtcc.dev", matricula: "2026007" },
  ];
  const uidAluno: Record<string, string> = {};
  for (const a of extras) uidAluno[a.matricula] = await criarUsuario(a.nome, a.email, "ALUNO", a.matricula);

  // 2. Tabelas de papel (conforme o ER)
  await db.collection("coordenadores").doc(claudio).set({
    id: claudio,
    usuario_id: claudio,
    cursos: ["Engenharia de Software", "Sistemas de Informação"],
  });
  await db.collection("professores_orientadores").doc(joana).set({
    id: joana,
    usuario_id: joana,
    cursos: ["Engenharia de Software", "Sistemas de Informação"],
  });
  await db.collection("professores_orientadores").doc(orient2).set({
    id: orient2,
    usuario_id: orient2,
    cursos: ["Engenharia de Software"],
  });
  await db.collection("professores_orientadores").doc(orientMarcos).set({
    id: orientMarcos,
    usuario_id: orientMarcos,
    cursos: ["Engenharia de Software", "Ciência da Computação"],
  });
  await db.collection("professores_avaliadores").doc(silvia).set({
    id: silvia,
    usuario_id: silvia,
    cursos: ["Engenharia de Software", "Sistemas de Informação"],
  });
  await db.collection("professores_avaliadores").doc(roberto).set({
    id: roberto,
    usuario_id: roberto,
    cursos: ["Engenharia de Software"],
  });

  await db.collection("alunos").doc("2026001").set({
    matricula: "2026001",
    usuario_id: jorge,
    curso: "Engenharia de Software",
  });
  await db.collection("alunos").doc("2026002").set({
    matricula: "2026002",
    usuario_id: maria,
    curso: "Engenharia de Software",
  });

  const cursosExtras = [
    "Engenharia de Software",
    "Engenharia de Software",
    "Sistemas de Informação",
    "Sistemas de Informação",
    "Engenharia de Software",
  ];
  for (let idx = 0; idx < extras.length; idx++) {
    const a = extras[idx];
    await db.collection("alunos").doc(a.matricula).set({
      matricula: a.matricula,
      usuario_id: uidAluno[a.matricula],
      curso: cursosExtras[idx] ?? "Engenharia de Software",
    });
  }

  // 3. Cronograma e marcos com etapas acadêmicas padrão para TCC 1 e TCC 2
  await db.collection("cronogramas").doc("2026-2").set({ id: "2026-2", semestre: "2026.2" });
  const marcos = [
    // ── TCC 1: Planejamento / Pré-Projeto ──────────────────────────────
    {
      id: "tcc1-tema-orientador",
      titulo: "Escolha do Tema e do Orientador",
      dataLimite: "2026-07-20",
      fase: 1,
      ordem: 1,
      tipo: "COMUM",
      exigeArquivo: true,
      descricao: "Definição da área de interesse e convite formal ao professor orientador.",
    },
    {
      id: "tcc1-problema",
      titulo: "Delimitação do Problema de Pesquisa",
      dataLimite: "2026-08-05",
      fase: 1,
      ordem: 2,
      tipo: "COMUM",
      exigeArquivo: true,
      descricao: "Transformar o tema em uma pergunta específica a ser respondida.",
    },
    {
      id: "tcc1-objetivos",
      titulo: "Construção dos Objetivos (Geral e Específicos)",
      dataLimite: "2026-08-20",
      fase: 1,
      ordem: 3,
      tipo: "COMUM",
      exigeArquivo: true,
      descricao: "Definição do objetivo geral e passos necessários para atingi-lo.",
    },
    {
      id: "tcc1-justificativa",
      titulo: "Justificativa da Pesquisa",
      dataLimite: "2026-09-05",
      fase: 1,
      ordem: 4,
      tipo: "COMUM",
      exigeArquivo: true,
      descricao: "Explicar a relevância científica, social ou mercadológica do tema.",
    },
    {
      id: "tcc1-fundamentacao-teorica",
      titulo: "Fundamentação Teórica (Revisão Bibliográfica)",
      dataLimite: "2026-09-25",
      fase: 1,
      ordem: 5,
      tipo: "COMUM",
      exigeArquivo: true,
      descricao: "Levantamento bibliográfico e revisão dos principais autores.",
    },
    {
      id: "tcc1-metodologia",
      titulo: "Metodologia Proposta",
      dataLimite: "2026-10-15",
      fase: 1,
      ordem: 6,
      tipo: "COMUM",
      exigeArquivo: true,
      descricao: "Planejamento detalhado da coleta e análise futura de dados.",
    },
    {
      id: "tcc1-cronograma-orcamento",
      titulo: "Cronograma e Orçamento de Execução",
      dataLimite: "2026-11-05",
      fase: 1,
      ordem: 7,
      tipo: "COMUM",
      exigeArquivo: true,
      descricao: "Planejamento de tempo para o TCC 2 e custos estimados.",
    },
    {
      id: "qualificacao",
      titulo: "Entrega do Projeto e Qualificação do TCC 1",
      dataLimite: "2026-11-20",
      fase: 1,
      ordem: 8,
      tipo: "COMUM",
      exigeArquivo: true,
      descricao: "Apresentação e avaliação do anteprojeto para autorização da fase de execução.",
    },

    // ── TCC 2: Execução / Trabalho Final ───────────────────────────────
    {
      id: "tcc2-ajuste-metodologia",
      titulo: "Ajuste do TCC 1 e Mudança de Tempo Verbal",
      dataLimite: "2026-08-01",
      fase: 2,
      ordem: 1,
      tipo: "COMUM",
      exigeArquivo: true,
      descricao: "Ajustes com base no feedback da qualificação e transição para o tempo passado.",
    },
    {
      id: "tcc2-coleta-dados",
      titulo: "Coleta de Dados e Trabalho de Campo",
      dataLimite: "2026-08-25",
      fase: 2,
      ordem: 2,
      tipo: "COMUM",
      exigeArquivo: true,
      descricao: "Execução dos experimentos, questionários ou aprofundamento literário.",
    },
    {
      id: "tcc2-analise-discussao",
      titulo: "Análise e Discussão dos Resultados",
      dataLimite: "2026-09-20",
      fase: 2,
      ordem: 3,
      tipo: "COMUM",
      exigeArquivo: true,
      descricao: "Cruzamento dos resultados obtidos com o referencial teórico.",
    },
    {
      id: "tcc2-conclusao",
      titulo: "Considerações Finais e Conclusão",
      dataLimite: "2026-10-10",
      fase: 2,
      ordem: 4,
      tipo: "COMUM",
      exigeArquivo: true,
      descricao: "Síntese dos achados, limitações da pesquisa e recomendações.",
    },
    {
      id: "tcc2-formatacao-abnt",
      titulo: "Formatação Final e Normas ABNT",
      dataLimite: "2026-10-30",
      fase: 2,
      ordem: 5,
      tipo: "COMUM",
      exigeArquivo: true,
      descricao: "Adequação de referências, citações, sumário e elementos pré/pós-textuais.",
    },
    {
      id: "entrega-final",
      titulo: "Entrega da Versão de Avaliação à Banca",
      dataLimite: "2026-11-10",
      fase: 2,
      ordem: 6,
      tipo: "ENTREGA_FINAL",
      exigeArquivo: true,
      bloqueioEstrito: true,
      descricao: "Envio do documento completo aos membros da banca examinadora.",
    },
    {
      id: "defesa",
      titulo: "Defesa Oral perante a Banca",
      dataLimite: "2026-11-25",
      fase: 2,
      ordem: 7,
      tipo: "DEFESA",
      exigeArquivo: false,
      descricao: "Apresentação dos resultados perante a banca e arguição.",
    },
    {
      id: "tcc2-deposito-final",
      titulo: "Correções Finais e Depósito Definitivo",
      dataLimite: "2026-12-05",
      fase: 2,
      ordem: 8,
      tipo: "COMUM",
      exigeArquivo: true,
      descricao: "Ajustes solicitados pela banca e entrega da versão definitiva.",
    },
  ];

  for (const m of marcos) {
    await db.collection("marcos_cronograma").doc(m.id).set({
      id: m.id,
      titulo: m.titulo,
      cronograma_id: "2026-2",
      fase: m.fase,
      dataLimite: Timestamp.fromDate(new Date(m.dataLimite + "T23:59:00-03:00")),
      ordem: m.ordem,
      tipo: m.tipo,
      exigeArquivo: m.exigeArquivo,
      descricao: m.descricao,
      bloqueioEstrito: m.id === "entrega-final",
    });

    // Postagem institucional / de orientação inicial do docente no banco
    const postagemId = `post-${m.id}`;
    await db.collection("postagens_etapas").doc(postagemId).set({
      id: postagemId,
      etapa_id: m.id,
      autor_id: joana,
      autorNome: "Prof.ª Joana Jordão",
      autorPapel: "ORIENTADOR",
      titulo: `Orientações: ${m.titulo}`,
      conteudo: m.descricao,
      dataHora: Timestamp.fromDate(new Date("2026-08-01T10:00:00-03:00")),
      anexos: [
        {
          id: `manual-${m.id}`,
          nome: `Diretrizes_${m.id}.pdf`,
          tamanho: "420 KB",
          tipo: "PDF",
          url: "#",
        },
      ],
    });
  }

  // 4. TCCs:
  // Jorge: Concluiu com sucesso o TCC 1 (100% aprovado no semestre anterior) e está no TCC 2 (~63% de progresso na execução)
  await db.collection("tccs").doc("tcc-jorge").set({
    id: "tcc-jorge",
    titulo: "Sistema de Gestão de TCC (SGTCC) - Anteprojeto",
    statusGeral: "APROVADO",
    fase: 1,
    curso: "Engenharia de Software",
    aluno_id: "2026001",
    orientador_id: joana,
    avaliadoresUids: [silvia],
    defesaEm: emDias(-120),
  });
  await db.collection("tccs").doc("tcc-jorge-2").set({
    id: "tcc-jorge-2",
    titulo: "Monografia Final: Sistema de Gestão de TCC",
    statusGeral: "EM_ANDAMENTO",
    fase: 2,
    curso: "Engenharia de Software",
    aluno_id: "2026001",
    orientador_id: joana,
    avaliadoresUids: [silvia],
    defesaEm: emDias(21),
  });
  // Maria: Está cursando o TCC 1, em fase inicial (~25% de progresso)
  await db.collection("tccs").doc("tcc-maria").set({
    id: "tcc-maria",
    titulo: "Análise de Dados Acadêmicos",
    statusGeral: "EM_ANDAMENTO",
    fase: 1,
    curso: "Sistemas de Informação",
    aluno_id: "2026002",
    orientador_id: orient2,
  });

  // 5. Entregas e Histórico Real
  // ── Jorge TCC 1 (Fase 1): 100% CONCLUÍDO (Pré-requisito cumprido para estar no TCC 2)
  const etapasJorge1 = [
    { marcoId: "tcc1-tema-orientador", status: "CONCLUIDA", versao: 1, arquivo: "termo_orientacao_assinado.pdf", fb: "Tema e orientação aprovados com sucesso." },
    { marcoId: "tcc1-problema", status: "CONCLUIDA", versao: 2, arquivo: "problema_pesquisa_v2.pdf", fb: "Excelente recorte do problema de pesquisa." },
    { marcoId: "tcc1-objetivos", status: "CONCLUIDA", versao: 1, arquivo: "objetivos_geral_especificos.pdf", fb: "Objetivos claros e alcançáveis." },
    { marcoId: "tcc1-justificativa", status: "CONCLUIDA", versao: 1, arquivo: "justificativa_aprovada.pdf", fb: "Justificativa muito bem fundamentada." },
    { marcoId: "tcc1-fundamentacao-teorica", status: "CONCLUIDA", versao: 2, arquivo: "revisao_literaria_final.pdf", fb: "Revisão bibliográfica completa com autores recentes." },
    { marcoId: "tcc1-metodologia", status: "CONCLUIDA", versao: 1, arquivo: "metodologia_proposta.pdf", fb: "Metodologia adequada para o desenvolvimento da ferramenta." },
    { marcoId: "tcc1-cronograma-orcamento", status: "CONCLUIDA", versao: 1, arquivo: "cronograma_execucao_tcc2.pdf", fb: "Cronograma realista e bem distribuído." },
    { marcoId: "qualificacao", status: "CONCLUIDA", versao: 1, arquivo: "projeto_completo_qualificacao.pdf", fb: "Projeto aprovado na qualificação com louvor. Liberado para o TCC 2." },
  ];

  for (let i = 0; i < etapasJorge1.length; i++) {
    const e = etapasJorge1[i];
    const entregaId = `entrega-jorge1-${i + 1}`;
    await db.collection("entregas").doc(entregaId).set({
      id: entregaId,
      status: e.status,
      dataSubmissao: emDias(-180 + i * 8),
      marco_id: e.marcoId,
      tcc_id: "tcc-jorge",
    });

    const versaoId = `v${e.versao}-jorge1-${i + 1}`;
    await db.collection("versoes_arquivo").doc(versaoId).set({
      id: versaoId,
      numeroVersao: e.versao,
      arquivoUrl: `tccs/tcc-jorge/entregas/${entregaId}/${e.arquivo}`,
      dataUpload: emDias(-180 + i * 8),
      entrega_id: entregaId,
    });

    if (e.fb) {
      await db.collection("feedbacks").doc(`fb-jorge1-${i + 1}`).set({
        id: `fb-jorge1-${i + 1}`,
        comentario: e.fb,
        data: emDias(-178 + i * 8),
        entrega_id: entregaId,
        autor_id: joana,
      });
    }
  }

  // ── Jorge TCC 2 (Fase 2): Em andamento (~38% de conclusão - 3 etapas concluídas, 1 em correção, 1 para correção, restantes pendentes)
  // Ordem sequencial das 8 etapas do TCC 2:
  // 1. Ajuste do TCC 1 e Mudança de Tempo Verbal -> CONCLUIDA
  // 2. Coleta de Dados e Trabalho de Campo       -> CONCLUIDA
  // 3. Análise e Discussão dos Resultados       -> CONCLUIDA
  // 4. Considerações Finais e Conclusão         -> SOLICITADA_CORRECAO ("Em correção")
  // 5. Formatação Final e Normas ABNT           -> PRONTA_PARA_REVISAO ("Para correção")
  // 6. Entrega da Versão de Avaliação à Banca   -> AGUARDANDO_ENVIO ("Pendente")
  // 7. Defesa Oral perante a Banca              -> AGUARDANDO_ENVIO ("Pendente")
  // 8. Correções Finais e Depósito Definitivo   -> AGUARDANDO_ENVIO ("Pendente")
  const etapasJorge2 = [
    { marcoId: "tcc2-ajuste-metodologia", status: "CONCLUIDA", versao: 1, arquivo: "metodologia_tempo_passado.pdf", fb: "Adaptação correta do tempo verbal da metodologia." },
    { marcoId: "tcc2-coleta-dados", status: "CONCLUIDA", versao: 2, arquivo: "coleta_dados_consolidada.pdf", fb: "Resultados da coleta bem tabulados e documentados." },
    { marcoId: "tcc2-analise-discussao", status: "CONCLUIDA", versao: 1, arquivo: "analise_discussao_resultados.pdf", fb: "Excelente correlação prática com a teoria." },
    { marcoId: "tcc2-conclusao", status: "SOLICITADA_CORRECAO", versao: 1, arquivo: "consideracoes_finais_v1.pdf", fb: "Aprofunde a discussão das limitações encontradas na pesquisa." },
    { marcoId: "tcc2-formatacao-abnt", status: "PRONTA_PARA_REVISAO", versao: 1, arquivo: "previa_formatacao_abnt.pdf" },
  ];

  for (let i = 0; i < etapasJorge2.length; i++) {
    const e = etapasJorge2[i];
    const entregaId = `entrega-jorge2-${i + 1}`;
    await db.collection("entregas").doc(entregaId).set({
      id: entregaId,
      status: e.status,
      dataSubmissao: emDias(-40 + i * 6),
      marco_id: e.marcoId,
      tcc_id: "tcc-jorge-2",
    });

    const versaoId = `v${e.versao}-jorge2-${i + 1}`;
    await db.collection("versoes_arquivo").doc(versaoId).set({
      id: versaoId,
      numeroVersao: e.versao,
      arquivoUrl: `tccs/tcc-jorge-2/entregas/${entregaId}/${e.arquivo}`,
      dataUpload: emDias(-40 + i * 6),
      entrega_id: entregaId,
    });

    if (e.fb) {
      await db.collection("feedbacks").doc(`fb-jorge2-${i + 1}`).set({
        id: `fb-jorge2-${i + 1}`,
        comentario: e.fb,
        data: emDias(-38 + i * 6),
        entrega_id: entregaId,
        autor_id: joana,
      });
    }
  }

  // ── Maria TCC 1 (Fase 1): ~25% de conclusão (2 etapas concluídas, 1 em correção, 1 em andamento/revisão, restantes pendentes)
  // Ordem sequencial das 8 etapas do TCC 1:
  // 1. Escolha do Tema e do Orientador                      -> CONCLUIDA
  // 2. Delimitação do Problema de Pesquisa                  -> CONCLUIDA
  // 3. Construção dos Objetivos (Geral e Específicos)       -> SOLICITADA_CORRECAO ("Em correção")
  // 4. Justificativa da Pesquisa                            -> PRONTA_PARA_REVISAO ("Para correção")
  // 5. Fundamentação Teórica (Revisão Bibliográfica)        -> AGUARDANDO_ENVIO ("Pendente")
  // 6. Metodologia Proposta                                 -> AGUARDANDO_ENVIO ("Pendente")
  // 7. Cronograma e Orçamento de Execução                   -> AGUARDANDO_ENVIO ("Pendente")
  // 8. Entrega do Projeto e Qualificação do TCC 1          -> AGUARDANDO_ENVIO ("Pendente")
  await db.collection("entregas").doc("entrega-maria-1").set({
    id: "entrega-maria-1",
    status: "CONCLUIDA",
    dataSubmissao: emDias(-25),
    marco_id: "tcc1-tema-orientador",
    tcc_id: "tcc-maria",
  });
  await db.collection("versoes_arquivo").doc("v1-maria-1").set({
    id: "v1-maria-1",
    numeroVersao: 1,
    arquivoUrl: "tccs/tcc-maria/entregas/entrega-maria-1/definicao_tema.pdf",
    dataUpload: emDias(-25),
    entrega_id: "entrega-maria-1",
  });
  await db.collection("feedbacks").doc("fb-maria-1").set({
    id: "fb-maria-1",
    comentario: "Tema sobre análise de dados acadêmicos aprovado.",
    data: emDias(-24),
    entrega_id: "entrega-maria-1",
    autor_id: orient2,
  });

  await db.collection("entregas").doc("entrega-maria-2").set({
    id: "entrega-maria-2",
    status: "CONCLUIDA",
    dataSubmissao: emDias(-15),
    marco_id: "tcc1-problema",
    tcc_id: "tcc-maria",
  });
  await db.collection("versoes_arquivo").doc("v1-maria-2").set({
    id: "v1-maria-2",
    numeroVersao: 1,
    arquivoUrl: "tccs/tcc-maria/entregas/entrega-maria-2/problema_pesquisa.pdf",
    dataUpload: emDias(-15),
    entrega_id: "entrega-maria-2",
  });
  await db.collection("feedbacks").doc("fb-maria-2").set({
    id: "fb-maria-2",
    comentario: "Pergunta de pesquisa refinada e aprovada.",
    data: emDias(-14),
    entrega_id: "entrega-maria-2",
    autor_id: orient2,
  });

  await db.collection("entregas").doc("entrega-maria-3").set({
    id: "entrega-maria-3",
    status: "SOLICITADA_CORRECAO",
    dataSubmissao: emDias(-5),
    marco_id: "tcc1-objetivos",
    tcc_id: "tcc-maria",
  });
  await db.collection("versoes_arquivo").doc("v1-maria-3").set({
    id: "v1-maria-3",
    numeroVersao: 1,
    arquivoUrl: "tccs/tcc-maria/entregas/entrega-maria-3/objetivos_v1.pdf",
    dataUpload: emDias(-5),
    entrega_id: "entrega-maria-3",
  });
  await db.collection("feedbacks").doc("fb-maria-3").set({
    id: "fb-maria-3",
    comentario: "Separe com clareza o objetivo geral dos objetivos específicos.",
    data: emDias(-3),
    entrega_id: "entrega-maria-3",
    autor_id: orient2,
  });

  await db.collection("entregas").doc("entrega-maria-4").set({
    id: "entrega-maria-4",
    status: "PRONTA_PARA_REVISAO",
    dataSubmissao: Timestamp.now(),
    marco_id: "tcc1-justificativa",
    tcc_id: "tcc-maria",
  });
  await db.collection("versoes_arquivo").doc("v1-maria-4").set({
    id: "v1-maria-4",
    numeroVersao: 1,
    arquivoUrl: "tccs/tcc-maria/entregas/entrega-maria-4/justificativa_previa.pdf",
    dataUpload: Timestamp.now(),
    entrega_id: "entrega-maria-4",
  });

  // 6. Banca do TCC do Jorge
  await db.collection("bancas_avaliacao").doc("banca-jorge").set({
    id: "banca-jorge",
    tcc_id: "tcc-jorge",
    avaliador_id: silvia,
  });

  // 7. Bancas de demonstração: cobrem TODAS as etapas do painel do avaliador.
  //    Silvia (avaliadora de teste) está em 5 TCCs novos além do tcc-jorge; Roberto avalia em paralelo
  //    (a Silvia não enxerga as avaliações dele) e é o único avaliador do TCC da Maria (teste de 403).
  const ctx = "Banca do semestre 2026.2";
  const tccsBanca: TccBancaSeed[] = [
    {
      chave: "carlos",
      matricula: "2026003",
      titulo: "Detecção de Fraudes em Transações com Aprendizado de Máquina",
      fase: 2,
      curso: "Engenharia de Software",
      statusGeral: "AGUARDANDO_BANCA",
      orientador: joana,
      avaliadores: [silvia, roberto],
      defesaEmDias: 6,
      versaoFinal: { versoes: 2, enviadoHaDias: 2 },
      avaliacoes: [],
    },
    {
      chave: "fernanda",
      matricula: "2026004",
      titulo: "Acessibilidade em Aplicativos Móveis para Idosos",
      fase: 2,
      curso: "Sistemas de Informação",
      statusGeral: "AGUARDANDO_BANCA",
      orientador: joana,
      avaliadores: [silvia],
      defesaEmDias: 3,
      versaoFinal: { versoes: 1, enviadoHaDias: 5 },
      avaliacoes: [
        {
          avaliador: silvia,
          status: "RASCUNHO",
          nota: 8,
          parecer: "Boa revisão de literatura. Pendente: avaliar a seção de testes de usabilidade (cap. 5).",
        },
      ],
    },
    {
      chave: "rafael",
      matricula: "2026005",
      titulo: "Arquitetura de Microsserviços para Sistemas Acadêmicos",
      fase: 2,
      curso: "Engenharia de Software",
      statusGeral: "APROVADO",
      orientador: orientMarcos,
      avaliadores: [silvia, roberto],
      defesaEmDias: -9,
      versaoFinal: { versoes: 3, enviadoHaDias: 20 },
      avaliacoes: [
        {
          avaliador: silvia,
          status: "FINALIZADA",
          nota: 9,
          decisao: "APROVADO",
          parecer: "Trabalho com excelente fundamentação teórica e rigor metodológico. A proposta de arquitetura está bem justificada e validada por experimentos.",
        },
        {
          avaliador: roberto,
          status: "FINALIZADA",
          nota: 8.5,
          decisao: "APROVADO",
          parecer: "Texto claro e bem estruturado. Sugiro aprofundar a discussão sobre custos de operação em trabalhos futuros.",
        },
      ],
    },
    {
      chave: "beatriz",
      matricula: "2026006",
      titulo: "Gamificação no Ensino de Lógica de Programação",
      fase: 1,
      curso: "Sistemas de Informação",
      statusGeral: "DEFENDIDO",
      orientador: orientMarcos,
      avaliadores: [silvia],
      defesaEmDias: -2,
      versaoFinal: { versoes: 1, enviadoHaDias: 12 },
      avaliacoes: [
        {
          avaliador: silvia,
          status: "FINALIZADA",
          nota: 7,
          decisao: "APROVADO_RESSALVAS",
          parecer: "Proposta relevante, porém a amostra do estudo é pequena. Aprovado com ressalvas: ampliar a análise estatística antes da versão definitiva.",
        },
      ],
    },
    {
      chave: "lucas",
      matricula: "2026007",
      titulo: "Observabilidade em Aplicações Serverless na Nuvem",
      fase: 1,
      curso: "Engenharia de Software",
      statusGeral: "AGUARDANDO_BANCA",
      orientador: joana,
      avaliadores: [silvia],
      defesaEmDias: 12,
      versaoFinal: { versoes: 1, enviadoHaDias: 1 },
      avaliacoes: [],
    },
  ];

  for (const t of tccsBanca) {
    const tccId = `tcc-${t.chave}`;
    await db.collection("tccs").doc(tccId).set({
      id: tccId,
      titulo: t.titulo,
      statusGeral: t.statusGeral,
      fase: t.fase,
      curso: t.curso,
      aluno_id: t.matricula,
      orientador_id: t.orientador,
      avaliadoresUids: t.avaliadores,
      defesaEm: emDias(t.defesaEmDias),
    });

    // Banca + (opcional) avaliação de cada membro; doc da avaliação tem o mesmo id da banca.
    for (const uid of t.avaliadores) {
      const bancaId = `banca-${t.chave}-${uid === silvia ? "silvia" : "roberto"}`;
      await db.collection("bancas_avaliacao").doc(bancaId).set({ id: bancaId, tcc_id: tccId, avaliador_id: uid });
      const a = t.avaliacoes.find((x) => x.avaliador === uid);
      if (a) {
        const finalizada = a.status === "FINALIZADA";
        await db.collection("avaliacoes").doc(bancaId).set({
          id: bancaId,
          banca_id: bancaId,
          tcc_id: tccId,
          avaliador_id: uid,
          status: a.status,
          parecer: a.parecer,
          ...(a.nota !== undefined && { nota: a.nota }),
          ...(a.decisao && { decisao: a.decisao }),
          atualizadoEm: emDias(t.defesaEmDias < 0 ? t.defesaEmDias : -1),
          ...(finalizada && { dataAvaliacao: emDias(t.defesaEmDias < 0 ? t.defesaEmDias : -1) }),
        });
      }
    }

    // Marcos de progresso para os TCCs de demonstração
    if (t.fase === 1) {
      // TCC 1: Qualificação e etapas intermediárias
      const marcosTcc1Concluidos = ["tcc1-tema-orientador", "tcc1-problema", "tcc1-objetivos", "qualificacao"];
      for (const mId of marcosTcc1Concluidos) {
        const entId = `entrega-${mId}-${t.chave}`;
        await db.collection("entregas").doc(entId).set({
          id: entId,
          status: "CONCLUIDA",
          dataSubmissao: emDias(-40),
          marco_id: mId,
          tcc_id: tccId,
        });
        await db.collection("versoes_arquivo").doc(`v1-${mId}-${t.chave}`).set({
          id: `v1-${mId}-${t.chave}`,
          numeroVersao: 1,
          arquivoUrl: `tccs/${tccId}/entregas/${entId}/v1_${mId}.pdf`,
          dataUpload: emDias(-40),
          entrega_id: entId,
        });
      }
    } else {
      // TCC 2: Marcos de execução
      const marcosTcc2Concluidos = ["tcc2-ajuste-metodologia", "tcc2-coleta-dados", "tcc2-analise-discussao"];
      for (const mId of marcosTcc2Concluidos) {
        const entId = `entrega-${mId}-${t.chave}`;
        await db.collection("entregas").doc(entId).set({
          id: entId,
          status: "CONCLUIDA",
          dataSubmissao: emDias(-50),
          marco_id: mId,
          tcc_id: tccId,
        });
        await db.collection("versoes_arquivo").doc(`v1-${mId}-${t.chave}`).set({
          id: `v1-${mId}-${t.chave}`,
          numeroVersao: 1,
          arquivoUrl: `tccs/${tccId}/entregas/${entId}/v1_${mId}.pdf`,
          dataUpload: emDias(-50),
          entrega_id: entId,
        });
      }
    }

    if (t.versaoFinal) {
      const fId = `entrega-final-${t.chave}`;
      await db.collection("entregas").doc(fId).set({
        id: fId,
        status: "CONCLUIDA",
        dataSubmissao: emDias(-t.versaoFinal.enviadoHaDias),
        marco_id: "entrega-final",
        tcc_id: tccId,
      });
      for (let n = 1; n <= t.versaoFinal.versoes; n++) {
        const caminho = `tccs/${tccId}/entregas/${fId}/v${n}_monografia_final.pdf`;
        await db.collection("versoes_arquivo").doc(`v${n}-final-${t.chave}`).set({
          id: `v${n}-final-${t.chave}`,
          numeroVersao: n,
          arquivoUrl: caminho,
          dataUpload: emDias(-t.versaoFinal.enviadoHaDias - (t.versaoFinal.versoes - n) * 3),
          entrega_id: fId,
        });
        await enviarPdf(caminho, [
          "SGTCC - Monografia Final (dados de demonstracao)",
          "",
          t.titulo,
          `Matricula: ${t.matricula}  |  TCC ${t.fase}  |  Versao ${n}`,
          ctx,
          "",
          "Este PDF e gerado pelo seed para testar o leitor da banca.",
        ]);
      }
      await db.collection("feedbacks").doc(`fb-final-${t.chave}`).set({
        id: `fb-final-${t.chave}`,
        comentario: "Versão final revisada e aprovada para envio à banca.",
        data: emDias(-t.versaoFinal.enviadoHaDias),
        entrega_id: fId,
        autor_id: t.orientador,
      });
    }
  }

  // TCC da Maria passa a ter banca só com o Roberto: a Silvia não pode abrir (US01-AC3).
  await db.collection("tccs").doc("tcc-maria").update({ avaliadoresUids: [roberto], defesaEm: emDias(30) });
  await db.collection("bancas_avaliacao").doc("banca-maria-roberto").set({
    id: "banca-maria-roberto",
    tcc_id: "tcc-maria",
    avaliador_id: roberto,
  });

  // Notificações da Silvia (uma lida, duas novas)
  const notificacoes = [
    { id: "notif-silvia-1", mensagem: 'Nova versão final disponível: "Detecção de Fraudes em Transações com Aprendizado de Máquina".', lida: false, dias: -2 },
    { id: "notif-silvia-2", mensagem: 'Versão final enviada: "Observabilidade em Aplicações Serverless na Nuvem".', lida: false, dias: -1 },
    { id: "notif-silvia-3", mensagem: "Você foi adicionada à banca de Jorge (TCC 1).", lida: true, dias: -14 },
  ];
  for (const n of notificacoes) {
    await db.collection("notificacoes").doc(n.id).set({
      id: n.id,
      mensagem: n.mensagem,
      lida: n.lida,
      usuario_id: silvia,
      criadoEm: emDias(n.dias),
    });
  }

  console.log("Seed concluído.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});