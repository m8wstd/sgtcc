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
  if (!valor) return valor as T;
  // Firestore Timestamp tem métodos toDate ou propriedades _seconds
  if (
    valor instanceof Timestamp ||
    (typeof valor === "object" && valor !== null && ("_seconds" in valor || typeof (valor as { toDate?: unknown }).toDate === "function"))
  ) {
    if (typeof (valor as { toDate?: () => Date }).toDate === "function") {
      try {
        return (valor as { toDate: () => Date }).toDate().toISOString() as T;
      } catch {
        // fallback
      }
    }
    const sec = (valor as { _seconds: number })._seconds;
    if (typeof sec === "number") {
      return new Date(sec * 1000).toISOString() as T;
    }
  }
  if (valor instanceof Date) return valor.toISOString() as T;
  if (Array.isArray(valor)) return valor.map((v) => serializar(v)) as T;
  if (typeof valor === "object") {
    // Evita erro se o objeto tiver protótipo null ou getters
    const entries = Object.entries(valor).map(([k, v]) => [k, serializar(v)]);
    return Object.fromEntries(entries) as T;
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
  avaliadoresUids?: string[];
}

/**
 * Retorna o TCC ativo padrão para visualização:
 * Se o aluno/trabalho possui um TCC 2 cadastrado (em andamento ou com entregas),
 * ele é o foco principal; caso contrário, foca no TCC 1.
 */
export function resolverTccAtivoPadrao<T extends { fase?: 1 | 2; statusGeral?: string }>(lista: T[]): T | null {
  if (!lista.length) return null;
  // Se houver TCC 2, prioriza ele
  const tcc2 = lista.find((t) => t.fase === 2);
  if (tcc2) return tcc2;
  // Caso contrário, usa o TCC 1
  const tcc1 = lista.find((t) => t.fase === 1);
  return tcc1 ?? lista[0] ?? null;
}

export async function listarTccsVisiveis(sessao: AuthenticatedSession): Promise<TccResumo[]> {
  const tccs = db().collection("tccs");
  const usuarioId = sessao.usuario.id;
  let lista: TCC[];

  switch (sessao.perfil) {
    case PerfilEnum.ALUNO: {
      const aluno = await buscarPorUsuario("alunos", usuarioId);
      if (!aluno) return [];
      const mat = aluno.data().matricula ?? aluno.id;
      const [snap1, snap2] = await Promise.all([
        tccs.where("aluno_id", "==", mat).get(),
        tccs.where("alunos_ids", "array-contains", mat).get(),
      ]);
      const mapa = new Map<string, TCC>();
      docs<TCC>(snap1).forEach((t) => mapa.set(t.id, t));
      docs<TCC>(snap2).forEach((t) => mapa.set(t.id, t));
      lista = Array.from(mapa.values());
      break;
    }
    case PerfilEnum.ORIENTADOR:
    case PerfilEnum.AVALIADOR: {
      const profOrient = await buscarPorUsuario("professores_orientadores", usuarioId);
      const orientId = profOrient?.id;
      const idsBusca = [...new Set([orientId, usuarioId].filter(Boolean))];

      if (idsBusca.length > 0) {
        const snap = await tccs.where("orientador_id", "in", idsBusca).get();
        lista = docs<TCC>(snap);
      } else {
        lista = [];
      }
      break;
    }
    case PerfilEnum.COORDENACAO: {
      const coord = await buscarPorUsuario("coordenadores", usuarioId);
      const uDoc = await db().collection("usuarios").doc(usuarioId).get();
      const uData = uDoc.data();
      const cursosPermitidos: string[] =
        coord?.data()?.cursos ?? uData?.cursosCoordenados ?? uData?.cursos ?? [];
      const todosTccs = docs<TCC>(await tccs.get());
      if (cursosPermitidos && cursosPermitidos.length > 0) {
        lista = todosTccs.filter((t) => t.curso && cursosPermitidos.includes(t.curso));
      } else {
        lista = todosTccs;
      }
      break;
    }
    default:
      lista = docs<TCC>(await tccs.get()); // admin vê todos
  }

  return (await enriquecer(lista)).sort((a, b) => a.titulo.localeCompare(b.titulo, "pt-BR"));
}

