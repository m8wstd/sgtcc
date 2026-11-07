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
  await db.collection("coordenadores").doc(claudio).set({ id: claudio, usuario_id: claudio });
  await db.collection("professores_orientadores").doc(joana).set({ id: joana, usuario_id: joana });
  await db.collection("professores_orientadores").doc(orient2).set({ id: orient2, usuario_id: orient2 });
  await db.collection("professores_avaliadores").doc(silvia).set({ id: silvia, usuario_id: silvia });
  await db.collection("alunos").doc("2026001").set({ matricula: "2026001", usuario_id: jorge });
  await db.collection("alunos").doc("2026002").set({ matricula: "2026002", usuario_id: maria });
  await db.collection("professores_avaliadores").doc(roberto).set({ id: roberto, usuario_id: roberto });
  await db.collection("professores_orientadores").doc(orientMarcos).set({ id: orientMarcos, usuario_id: orientMarcos });
  for (const a of extras) {
    await db.collection("alunos").doc(a.matricula).set({ matricula: a.matricula, usuario_id: uidAluno[a.matricula] });
  }

  // 3. Cronograma e marcos
  await db.collection("cronogramas").doc("2026-2").set({ id: "2026-2", semestre: "2026.2" });
  const marcos = [
    { id: "qualificacao", titulo: "Qualificação", dataLimite: "2026-09-15" },
    { id: "entrega-final", titulo: "Entrega Final", dataLimite: "2026-11-10" },
    { id: "defesa", titulo: "Defesa", dataLimite: "2026-11-25" },
  ];
  for (const m of marcos) {
    await db.collection("marcos_cronograma").doc(m.id).set({
      id: m.id,
      titulo: m.titulo,
      cronograma_id: "2026-2",
      dataLimite: Timestamp.fromDate(new Date(m.dataLimite + "T23:59:00-03:00")),
      bloqueioEstrito: m.id === "entrega-final",
    });
  }

  // 4. TCCs: Jorge com Joana (TCC 1 e TCC 2); Maria com o orientador antigo (para testar a troca)
  await db.collection("tccs").doc("tcc-jorge").set({
    id: "tcc-jorge",
    titulo: "Sistema de Gestão de TCC (SGTCC)",
    statusGeral: "EM_ANDAMENTO",
    fase: 1,
    curso: "Engenharia de Software",
    aluno_id: "2026001",
    orientador_id: joana,
    avaliadoresUids: [silvia],
    defesaEm: emDias(21),
  });
  await db.collection("tccs").doc("tcc-jorge-2").set({
    id: "tcc-jorge-2",
    titulo: "Monografia Final: Sistema de Gestão de TCC",
    statusGeral: "EM_ANDAMENTO",
    fase: 2,
    curso: "Engenharia de Software",
    aluno_id: "2026001",
    orientador_id: joana,
  });
  await db.collection("tccs").doc("tcc-maria").set({
    id: "tcc-maria",
    titulo: "Análise de Dados Acadêmicos",
    statusGeral: "EM_ANDAMENTO",
    fase: 1,
    curso: "Sistemas de Informação",
    aluno_id: "2026002",
    orientador_id: orient2,
  });

  // 5. Entrega com versão e feedback (histórico para testar RN02 / US04)
  await db.collection("entregas").doc("entrega-maria-1").set({
    id: "entrega-maria-1",
    status: "SOLICITADA_CORRECAO",
    dataSubmissao: Timestamp.now(),
    marco_id: "qualificacao",
    tcc_id: "tcc-maria",
  });
  await db.collection("versoes_arquivo").doc("v1-maria").set({
    id: "v1-maria",
    numeroVersao: 1,
    arquivoUrl: "tccs/tcc-maria/entregas/entrega-maria-1/v1_capitulo1.pdf",
    dataUpload: Timestamp.now(),
    entrega_id: "entrega-maria-1",
  });
  await db.collection("feedbacks").doc("fb-maria-1").set({
    id: "fb-maria-1",
    comentario: "Reveja a introdução.",
    data: Timestamp.now(),
    entrega_id: "entrega-maria-1",
    autor_id: orient2,
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

    // Qualificação concluída (histórico) + entrega final concluída pelo orientador (RN05)
    const qId = `entrega-qualificacao-${t.chave}`;
    await db.collection("entregas").doc(qId).set({
      id: qId,
      status: "CONCLUIDA",
      dataSubmissao: emDias(-60),
      marco_id: "qualificacao",
      tcc_id: tccId,
    });
    await db.collection("versoes_arquivo").doc(`v1-qualificacao-${t.chave}`).set({
      id: `v1-qualificacao-${t.chave}`,
      numeroVersao: 1,
      arquivoUrl: `tccs/${tccId}/entregas/${qId}/v1_qualificacao.pdf`,
      dataUpload: emDias(-62),
      entrega_id: qId,
    });

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