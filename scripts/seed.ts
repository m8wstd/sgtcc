import { config } from "dotenv";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

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

async function main() {
  // 1. Usuários (Auth + claims + doc em /usuarios)
  await criarUsuario("Administrador", "admin@teste.sgtcc.dev", "ADMIN");
  const claudio = await criarUsuario("Cláudio Carvalho", "claudio@teste.sgtcc.dev", "COORDENACAO");
  const joana = await criarUsuario("Joana Jordão", "joana@teste.sgtcc.dev", "ORIENTADOR");
  const orient2 = await criarUsuario("Orientador Antigo", "orientador2@teste.sgtcc.dev", "ORIENTADOR");
  const silvia = await criarUsuario("Silvia Silva", "silvia@teste.sgtcc.dev", "AVALIADOR");
  const jorge = await criarUsuario("Jorge", "jorge@teste.sgtcc.dev", "ALUNO", "2026001");
  const maria = await criarUsuario("Maria", "maria@teste.sgtcc.dev", "ALUNO", "2026002");

  // 2. Tabelas de papel (conforme o ER)
  await db.collection("coordenadores").doc(claudio).set({ id: claudio, usuario_id: claudio });
  await db.collection("professores_orientadores").doc(joana).set({ id: joana, usuario_id: joana });
  await db.collection("professores_orientadores").doc(orient2).set({ id: orient2, usuario_id: orient2 });
  await db.collection("professores_avaliadores").doc(silvia).set({ id: silvia, usuario_id: silvia });
  await db.collection("alunos").doc("2026001").set({ matricula: "2026001", usuario_id: jorge });
  await db.collection("alunos").doc("2026002").set({ matricula: "2026002", usuario_id: maria });

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

  console.log("Seed concluído.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});