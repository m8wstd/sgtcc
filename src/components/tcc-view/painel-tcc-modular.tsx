"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  MessageSquare,
  Clock,
  Columns3,
  List,
  FileText,
  UploadCloud,
  PlusCircle,
  X,
  Check,
  Award,
  User,
  GraduationCap,
  BookOpen,
  Eye,
  EyeOff,
} from "lucide-react";
import { SALAS_ETAPAS_MOCK } from "@/app/dashboard/aluno/dados-etapas";
import { StatCard } from "@/components/ui/stat-card";
import { StatusPill } from "@/components/ui/status-pill";
import { ProgressBar } from "@/components/ui/progress-bar";
import {
  ROTULO_STATUS_ENTREGA,
  ROTULO_STATUS_TCC,
  formatarData,
  formatarDataHora,
} from "@/components/layout/status";
import type { ItemMarco, TccResumo } from "@/lib/data/queries";
import type { StatusEntrega } from "@/types";

// ── Colunas Kanban com cores alinhadas aos Stickers do Design System ────────
export const COLUNAS_KANBAN = [
  { key: "Pendente", label: "Pendente", cor: "#d5d9e0" },
  { key: "Em andamento", label: "Em andamento", cor: "#8ec5ff" },
  { key: "Para correção", label: "Para correção", cor: "#ffd84d" },
  { key: "Em correção", label: "Em correção", cor: "#ff7f7f" },
  { key: "Concluído", label: "Concluído", cor: "#86d994" },
] as const;

export type ColunaKanbanKey = (typeof COLUNAS_KANBAN)[number]["key"];

/**
 * Regra de Negócio solicitada:
 * - Pendente: etapas que ainda não foram começadas (AGUARDANDO_ENVIO ou ATRASADA sem versões)
 * - Em andamento: etapas que estão sendo feitas pelo aluno
 * - Para correção: quando o aluno envia o arquivo (PRONTA_PARA_REVISAO)
 * - Em correção: quando o orientador marca que está corrigindo ou solicita correções (EM_REVISAO ou SOLICITADA_CORRECAO)
 * - Concluído: etapas marcadas como concluídas (CONCLUIDA)
 */
export function mapStatusParaColuna(status: StatusEntrega): ColunaKanbanKey {
  switch (status) {
    case "AGUARDANDO_ENVIO":
    case "ATRASADA":
      return "Pendente";
    case "EM_ANDAMENTO" as any:
      return "Em andamento";
    case "PRONTA_PARA_REVISAO":
      return "Para correção";
    case "EM_REVISAO":
    case "SOLICITADA_CORRECAO":
      return "Em correção";
    case "CONCLUIDA":
      return "Concluído";
    default:
      return "Pendente";
  }
}

export function slugDoMarco(titulo: string, idx: number): string {
  const t = titulo.toLowerCase();
  if (t.includes("introdu")) return "introducao";
  if (t.includes("referenc") || t.includes("teor")) return "referencial-teorico";
  if (t.includes("metod")) return "metodologia";
  if (t.includes("result")) return "resultados";
  if (t.includes("conclu")) return "conclusao";
  const fallback = ["introducao", "referencial-teorico", "metodologia", "resultados", "conclusao"];
  return fallback[idx % fallback.length];
}

export interface PainelTccModularProps {
  tcc: TccResumo;
  itens: ItemMarco[];
  papel: "orientador" | "aluno";
  saudacaoNome?: string;
  subtitulo?: string;
  voltarHref?: string;
  voltarLabel?: string;
  outrosTccs?: TccResumo[];
  onTrocarTccHref?: (tccId: string) => string;
}

