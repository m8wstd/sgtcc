import { Timestamp, type Firestore, type QuerySnapshot } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { canAccessTcc } from "@/lib/auth/authorization";
import { getTccAccessRecord } from "@/lib/auth/firestore-repository";
import type { AuthenticatedSession } from "@/lib/auth/session";
import { etapaBanca, type EtapaBanca } from "@/lib/banca/status";
import {
  PerfilEnum,
  type Aluno,
  type Avaliacao,
  type BancaAvaliacao,
  type Entrega,
  type Feedback,
  type MarcoCronograma,
  type ProfessorAvaliador,
  type ProfessorOrientador,
  type StatusEntrega,
  type TCC,
  type Usuario,
  type VersaoArquivo,
} from "@/types";

/**
 * Leituras do Firestore via Admin SDK para as páginas. O Admin ignora as
 * firestore.rules, então a visibilidade é aplicada aqui seguindo o modelo do
 * banco (aluno.usuario_id → matrícula, orientador.usuario_id → id, banca) e,
 * para um TCC específico, com `canAccessTcc` de `lib/auth/authorization.ts`.
 */

function db(): Firestore {
  if (!adminDb) throw new Error("Firestore Admin não está configurado.");
  return adminDb;
}

/** Timestamp → string ISO (recursivo), para poder cruzar Server → Client Component. */
export function serializar<T>(valor: unknown): T {
  if (valor instanceof Timestamp) return valor.toDate().toISOString() as T;
  if (Array.isArray(valor)) return valor.map((v) => serializar(v)) as T;
  if (valor && typeof valor === "object") {
    return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, serializar(v)])) as T;
  }
  return valor as T;
}

const docs = <T>(snap: QuerySnapshot): T[] =>
  snap.docs.map((d) => serializar<T>({ id: d.id, ...d.data() }));

const tempo = (v: Date | string | undefined) => (v ? new Date(v).getTime() : 0);

/** Firestore limita `in` a 30 valores. */
async function emLotes<T>(colecao: string, campo: string, valores: string[]): Promise<T[]> {
  const unicos = [...new Set(valores)].filter(Boolean);
  const lotes: string[][] = [];
  for (let i = 0; i < unicos.length; i += 30) lotes.push(unicos.slice(i, i + 30));
  const snaps = await Promise.all(lotes.map((l) => db().collection(colecao).where(campo, "in", l).get()));
  return snaps.flatMap((s) => docs<T>(s));
}

async function porIds<T>(colecao: string, ids: string[]): Promise<Map<string, T>> {
  const unicos = [...new Set(ids)].filter(Boolean);
  if (!unicos.length) return new Map();
  const snaps = await db().getAll(...unicos.map((id) => db().collection(colecao).doc(id)));
  return new Map(
    snaps.filter((d) => d.exists).map((d) => [d.id, serializar<T>({ id: d.id, ...d.data() })]),
  );
}

async function buscarPorUsuario(colecao: string, usuarioId: string) {
  const snap = await db().collection(colecao).where("usuario_id", "==", usuarioId).limit(1).get();
  return snap.docs[0];
}

// ---------- Listagem de TCCs por perfil ----------

export interface TccResumo extends TCC {
  alunoNome: string;
  orientadorNome: string;
}

