import type { ItemMarco } from "@/lib/data/queries";
import type { SalaEtapaTcc } from "@/app/dashboard/aluno/dados-etapas";
import { nomeExibicaoDoArquivo } from "@/lib/entregas/regras";

/** Adapta somente dados REAIS do Firestore ao layout atual da Sala da Etapa. */
export function montarSalaReal(
  item: ItemMarco,
  dadosSalaFirestore?: {
    postagens?: SalaEtapaTcc["postagensProfessor"];
    materiais?: SalaEtapaTcc["materiaisFixados"];
    instrucoesCustomizadas?: string | null;
    dataEntregaCustomizada?: string | null;
    statusCustomizado?: string | null;
  } | null
): SalaEtapaTcc {
  const statusBase = dadosSalaFirestore?.statusCustomizado ?? item.statusEfetivo;
  const statusKanban: SalaEtapaTcc["statusKanban"] =
    statusBase === "CONCLUIDA" ? "Concluído" :
    statusBase === "PRONTA_PARA_REVISAO" ? "Para correção" :
    statusBase === "EM_REVISAO" || statusBase === "SOLICITADA_CORRECAO" ? "Em correção" :
    item.versoes.length ? "Em andamento" : "Pendente";

  const data = new Date(String(item.marco.dataLimite));
  const dataEntregaFormatada = dadosSalaFirestore?.dataEntregaCustomizada ||
    (Number.isNaN(data.valueOf()) ? "A definir" : data.toLocaleDateString("pt-BR"));

  const descricaoInstrucoes = dadosSalaFirestore?.instrucoesCustomizadas ||
    item.marco.descricao ||
    "Envie seus documentos desta etapa. As versões anteriores permanecem disponíveis para consulta.";

  return {
    slug: item.marco.id,
    titulo: item.marco.titulo,
    progresso: statusBase === "CONCLUIDA" ? 100 : item.versoes.length ? 50 : 0,
    dataEntrega: dataEntregaFormatada,
    statusKanban,
    statusEfetivo: statusBase,
    entregaId: item.entrega?.id,
    comentarioOrientadora: item.feedbacks[0]?.comentario ?? "",
    descricaoInstrucoes,
    postagensProfessor: dadosSalaFirestore?.postagens ?? [],
    materiaisFixados: dadosSalaFirestore?.materiais ?? [],
    historicoEnvios: item.versoes.map((v, idx) => ({
      id: v.id,
      versao: v.numeroVersao,
      arquivoNome: nomeExibicaoDoArquivo(v.arquivoUrl),
      data: new Date(String(v.dataUpload)).toLocaleString("pt-BR"),
      status: statusKanban,
      notaOuParecer: idx === 0 ? item.feedbacks[0]?.comentario : undefined,
    })),
  };
}
