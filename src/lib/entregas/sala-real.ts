import type { ItemMarco } from "@/lib/data/queries";
import type { SalaEtapaTcc } from "@/app/dashboard/aluno/dados-etapas";
import { nomeExibicaoDoArquivo } from "@/lib/entregas/regras";

/** Adapta somente dados REAIS do Firestore ao layout atual da Sala da Etapa. */
export function montarSalaReal(item: ItemMarco): SalaEtapaTcc {
  const statusKanban: SalaEtapaTcc["statusKanban"] =
    item.statusEfetivo === "CONCLUIDA" ? "Concluído" :
    item.statusEfetivo === "PRONTA_PARA_REVISAO" ? "Para correção" :
    item.statusEfetivo === "EM_REVISAO" || item.statusEfetivo === "SOLICITADA_CORRECAO" ? "Em correção" :
    item.versoes.length ? "Em andamento" : "Pendente";
  const data = new Date(String(item.marco.dataLimite));
  return {
    slug: item.marco.id,
    titulo: item.marco.titulo,
    progresso: item.statusEfetivo === "CONCLUIDA" ? 100 : item.versoes.length ? 50 : 0,
    dataEntrega: Number.isNaN(data.valueOf()) ? "A definir" : data.toLocaleDateString("pt-BR"),
    statusKanban,
    comentarioOrientadora: item.feedbacks[0]?.comentario ?? "",
    descricaoInstrucoes: "Envie seus documentos desta etapa. As versões anteriores permanecem disponíveis para consulta.",
    // Materiais e postagens só devem aparecer quando forem efetivamente persistidos.
    postagensProfessor: [],
    materiaisFixados: [],
    historicoEnvios: item.versoes.map((v) => ({
      id: v.id,
      versao: v.numeroVersao,
      arquivoNome: nomeExibicaoDoArquivo(v.arquivoUrl),
      data: new Date(String(v.dataUpload)).toLocaleString("pt-BR"),
      status: statusKanban,
    })),
  };
}