export async function listarTccsVisiveis(sessao: AuthenticatedSession): Promise<TccResumo[]> {
  const tccs = db().collection("tccs");
  const usuarioId = sessao.usuario.id;
  let lista: TCC[];

  switch (sessao.perfil) {
    case PerfilEnum.ALUNO: {
      const aluno = await buscarPorUsuario("alunos", usuarioId);
      if (!aluno) return [];
      lista = docs<TCC>(await tccs.where("aluno_id", "==", aluno.data().matricula ?? aluno.id).get());
      break;
    }
    case PerfilEnum.ORIENTADOR: {
      const prof = await buscarPorUsuario("professores_orientadores", usuarioId);
      if (!prof) return [];
      lista = docs<TCC>(await tccs.where("orientador_id", "==", prof.id).get());
      break;
    }
    case PerfilEnum.AVALIADOR: {
      const prof = await buscarPorUsuario("professores_avaliadores", usuarioId);
      if (!prof) return [];
      const bancas = docs<BancaAvaliacao>(
        await db().collection("bancas_avaliacao").where("avaliador_id", "==", prof.id).get(),
      );
      const porTcc = await porIds<TCC>("tccs", bancas.map((b) => b.tcc_id));
      lista = [...porTcc.values()];
      break;
    }
    default:
      lista = docs<TCC>(await tccs.get()); // coordenação/admin veem todos
  }

  return (await enriquecer(lista)).sort((a, b) => a.titulo.localeCompare(b.titulo, "pt-BR"));
}

/** Acrescenta nome do aluno e do orientador (join manual: o Firestore não tem JOIN). */
async function enriquecer(lista: TCC[]): Promise<TccResumo[]> {
  const [alunos, orientadores] = await Promise.all([
    porIds<Aluno>("alunos", lista.map((t) => t.aluno_id)),
    porIds<ProfessorOrientador>("professores_orientadores", lista.map((t) => t.orientador_id)),
  ]);
  const usuarios = await porIds<Usuario>("usuarios", [
    ...[...alunos.values()].map((a) => a.usuario_id),
    ...[...orientadores.values()].map((o) => o.usuario_id),
  ]);
  return lista.map((t) => ({
    ...t,
    alunoNome: usuarios.get(alunos.get(t.aluno_id)?.usuario_id ?? "")?.nome ?? t.aluno_id,
    orientadorNome: usuarios.get(orientadores.get(t.orientador_id)?.usuario_id ?? "")?.nome ?? "—",
  }));
}

// ---------- Painel de um TCC (marcos + entregas + versões + feedbacks) ----------

export interface ItemMarco {
  marco: MarcoCronograma;
  entrega: Entrega | null;
  statusEfetivo: StatusEntrega;
  versoes: VersaoArquivo[];
  feedbacks: (Feedback & { autorNome: string })[];
}

export interface PainelTcc {
  tcc: TccResumo;
  itens: ItemMarco[];
  outrosTccsDoAluno?: TccResumo[];
}

/** Sem entrega no marco: aguardando envio, ou atrasada se o prazo já passou. */
export function statusEfetivo(
  marco: Pick<MarcoCronograma, "dataLimite">,
  entrega: Pick<Entrega, "status"> | null,
  agora = Date.now(),
): StatusEntrega {
  const status = entrega?.status ?? "AGUARDANDO_ENVIO";
  return status === "AGUARDANDO_ENVIO" && tempo(marco.dataLimite) < agora ? "ATRASADA" : status;
}

/** Devolve null se o TCC não existe OU se a sessão não tem vínculo com ele. */
export async function getPainelTcc(sessao: AuthenticatedSession, tccId: string): Promise<PainelTcc | null> {
  const registro = await getTccAccessRecord(tccId, sessao);
  if (!registro || !canAccessTcc(sessao, registro.tcc, registro.context)) return null;

  const [marcosSnap, entregas] = await Promise.all([
    db().collection("marcos_cronograma").get(),
    db().collection("entregas").where("tcc_id", "==", tccId).get().then((s) => docs<Entrega>(s)),
  ]);
  const marcos = docs<MarcoCronograma>(marcosSnap).sort((a, b) => tempo(a.dataLimite) - tempo(b.dataLimite));
  const entregaIds = entregas.map((e) => e.id);

  const [versoes, feedbacks] = await Promise.all([
    emLotes<VersaoArquivo>("versoes_arquivo", "entrega_id", entregaIds),
    emLotes<Feedback>("feedbacks", "entrega_id", entregaIds),
  ]);
  const autores = await porIds<Usuario>("usuarios", feedbacks.map((f) => f.autor_id));
  const [resumo] = await enriquecer([serializar<TCC>(registro.tcc)]);

  // Busca todos os TCCs deste mesmo aluno para permitir alternar entre TCC 1, TCC 2, etc.
  const todosTccsAlunoDocs = docs<TCC>(
    await db().collection("tccs").where("aluno_id", "==", registro.tcc.aluno_id).get(),
  );
  const outrosTccsDoAluno = await enriquecer(todosTccsAlunoDocs);

  const itens: ItemMarco[] = marcos.map((marco) => {
    const entrega = entregas.find((e) => e.marco_id === marco.id) ?? null;
    return {
      marco,
      entrega,
      statusEfetivo: statusEfetivo(marco, entrega),
      versoes: versoes
        .filter((v) => v.entrega_id === entrega?.id)
        .sort((a, b) => b.numeroVersao - a.numeroVersao),
      feedbacks: feedbacks
        .filter((f) => f.entrega_id === entrega?.id)
        .sort((a, b) => tempo(b.data) - tempo(a.data))
        .map((f) => ({ ...f, autorNome: autores.get(f.autor_id)?.nome ?? "Orientador" })),
    };
  });

  return { tcc: resumo, itens, outrosTccsDoAluno };
}