/** Acrescenta nome do aluno e do orientador (join manual: o Firestore não tem JOIN). */
async function enriquecer(lista: TCC[]): Promise<TccResumo[]> {
  // Coleta todas as matrículas de alunos envolvidos (aluno_id principal + alunos_ids adicionais)
  const todasMatriculas = new Set<string>();
  lista.forEach((t) => {
    if (t.aluno_id) todasMatriculas.add(t.aluno_id);
    if (Array.isArray(t.alunos_ids)) {
      t.alunos_ids.forEach((m) => todasMatriculas.add(m));
    }
  });

  const [alunos, orientadores] = await Promise.all([
    porIds<Aluno>("alunos", Array.from(todasMatriculas)),
    porIds<ProfessorOrientador>("professores_orientadores", lista.map((t) => t.orientador_id)),
  ]);
  const usuarios = await porIds<Usuario>("usuarios", [
    ...[...alunos.values()].map((a) => a.usuario_id),
    ...[...orientadores.values()].map((o) => o.usuario_id),
  ]);
  return lista.map((t) => {
    const matrículas = Array.from(
      new Set([t.aluno_id, ...(Array.isArray(t.alunos_ids) ? t.alunos_ids : [])].filter(Boolean))
    );
    const nomes = matrículas.map(
      (m) => usuarios.get(alunos.get(m)?.usuario_id ?? "")?.nome ?? m
    );
    return {
      ...t,
      alunoNome: nomes.length > 0 ? nomes.join(", ") : t.aluno_id,
      orientadorNome: usuarios.get(orientadores.get(t.orientador_id)?.usuario_id ?? "")?.nome ?? "—",
    };
  });
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

  const [marcosSnap, entregas, salasSnap] = await Promise.all([
    db().collection("marcos_cronograma").get(),
    db().collection("entregas").where("tcc_id", "==", tccId).get().then((s) => docs<Entrega>(s)),
    db().collection("etapas_sala").get(),
  ]);
  const todosMarcos = docs<MarcoCronograma>(marcosSnap).sort((a, b) => {
    if (a.ordem !== undefined && b.ordem !== undefined) {
      return a.ordem - b.ordem;
    }
    return tempo(a.dataLimite) - tempo(b.dataLimite);
  });

  // Mapeia customizações da sala de cada marco para este TCC
  const salasCustomizadas = new Map<string, { statusCustomizado?: string }>();
  salasSnap.docs.forEach((d) => {
    if (d.id.startsWith(`${tccId}__`)) {
      const marcoId = d.id.slice(`${tccId}__`.length);
      salasCustomizadas.set(marcoId, d.data() as { statusCustomizado?: string });
    }
  });

  // Filtra marcos pela fase do TCC se o marco tiver 'fase' definida
  const faseTcc = registro.tcc.fase ?? 1;
  const marcos = todosMarcos.filter((m) => !m.fase || m.fase === faseTcc);
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
    const salaCustom = salasCustomizadas.get(marco.id);
    const statusCalculado = statusEfetivo(marco, entrega);
    const statusFinal = (salaCustom?.statusCustomizado as StatusEntrega) ?? statusCalculado;

    return {
      marco,
      entrega,
      statusEfetivo: statusFinal,
      versoes: versoes
        .filter((v) => v.entrega_id === entrega?.id && (
          v.arquivoUrl.includes(".supabase.co/storage/v1/object/public/") ||
          /^https:\/\/[^/]+\.(public|private)\.blob\.vercel-storage\.com\//i.test(v.arquivoUrl)
        ))
        .sort((a, b) => b.numeroVersao - a.numeroVersao),
      feedbacks: feedbacks
        .filter((f) => f.entrega_id === entrega?.id)
        .sort((a, b) => tempo(b.data) - tempo(a.data))
        .map((f) => ({ ...f, autorNome: autores.get(f.autor_id)?.nome ?? "Orientador" })),
    };
  });

  return { tcc: resumo, itens, outrosTccsDoAluno };
}