export function PainelTccModular({
  tcc,
  itens: itensIniciais,
  papel,
  saudacaoNome,
  subtitulo,
  voltarHref,
  voltarLabel,
  outrosTccs = [],
  onTrocarTccHref,
}: PainelTccModularProps) {
  const isOrientador = papel === "orientador";
  const [viewMode, setViewMode] = useState<"kanban" | "lista">("kanban");
  const [exibirPendente, setExibirPendente] = useState(true);
  const [exibirConcluido, setExibirConcluido] = useState(false);

  // Estado dinâmico de etapas
  const [itens, setItens] = useState<ItemMarco[]>(itensIniciais);
  const [mostrarCriarEtapa, setMostrarCriarEtapa] = useState(false);
  const [novoTituloEtapa, setNovoTituloEtapa] = useState("");
  const [novaDataLimite, setNovaDataLimite] = useState("30/11/2026");
  const [novoComentarioInicial, setNovoComentarioInicial] = useState("");
  const [etapaCriadaSucesso, setEtapaCriadaSucesso] = useState(false);

  const totalMarcos = itens.length;
  const concluidos = itens.filter((i) => i.statusEfetivo === "CONCLUIDA").length;

  // Conclusão GERAL do TCC (1 ou 2) = porcentagem de etapas concluídas no trabalho
  const porcentagemGeral =
    totalMarcos > 0 ? Math.round((concluidos / totalMarcos) * 100) : 0;

  // Próxima entrega
  const proximoNaoConcluido = itens.find((i) => i.statusEfetivo !== "CONCLUIDA");
  const proximaEntregaTexto = proximoNaoConcluido
    ? formatarData(proximoNaoConcluido.marco.dataLimite)
    : "Concluído";

  // Criação de Nova Etapa pelo Orientador
  const handleCriarNovaEtapa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoTituloEtapa.trim()) return;

    const novaEtapaItem: ItemMarco = {
      marco: {
        id: `marco-${Date.now()}`,
        titulo: novoTituloEtapa.trim(),
        dataLimite: new Date("2026-11-30T00:00:00.000Z"),
        cronograma_id: "cronograma-padrao",
      },
      entrega: null,
      statusEfetivo: "AGUARDANDO_ENVIO",
      versoes: [],
      feedbacks: novoComentarioInicial.trim()
        ? [
            {
              id: `fb-${Date.now()}`,
              entrega_id: `ent-${Date.now()}`,
              autor_id: "orientador-id",
              autorNome: tcc.orientadorNome,
              comentario: novoComentarioInicial.trim(),
              data: new Date(),
            },
          ]
        : [],
    };

    setItens([...itens, novaEtapaItem]);
    setNovoTituloEtapa("");
    setNovoComentarioInicial("");
    setMostrarCriarEtapa(false);
    setEtapaCriadaSucesso(true);
    setTimeout(() => setEtapaCriadaSucesso(false), 4000);
  };

  return (
    <div className="space-y-6 w-full">
      {/* Topo / Botão Voltar (quando existir) */}
      {voltarHref && (
        <div>
          <Link
            href={voltarHref}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1e78f0] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> {voltarLabel ?? "Voltar"}
          </Link>
        </div>
      )}

      {/* Cabeçalho da Seção alinhado lado a lado com a Fase do Aluno (TCC 1 e TCC 2) */}
      <div className="border-b border-[#dfe2e8] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111a2e]">
            {isOrientador ? `Acompanhamento • ${tcc.alunoNome}` : "Plano de Trabalho do TCC"}
          </h1>
          <p className="text-sm text-[#6b7385] mt-1">
            {subtitulo ??
              (isOrientador
                ? "Clique no cartão da etapa para abrir a sala, postar materiais, orientar e avaliar."
                : "Acompanhe o andamento do seu TCC. Clique no cartão da etapa para acessar a sala.")}
          </p>
        </div>

        {/* Seletor de Fase do Aluno alinhado diretamente com o título do Plano de Trabalho */}
        {outrosTccs.length > 1 && (
          <div className="flex items-center gap-1.5 bg-[#f4f5f7] p-1 rounded-lg border border-[#dfe2e8] shrink-0 self-start sm:self-center">
            <span className="text-[11px] font-semibold text-[#6b7385] px-2">
              Fase:
            </span>
            {outrosTccs.map((outro, i) => {
              const ativo = outro.id === tcc.id;
              const rotulo = outro.fase ? `TCC ${outro.fase}` : `TCC ${i + 1}`;
              const href = onTrocarTccHref ? onTrocarTccHref(outro.id) : `/dashboard/tcc/${outro.id}`;

              return (
                <Link
                  key={outro.id}
                  href={href}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                    ativo
                      ? "bg-[#0f1b33] text-white shadow-xs"
                      : "text-[#111a2e] hover:bg-white"
                  }`}
                >
                  {rotulo}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Alerta de criação de etapa com sucesso */}
      {etapaCriadaSucesso && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Nova etapa criada com sucesso no plano de trabalho do aluno!</span>
        </div>
      )}

      {/* Formulário de Criação de Etapa (Orientador) */}
      {isOrientador && mostrarCriarEtapa && (
        <form
          onSubmit={handleCriarNovaEtapa}
          className="border-2 border-[#1e78f0] rounded-[10px] p-5 bg-white shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between border-b border-[#dfe2e8] pb-3">
            <div className="flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-[#1e78f0]" />
              <h3 className="text-sm font-bold text-[#111a2e]">
                Criar Nova Etapa de TCC para {tcc.alunoNome}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setMostrarCriarEtapa(false)}
              className="text-[#6b7385] hover:text-[#111a2e] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#111a2e] mb-1">
                Nome da Etapa
              </label>
              <input
                type="text"
                value={novoTituloEtapa}
                onChange={(e) => setNovoTituloEtapa(e.target.value)}
                placeholder="Ex: Análise Estatística dos Resultados"
                required
                className="w-full px-3 py-2 text-xs border border-[#dfe2e8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e78f0]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#111a2e] mb-1">
                Prazo Limite de Entrega
              </label>
              <input
                type="text"
                value={novaDataLimite}
                onChange={(e) => setNovaDataLimite(e.target.value)}
                placeholder="Ex: 15/11/2026"
                required
                className="w-full px-3 py-2 text-xs border border-[#dfe2e8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e78f0]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#111a2e] mb-1">
                Comentário ou Diretriz Inicial do Orientador (opcional)
              </label>
              <input
                type="text"
                value={novoComentarioInicial}
                onChange={(e) => setNovoComentarioInicial(e.target.value)}
                placeholder="Ex: Conclua a tabulação antes de iniciar os gráficos."
                className="w-full px-3 py-2 text-xs border border-[#dfe2e8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e78f0]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#dfe2e8]">
            <button
              type="button"
              onClick={() => setMostrarCriarEtapa(false)}
              className="px-4 py-1.5 rounded-lg border border-[#dfe2e8] bg-white text-xs font-semibold text-[#6b7385] hover:bg-[#f4f5f7] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-1.5 bg-[#1e78f0] hover:bg-[#1666d3] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              Adicionar Etapa
            </button>
          </div>
        </form>
      )}

      {/* Cabeçalho do Trabalho / Informações do TCC com Barra de Progresso Geral Sutil no Topo */}
      <div className="relative border border-[#dfe2e8] rounded-[10px] bg-white shadow-xs overflow-hidden">
        {/* Barra sutil de Progresso Geral no topo de todo o card */}
        <div className="w-full bg-[#f4f5f7] border-b border-[#dfe2e8] px-6 py-2.5">
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            {/* Canto superior esquerdo: Porcentagem colada e texto logo em seguida */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#111a2e] bg-white px-2 py-0.5 rounded border border-[#dfe2e8]">
                {porcentagemGeral}%
              </span>
            </div>

            {/* Canto superior direito: exclusivo para a próxima data de entrega */}
            <div className="flex items-center gap-1.5 text-[#6b7385]">
              <Calendar className="w-3.5 h-3.5 text-[#1e78f0]" />
              <span>
                Próxima entrega: <strong className="text-[#111a2e]">{proximaEntregaTexto}</strong>
              </span>
            </div>
          </div>
          <ProgressBar value={porcentagemGeral} className="h-1.5 w-full" />
        </div>

        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-[#1e78f0] uppercase tracking-wider">
                  {tcc.fase ? `TCC ${tcc.fase}` : "Trabalho de Conclusão de Curso"}
                </span>
                {tcc.curso && (
                  <span className="text-[11px] font-semibold bg-blue-50 text-[#1e78f0] px-2 py-0.5 rounded border border-blue-100">
                    {tcc.curso}
                  </span>
                )}
                <StatusPill status={ROTULO_STATUS_TCC[tcc.statusGeral] ?? tcc.statusGeral} />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#111a2e] leading-snug">
                {tcc.titulo}
              </h2>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#f4f5f7] border border-[#dfe2e8] text-[#111a2e]">
                  <User className="w-3.5 h-3.5 text-[#1e78f0]" />
                  <span className="text-[#6b7385]">Aluno:</span>
                  <strong className="font-semibold">{tcc.alunoNome}</strong>
                  <span className="text-[11px] text-[#6b7385] bg-white px-1.5 py-0.5 rounded border border-[#dfe2e8]">
                    Matrícula: {tcc.aluno_id}
                  </span>
                </div>

                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#f4f5f7] border border-[#dfe2e8] text-[#111a2e]">
                  <GraduationCap className="w-3.5 h-3.5 text-[#1e78f0]" />
                  <span className="text-[#6b7385]">Orientador:</span>
                  <strong className="font-semibold">{tcc.orientadorNome}</strong>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Botão de Envio para a Banca Examinadora - Dourado e habilitado somente com 100% */}
              {isOrientador ? (
                <Link
                  href={`/dashboard/tcc/${tcc.id}/banca`}
                  className="px-4 py-2 bg-[#d97706] hover:bg-[#b45309] text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-colors shadow-xs"
                >
                  <Award className="w-4 h-4 text-amber-200" />
                  <span>Ver Envio à Banca</span>
                </Link>
              ) : porcentagemGeral >= 100 ? (
                <Link
                  href={`/dashboard/tcc/${tcc.id}/banca`}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all shadow-xs"
                >
                  <Award className="w-4 h-4 text-yellow-200" />
                  <span>Enviar para a Banca Avaliadora</span>
                </Link>
              ) : (
                <div
                  title="O envio para a banca examinadora fica disponível quando o TCC atinge 100% de conclusão."
                  className="px-4 py-2 bg-[#e5e7eb]/70 text-[#9ca3af] border border-[#d1d5db] text-xs font-semibold rounded-lg flex items-center justify-center gap-2 cursor-not-allowed select-none opacity-60"
                >
                  <Award className="w-4 h-4 text-[#9ca3af]" />
                  <span>Enviar para a Banca Avaliadora</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Ferramentas / Alternância Kanban vs Lista */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-[#111a2e]">
            Etapas e Blocos de Trabalho
          </h3>
          <p className="text-xs text-[#6b7385]">
            Clique em qualquer etapa para acessar a sala e realizar as ações.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Toggles para Esconder/Mostrar "Pendente" e "Concluído" */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setExibirPendente((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
                exibirPendente
                  ? "bg-[#d5d9e0] text-[#111a2e] border-[#c0c5cd]"
                  : "bg-white text-[#6b7385] border-[#dfe2e8] hover:text-[#111a2e]"
              }`}
            >
              {exibirPendente ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>Pendentes ({itens.filter((i) => mapStatusParaColuna(i.statusEfetivo) === "Pendente").length})</span>
            </button>

            <button
              type="button"
              onClick={() => setExibirConcluido((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
                exibirConcluido
                  ? "bg-[#86d994] text-[#111a2e] border-[#6bc77b]"
                  : "bg-white text-[#6b7385] border-[#dfe2e8] hover:text-[#111a2e]"
              }`}
            >
              {exibirConcluido ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>Concluídos ({concluidos})</span>
            </button>
          </div>

          {/* Botão de Nova Etapa para o Orientador */}
          {isOrientador && !mostrarCriarEtapa && (
            <button
              type="button"
              onClick={() => setMostrarCriarEtapa(true)}
              className="px-3.5 py-1.5 bg-[#1e78f0] hover:bg-[#1666d3] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Criar Nova Etapa</span>
            </button>
          )}

          <div className="flex items-center gap-1 bg-[#f4f5f7] p-1 rounded-lg border border-[#dfe2e8]">
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "kanban"
                  ? "bg-white text-[#111a2e] shadow-xs"
                  : "text-[#6b7385] hover:text-[#111a2e]"
              }`}
            >
              <Columns3 className="w-3.5 h-3.5" />
              Kanban
            </button>
            <button
              type="button"
              onClick={() => setViewMode("lista")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "lista"
                  ? "bg-white text-[#111a2e] shadow-xs"
                  : "text-[#6b7385] hover:text-[#111a2e]"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Lista
            </button>
          </div>
        </div>
      </div>

      {/* Visualização Kanban: O card inteiro é um Link clicável para a página da etapa */}
      {viewMode === "kanban" ? (
        <div className="w-full pb-4">
          <div
            className={`grid gap-3.5 w-full grid-cols-1 sm:grid-cols-2 ${
              exibirPendente && exibirConcluido
                ? "lg:grid-cols-5"
                : (exibirPendente || exibirConcluido)
                ? "lg:grid-cols-4"
                : "lg:grid-cols-3"
            }`}
          >
            {COLUNAS_KANBAN.filter((col) => {
              if (col.key === "Pendente" && !exibirPendente) return false;
              if (col.key === "Concluído" && !exibirConcluido) return false;
              return true;
            }).map((col) => {
              const blocosDaColuna = itens.filter(
                (item) => mapStatusParaColuna(item.statusEfetivo) === col.key
              );

              return (
                <div
                  key={col.key}
                  className="bg-[#f4f5f7] rounded-[12px] p-3 border-t-4 flex flex-col gap-3 min-h-[200px] shadow-2xs"
                  style={{ borderTopColor: col.cor }}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-[#111a2e] px-1">
                    <span>{col.label}</span>
                    <span className="bg-white border border-[#dfe2e8] rounded-full px-2 py-0.5 text-[11px] font-bold">
                      {blocosDaColuna.length}
                    </span>
                  </div>

                  {blocosDaColuna.length === 0 ? (
                    <p className="text-xs text-[#6b7385] text-center py-6 italic">
                      Nenhum bloco
                    </p>
                  ) : (
                    blocosDaColuna.map((item) => {
                      const idx = itens.indexOf(item);
                      const slug = slugDoMarco(item.marco.titulo, idx);
                      const etapaHref = isOrientador
                        ? `/dashboard/tcc/${tcc.id}/etapa/${slug}`
                        : `/dashboard/aluno/etapa/${slug}`;
                      const atrasado = item.statusEfetivo === "ATRASADA";

                      // Busca a última postagem ou material do professor na sala correspondente
                      const mockEtapa = SALAS_ETAPAS_MOCK.find((s) => s.slug === slug);
                      const ultimaPostagem = mockEtapa?.postagensProfessor?.[mockEtapa.postagensProfessor.length - 1];
                      const ultimoMaterial = mockEtapa?.materiaisFixados?.[0];
                      const ultimoFeedback = item.feedbacks[0];

                      return (
                        <Link
                          key={item.marco.id}
                          href={etapaHref}
                          className={`group relative block border rounded-xl p-3.5 bg-white space-y-2.5 shadow-2xs transition-all duration-200 hover:border-[#1e78f0] hover:shadow-md hover:-translate-y-0.5 cursor-pointer text-left ${
                            atrasado ? "border-red-300" : "border-[#dfe2e8]"
                          }`}
                        >
                          {/* Cabeçalho do bloco */}
                          <div className="flex items-start justify-between gap-1">
                            <h4 className="text-[12.5px] font-bold text-[#111a2e] group-hover:text-[#1e78f0] transition-colors leading-snug">
                              {idx + 1}. {item.marco.titulo}
                            </h4>
                            {atrasado && (
                              <span className="shrink-0 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 rounded px-1.5 py-0.5">
                                Atrasado
                              </span>
                            )}
                          </div>

                          {/* Prazo Limite */}
                          <div className="flex justify-between items-center text-[11px] text-[#6b7385] font-medium">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-[#6b7385]" />
                              Prazo: {formatarData(item.marco.dataLimite)}
                            </span>
                            <span className="text-[10px] font-semibold text-[#1e78f0] bg-blue-50 px-1.5 py-0.5 rounded">
                              {col.label}
                            </span>
                          </div>

                          {/* Última Postagem / Comunicado do Professor */}
                          <div className="p-2.5 bg-[#f8f9fa] border-l-2 border-[#1e78f0] rounded-[6px] text-[11.5px] text-[#111a2e] space-y-1">
                            <div className="flex items-center justify-between text-[10px]">
                              <b className="text-[#1e78f0] uppercase tracking-wider flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" />
                                {ultimaPostagem ? "Última postagem do orientador" : "Orientação da sala"}
                              </b>
                              {ultimaPostagem && (
                                <span className="text-[#9ca3af]">{ultimaPostagem.dataHora.split(" às ")[0]}</span>
                              )}
                            </div>
                            <p className="line-clamp-2 leading-relaxed text-[#374151]">
                              {ultimaPostagem
                                ? `${ultimaPostagem.titulo} — ${ultimaPostagem.conteudo}`
                                : ultimoFeedback
                                ? ultimoFeedback.comentario
                                : ultimoMaterial
                                ? `Material disponibilizado: ${ultimoMaterial.nome}`
                                : "Nenhuma publicação recente. Clique para abrir a sala da etapa."}
                            </p>
                          </div>

                          {/* Indicador sutil de que todo o card é clicável */}
                          <div className="pt-1 flex items-center justify-end text-[10px] font-semibold text-[#6b7385] group-hover:text-[#1e78f0] transition-colors gap-1">
                            <span>Acessar sala</span>
                            <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
                          </div>
                        </Link>
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Visualização em Lista - Cada item é um card clicável com indicação sutil */
        <div className="space-y-3.5">
          {itens
            .filter(({ statusEfetivo }) => {
              const colKey = mapStatusParaColuna(statusEfetivo);
              if (colKey === "Pendente" && !exibirPendente) return false;
              if (colKey === "Concluído" && !exibirConcluido) return false;
              return true;
            })
            .map(({ marco, statusEfetivo }, idx) => {
            const statusLabel = ROTULO_STATUS_ENTREGA[statusEfetivo] ?? statusEfetivo;
            const slug = slugDoMarco(marco.titulo, idx);
            const etapaHref = isOrientador
              ? `/dashboard/tcc/${tcc.id}/etapa/${slug}`
              : `/dashboard/aluno/etapa/${slug}`;
            const atrasado = statusEfetivo === "ATRASADA";

            const mockEtapa = SALAS_ETAPAS_MOCK.find((s) => s.slug === slug);
            const ultimaPostagem = mockEtapa?.postagensProfessor?.[mockEtapa.postagensProfessor.length - 1];
            const ultimoMaterial = mockEtapa?.materiaisFixados?.[0];

            return (
              <Link
                key={marco.id}
                href={etapaHref}
                className="group relative block border border-[#dfe2e8] hover:border-[#1e78f0] rounded-xl bg-white overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer p-4 sm:p-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-[#111a2e] group-hover:text-[#1e78f0] transition-colors truncate">
                        {idx + 1}. {marco.titulo}
                      </h4>
                      {atrasado && (
                        <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 rounded px-1.5 py-0.5">
                          Atrasado
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#6b7385] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#6b7385]" /> Prazo limite:{" "}
                      <span className="font-medium text-[#111a2e]">
                        {formatarData(marco.dataLimite)}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <StatusPill status={statusLabel} />
                    <span className="text-xs font-semibold text-[#6b7385] group-hover:text-[#1e78f0] flex items-center gap-1 transition-colors">
                      <span className="hidden sm:inline">Acessar sala</span>
                      <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
                    </span>
                  </div>
                </div>

                {/* Última publicação ou orientação do professor */}
                <div className="mt-3 pt-3 border-t border-[#f0f2f5] flex items-start gap-2 text-xs text-[#6b7385]">
                  <MessageSquare className="w-3.5 h-3.5 text-[#1e78f0] shrink-0 mt-0.5" />
                  <p className="line-clamp-1 text-[#374151]">
                    <b className="text-[#1e78f0] font-semibold mr-1">Última postagem:</b>
                    {ultimaPostagem
                      ? `${ultimaPostagem.titulo} — ${ultimaPostagem.conteudo}`
                      : ultimoMaterial
                      ? `Material de apoio: ${ultimoMaterial.nome}`
                      : "Clique para entrar e conferir as orientações e arquivos desta etapa."}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