// ---------- Banca avaliadora ----------

/** Marco cuja última versão é a "versão final" enviada à banca (ver scripts/seed.ts). */
export const MARCO_ENTREGA_FINAL = "entrega-final";

export interface VersaoFinal {
  /** id em `versoes_arquivo`: é o que /api/documentos/[documentId] espera. */
  id: string;
  numeroVersao: number;
  dataUpload: string;
  nomeArquivo: string;
}

export interface TccBanca extends TccResumo {
  bancaId: string;
  versaoFinal: VersaoFinal | null;
  /** Avaliação do avaliador logado (null = ainda não começou). */
  avaliacao: Avaliacao | null;
  etapa: EtapaBanca;
}

function nomeDoArquivo(caminho: string): string {
  return decodeURIComponent(caminho.split("/").pop() ?? caminho);
}

/** Última versão do marco "entrega-final" de cada TCC (um único par de consultas em lote). */
async function versoesFinais(tccIds: string[]): Promise<Map<string, VersaoFinal>> {
  const entregas = (await emLotes<Entrega>("entregas", "tcc_id", tccIds)).filter(
    (e) => e.marco_id === MARCO_ENTREGA_FINAL,
  );
  const versoes = await emLotes<VersaoArquivo>("versoes_arquivo", "entrega_id", entregas.map((e) => e.id));
  const resultado = new Map<string, VersaoFinal>();
  for (const entrega of entregas) {
    const ultima = versoes
      .filter((v) => v.entrega_id === entrega.id)
      .sort((a, b) => b.numeroVersao - a.numeroVersao)[0];
    if (ultima) {
      resultado.set(entrega.tcc_id, {
        id: ultima.id,
        numeroVersao: ultima.numeroVersao,
        dataUpload: String(ultima.dataUpload),
        nomeArquivo: nomeDoArquivo(ultima.arquivoUrl),
      });
    }
  }
  return resultado;
}

/** Defesa mais próxima primeiro; sem data vai para o fim. */
function porDefesa(a: TCC, b: TCC): number {
  const ta = a.defesaEm ? tempo(a.defesaEm) : Number.POSITIVE_INFINITY;
  const tb = b.defesaEm ? tempo(b.defesaEm) : Number.POSITIVE_INFINITY;
  return ta - tb || a.titulo.localeCompare(b.titulo, "pt-BR");
}

