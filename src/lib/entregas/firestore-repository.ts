import { FieldValue, Timestamp, type Firestore } from "firebase-admin/firestore";
import type { Aluno, Entrega, ProfessorOrientador, TCC, VersaoArquivo } from "@/types";
import type { EntregaRepository } from "./contracts";
import { revisaoDocumento } from "./contracts";
import { EntregaError } from "./errors";

function identificadorValido(valor: unknown): valor is string {
  return typeof valor === "string" && valor.length > 0 && !valor.includes("/")
    && valor !== "." && valor !== ".." && Buffer.byteLength(valor, "utf8") <= 1500;
}

function tempo(valor: unknown): number {
  if (valor instanceof Timestamp) return valor.toMillis();
  if (valor instanceof Date || typeof valor === "string") return new Date(valor).getTime();
  return NaN;
}

export function criarRepositorioEntregas(db: Firestore): EntregaRepository {
  return {
    async alterarEmTransacao(entregaId, sessao, decidir) {
      if (!identificadorValido(entregaId)) throw new EntregaError(400, "INVALID_REQUEST", "Identificador de entrega inválido.");
      try {
        return await db.runTransaction(async (transaction) => {
          const ref = db.collection("entregas").doc(entregaId);
          const snapshot = await transaction.get(ref);
          if (!snapshot.exists || !snapshot.updateTime) throw new EntregaError(404, "NOT_FOUND", "Entrega não encontrada.");
          const entrega = { ...snapshot.data(), id: snapshot.id } as Entrega;
          if (!identificadorValido(entrega.tcc_id) || !identificadorValido(entrega.marco_id)) {
            throw new EntregaError(409, "INVALID_DELIVERY", "Os vínculos da entrega precisam ser verificados.");
          }
          const tccSnapshot = await transaction.get(db.collection("tccs").doc(entrega.tcc_id));
          if (!tccSnapshot.exists) throw new EntregaError(404, "NOT_FOUND", "TCC da entrega não encontrado.");
          const tcc = { ...tccSnapshot.data(), id: tccSnapshot.id } as TCC;
          if (!identificadorValido(tcc.aluno_id) || !identificadorValido(tcc.orientador_id)) {
            throw new EntregaError(409, "INVALID_DELIVERY", "Os vínculos do TCC precisam ser verificados.");
          }
          const [usuario, aluno, orientador, marco] = await transaction.getAll(
            db.collection("usuarios").doc(sessao.uid),
            db.collection("alunos").doc(tcc.aluno_id),
            db.collection("professores_orientadores").doc(tcc.orientador_id),
            db.collection("marcos_cronograma").doc(entrega.marco_id),
          );
          if (!usuario.exists || usuario.data()?.perfil !== sessao.perfil) {
            throw new EntregaError(403, "FORBIDDEN", "Seu perfil foi atualizado. Entre novamente antes de continuar.");
          }
          if (!marco.exists) throw new EntregaError(409, "INVALID_DELIVERY", "Marco da entrega não encontrado.");
          const versoes = await transaction.get(db.collection("versoes_arquivo").where("entrega_id", "==", entregaId));
          const mudanca = await decidir({
            entrega,
            tcc,
            contexto: {
              aluno: aluno.exists ? aluno.data() as Aluno : undefined,
              orientador: orientador.exists ? { ...orientador.data(), id: orientador.id } as ProfessorOrientador : undefined,
            },
            revisao: revisaoDocumento(snapshot.updateTime),
            atualizadaEmMillis: snapshot.updateTime.toMillis(),
            versoes: versoes.docs.map((v) => ({
              versao: { ...v.data(), id: v.id } as VersaoArquivo,
              criadaEmMillis: v.createTime.toMillis(),
              uploadEmMillis: tempo(v.data().dataUpload),
            })),
          });
          transaction.update(ref, { status: mudanca.status });
          if (mudanca.comentario) {
            transaction.create(db.collection("feedbacks").doc(), {
              comentario: mudanca.comentario,
              data: FieldValue.serverTimestamp(),
              entrega_id: entregaId,
              autor_id: sessao.uid,
            });
          }
          return { entrega: { id: entregaId, status: mudanca.status } };
        });
      } catch (error) {
        if (error && typeof error === "object" && "code" in error && error.code === 10) {
          throw new EntregaError(409, "CONCURRENT_UPDATE", "Há outra atualização em andamento. Atualize a página antes de continuar.");
        }
        throw error;
      }
    },
  };
}