export async function getEtapaDoTcc(sessao: AuthenticatedSession, tccId: string, slugOuId: string): Promise<{
  painel: PainelTcc;
  item: ItemMarco;
} | null> {
  const painel = await getPainelTcc(sessao, tccId);
  if (!painel) return null;

  const item = painel.itens.find((i) => {
    if (i.marco.id === slugOuId) return true;
    const slug = i.marco.titulo
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
    return slug === slugOuId;
  });

  if (!item) return null;
  return { painel, item };
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
  const versoes = (await emLotes<VersaoArquivo>("versoes_arquivo", "entrega_id", entregas.map((e) => e.id))).filter((v) =>
    v.arquivoUrl.includes(".supabase.co/storage/v1/object/public/") ||
    /^https:\/\/[^/]+\.(public|private)\.blob\.vercel-storage\.com\//i.test(v.arquivoUrl)
  );
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

/** Painel da banca avaliadora:
 * - Para AVALIADOR/ORIENTADOR: TCCs em que consta na banca examinadora.
 * - Para COORDENACAO: todos os TCCs dos cursos que coordena.
 * - Para ADMIN: todos os TCCs do sistema.
 */
export async function listarTccsDaBanca(sessao: AuthenticatedSession): Promise<TccBanca[]> {
  // 1. Visão de Gestão (Coordenação / Admin)
  if (sessao.perfil === PerfilEnum.COORDENACAO || sessao.perfil === PerfilEnum.ADMIN) {
    const tccsCol = db().collection("tccs");
    let listaTccs: TCC[];

    if (sessao.perfil === PerfilEnum.COORDENACAO) {
      const coord = await buscarPorUsuario("coordenadores", sessao.usuario.id);
      const uDoc = await db().collection("usuarios").doc(sessao.usuario.id).get();
      const uData = uDoc.data();
      const cursosPermitidos: string[] =
        coord?.data()?.cursos ?? uData?.cursosCoordenados ?? uData?.cursos ?? [];
      const todos = docs<TCC>(await tccsCol.get());
      if (cursosPermitidos && cursosPermitidos.length > 0) {
        listaTccs = todos.filter((t) => t.curso && cursosPermitidos.includes(t.curso));
      } else {
        listaTccs = todos;
      }
    } else {
      listaTccs = docs<TCC>(await tccsCol.get());
    }

    if (!listaTccs.length) return [];

    const tccIds = listaTccs.map((t) => t.id);
    const [resumos, finais, bancas] = await Promise.all([
      enriquecer(listaTccs),
      versoesFinais(tccIds),
      emLotes<BancaAvaliacao>("bancas_avaliacao", "tcc_id", tccIds),
    ]);

    // Verifica se a coordenação/admin também tem avaliação própria em alguma banca
    const prof = await buscarPorUsuario("professores_avaliadores", sessao.usuario.id);
    const idsUsuario = [...new Set([prof?.id, sessao.usuario.id].filter(Boolean))];
    const minhaBancaMap = new Map<string, BancaAvaliacao>();
    for (const b of bancas) {
      if (idsUsuario.includes(b.avaliador_id)) {
        minhaBancaMap.set(b.tcc_id, b);
      }
    }

    const avaliacoes = minhaBancaMap.size > 0
      ? await porIds<Avaliacao>("avaliacoes", [...minhaBancaMap.values()].map((b) => b.id))
      : new Map<string, Avaliacao>();

    return resumos
      .map((t): TccBanca => {
        const minhaBanca = minhaBancaMap.get(t.id);
        const avaliacao = minhaBanca ? (avaliacoes.get(minhaBanca.id) ?? null) : null;
        const versaoFinal = finais.get(t.id) ?? null;
        return {
          ...t,
          bancaId: minhaBanca?.id ?? `gestao-${t.id}`,
          versaoFinal,
          avaliacao,
          etapa: etapaBanca(Boolean(versaoFinal), avaliacao),
        };
      })
      .sort(porDefesa);
  }

  // 2. Visão de Professor Avaliador / Orientador
  const prof = await buscarPorUsuario("professores_avaliadores", sessao.usuario.id);
  const avaliadorDocId = prof?.id;
  const idsParaBuscar = [...new Set([avaliadorDocId, sessao.usuario.id].filter(Boolean))];

  if (!idsParaBuscar.length) return [];

  // Busca vínculos de banca onde o avaliador_id é o id do professor_avaliador ou o usuario_id
  const bancas = docs<BancaAvaliacao>(
    await db().collection("bancas_avaliacao").where("avaliador_id", "in", idsParaBuscar).get(),
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

  const prof = await buscarPorUsuario("professores_avaliadores", sessao.usuario.id);
  const idsAvaliador = [...new Set([prof?.id, sessao.usuario.id].filter(Boolean))];
  const minha = bancas.find((b) => idsAvaliador.includes(b.avaliador_id));

  if (minha) {
    minhaBancaId = minha.id;
    minhaAvaliacao = avaliacoes.get(minha.id) ?? null;
  }

  // Se não é exclusivamente o avaliador da banca (ex: orientador, coordenador ou se já avaliou)
  if (sessao.perfil !== PerfilEnum.AVALIADOR || minhaAvaliacao?.status === "FINALIZADA") {
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