/** Painel do avaliador: só os TCCs em que ele consta na banca, com a etapa de cada um. */
export async function listarTccsDaBanca(sessao: AuthenticatedSession): Promise<TccBanca[]> {
  if (sessao.perfil !== PerfilEnum.AVALIADOR) return [];
  const prof = await buscarPorUsuario("professores_avaliadores", sessao.usuario.id);
  if (!prof) return [];

  const bancas = docs<BancaAvaliacao>(
    await db().collection("bancas_avaliacao").where("avaliador_id", "==", prof.id).get(),
  );
  if (!bancas.length) return [];

  const [tccsPorId, avaliacoesPorBanca, finais] = await Promise.all([
    porIds<TCC>("tccs", bancas.map((b) => b.tcc_id)),
    porIds<Avaliacao>("avaliacoes", bancas.map((b) => b.id)),
    versoesFinais(bancas.map((b) => b.tcc_id)),
  ]);

  const bancaPorTcc = new Map(bancas.map((b) => [b.tcc_id, b]));
  const resumos = await enriquecer([...tccsPorId.values()]);

  return resumos
    .map((t): TccBanca => {
      const banca = bancaPorTcc.get(t.id)!;
      const avaliacao = avaliacoesPorBanca.get(banca.id) ?? null;
      const versaoFinal = finais.get(t.id) ?? null;
      return { ...t, bancaId: banca.id, versaoFinal, avaliacao, etapa: etapaBanca(Boolean(versaoFinal), avaliacao) };
    })
    .sort(porDefesa);
}

export interface ResultadoBanca extends Avaliacao {
  avaliadorNome: string;
}

export interface SalaBanca {
  tcc: TccResumo;
  versaoFinal: VersaoFinal | null;
  /** Vínculo do avaliador logado com este TCC (null para aluno/orientador/coordenação). */
  minhaBancaId: string | null;
  minhaAvaliacao: Avaliacao | null;
  /** Avaliações FINALIZADAS, para quem não é avaliador (o avaliador não vê as dos colegas). */
  resultados: ResultadoBanca[];
  totalAvaliadores: number;
}

/** Devolve null se o TCC não existe OU se a sessão não tem vínculo com ele (mesma regra de getPainelTcc). */
export async function getSalaBanca(sessao: AuthenticatedSession, tccId: string): Promise<SalaBanca | null> {
  const registro = await getTccAccessRecord(tccId, sessao);
  if (!registro || !canAccessTcc(sessao, registro.tcc, registro.context)) return null;

  const [resumo] = await enriquecer([serializar<TCC>(registro.tcc)]);
  const bancas = docs<BancaAvaliacao>(
    await db().collection("bancas_avaliacao").where("tcc_id", "==", tccId).get(),
  );
  const [avaliacoes, finais] = await Promise.all([
    porIds<Avaliacao>("avaliacoes", bancas.map((b) => b.id)),
    versoesFinais([tccId]),
  ]);

  let minhaBancaId: string | null = null;
  let minhaAvaliacao: Avaliacao | null = null;
  let resultados: ResultadoBanca[] = [];

  if (sessao.perfil === PerfilEnum.AVALIADOR) {
    const prof = await buscarPorUsuario("professores_avaliadores", sessao.usuario.id);
    const minha = bancas.find((b) => b.avaliador_id === prof?.id);
    minhaBancaId = minha?.id ?? null;
    minhaAvaliacao = minha ? (avaliacoes.get(minha.id) ?? null) : null;
  } else {
    const finalizadas = bancas.filter((b) => avaliacoes.get(b.id)?.status === "FINALIZADA");
    const profs = await porIds<ProfessorAvaliador>("professores_avaliadores", finalizadas.map((b) => b.avaliador_id));
    const usuarios = await porIds<Usuario>("usuarios", [...profs.values()].map((p) => p.usuario_id));
    resultados = finalizadas
      .map((b) => ({
        ...avaliacoes.get(b.id)!,
        avaliadorNome: usuarios.get(profs.get(b.avaliador_id)?.usuario_id ?? "")?.nome ?? "Avaliador(a)",
      }))
      .sort((a, b) => a.avaliadorNome.localeCompare(b.avaliadorNome, "pt-BR"));
  }

  return {
    tcc: resumo,
    versaoFinal: finais.get(tccId) ?? null,
    minhaBancaId,
    minhaAvaliacao,
    resultados,
    totalAvaliadores: bancas.length,
  };
}
