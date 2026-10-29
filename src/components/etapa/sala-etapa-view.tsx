"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Download,
  FileCheck,
  FileText,
  MessageSquare,
  Send,
  UploadCloud,
  CheckCircle2,
  Pin,
  Clock,
  PlusCircle,
  Paperclip,
  Check,
  Edit3,
  Trash2,
  X,
  FileUp,
} from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { ProgressBar } from "@/components/ui/progress-bar";
import type {
  SalaEtapaTcc,
  PostagemSala,
  MaterialApoio,
  HistoricoEnvioAluno,
} from "@/app/dashboard/aluno/dados-etapas";

interface SalaEtapaViewProps {
  etapa: SalaEtapaTcc;
  nomeUsuario: string;
  papelUsuario: "orientador" | "aluno";
  voltarHref: string;
  voltarLabel?: string;
  tccTitulo?: string;
  alunoNome?: string;
}

export function SalaEtapaView({
  etapa: etapaInicial,
  nomeUsuario,
  papelUsuario,
  voltarHref,
  voltarLabel,
  tccTitulo,
  alunoNome,
}: SalaEtapaViewProps) {
  const isOrientador = papelUsuario === "orientador";
  const [tabAtiva, setTabAtiva] = useState<"mural" | "materiais" | "envio" | "historico">("mural");

  // Dados editáveis da Etapa
  const [tituloEtapa, setTituloEtapa] = useState(etapaInicial.titulo);
  const [descricaoInstrucoes, setDescricaoInstrucoes] = useState(etapaInicial.descricaoInstrucoes);
  const [dataEntrega, setDataEntrega] = useState(etapaInicial.dataEntrega);
  const [progressoEtapa, setProgressoEtapa] = useState(etapaInicial.progresso);
  const [statusKanban, setStatusKanban] = useState(etapaInicial.statusKanban);

  // Modal / Formulário de edição dos dados da etapa (Nome, prazo, instruções, etc.)
  const [editandoEtapa, setEditandoEtapa] = useState(false);
  const [tempTitulo, setTempTitulo] = useState(tituloEtapa);
  const [tempInstrucoes, setTempInstrucoes] = useState(descricaoInstrucoes);
  const [tempDataEntrega, setTempDataEntrega] = useState(dataEntrega);
  const [tempProgresso, setTempProgresso] = useState(progressoEtapa);
  const [tempStatus, setTempStatus] = useState(statusKanban);
  const [salvoSucesso, setSalvoSucesso] = useState(false);

  // Materiais de Apoio (Adicionar e Remover)
  const [materiais, setMateriais] = useState<MaterialApoio[]>(etapaInicial.materiaisFixados);
  const [mostrarFormMaterial, setMostrarFormMaterial] = useState(false);
  const [novoMaterialNome, setNovoMaterialNome] = useState("");
  const [novoMaterialTipo, setNovoMaterialTipo] = useState("PDF");
  const [novoMaterialTamanho, setNovoMaterialTamanho] = useState("1.5 MB");

  // Postagens no Mural da Etapa
  const [postagens, setPostagens] = useState<PostagemSala[]>(etapaInicial.postagensProfessor);
  const [mostrarFormPostagem, setMostrarFormPostagem] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novoConteudo, setNovoConteudo] = useState("");
  const [postagemCriadaSucesso, setPostagemCriadaSucesso] = useState(false);

  // Submissão de Trabalho pelo Aluno
  const [arquivoUpload, setArquivoUpload] = useState<File | null>(null);
  const [uploadSucesso, setUploadSucesso] = useState(false);
  const [historico, setHistorico] = useState<HistoricoEnvioAluno[]>(etapaInicial.historicoEnvios);

  // Parecer do Orientador
  const [parecerOrientador, setParecerOrientador] = useState("");
  const [parecerSucesso, setParecerSucesso] = useState(false);

  // Salvar edições da Etapa
  const handleSalvarEdicaoEtapa = (e: React.FormEvent) => {
    e.preventDefault();
    setTituloEtapa(tempTitulo);
    setDescricaoInstrucoes(tempInstrucoes);
    setDataEntrega(tempDataEntrega);
    setProgressoEtapa(Number(tempProgresso));
    setStatusKanban(tempStatus);
    setEditandoEtapa(false);
    setSalvoSucesso(true);
    setTimeout(() => setSalvoSucesso(false), 4000);
  };

  // Adicionar Material de Apoio
  const handleAdicionarMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoMaterialNome.trim()) return;

    const novoMat: MaterialApoio = {
      id: `mat-${Date.now()}`,
      nome: novoMaterialNome.trim(),
      tipo: novoMaterialTipo.toUpperCase(),
      tamanho: novoMaterialTamanho,
      url: "#",
    };

    setMateriais([novoMat, ...materiais]);
    setNovoMaterialNome("");
    setMostrarFormMaterial(false);
  };

  // Remover Material de Apoio
  const handleRemoverMaterial = (id: string) => {
    setMateriais(materiais.filter((m) => m.id !== id));
  };

  // Ação de envio do aluno
  const handleEnviarTrabalho = (e: React.FormEvent) => {
    e.preventDefault();
    if (!arquivoUpload) return;

    const novaVersao: HistoricoEnvioAluno = {
      versao: historico.length + 1,
      arquivoNome: arquivoUpload.name,
      data:
        new Date().toLocaleDateString("pt-BR") +
        " " +
        new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      status: "Pronta para Revisão",
    };

    setHistorico([novaVersao, ...historico]);
    setUploadSucesso(true);
    setArquivoUpload(null);
    setTabAtiva("historico");
    setTimeout(() => setUploadSucesso(false), 5000);
  };

  // Ação de criar nova postagem pelo Orientador
  const handleCriarPostagem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoTitulo.trim() || !novoConteudo.trim()) return;

    const novaPost: PostagemSala = {
      id: `post-${Date.now()}`,
      autorNome: nomeUsuario,
      autorPapel: "Professor(a) Orientador(a)",
      dataHora:
        new Date().toLocaleDateString("pt-BR") +
        " às " +
        new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      titulo: novoTitulo.trim(),
      conteudo: novoConteudo.trim(),
    };

    setPostagens([novaPost, ...postagens]);
    setNovoTitulo("");
    setNovoConteudo("");
    setMostrarFormPostagem(false);
    setPostagemCriadaSucesso(true);
    setTimeout(() => setPostagemCriadaSucesso(false), 4000);
  };

  // Parecer do orientador
  const handleEmitirParecer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parecerOrientador.trim() || historico.length === 0) return;

    const novaLista = [...historico];
    novaLista[0] = {
      ...novaLista[0],
      notaOuParecer: parecerOrientador.trim(),
      status: "Correção Solicitada",
    };
    setHistorico(novaLista);
    setParecerOrientador("");
    setParecerSucesso(true);
    setTimeout(() => setParecerSucesso(false), 4000);
  };

  return (
    <div className="space-y-6 w-full">
      {/* Botão de Retorno */}
      <div className="flex items-center justify-between">
        <Link
          href={voltarHref}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1e78f0] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> {voltarLabel ?? "Voltar"}
        </Link>

        {/* Botão de Editar Etapa para o Orientador */}
        {isOrientador && !editandoEtapa && (
          <button
            type="button"
            onClick={() => {
              setTempTitulo(tituloEtapa);
              setTempInstrucoes(descricaoInstrucoes);
              setTempDataEntrega(dataEntrega);
              setTempProgresso(progressoEtapa);
              setTempStatus(statusKanban);
              setEditandoEtapa(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#dfe2e8] bg-white hover:bg-[#f4f5f7] text-[#111a2e] text-xs font-semibold cursor-pointer shadow-2xs transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#1e78f0]" />
            <span>Editar Configurações da Etapa</span>
          </button>
        )}
      </div>

      {salvoSucesso && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Configurações da etapa atualizadas com sucesso!</span>
        </div>
      )}

      {/* Formulário de Edição da Etapa (Orientador) */}
      {isOrientador && editandoEtapa && (
        <form
          onSubmit={handleSalvarEdicaoEtapa}
          className="border-2 border-[#1e78f0] rounded-[10px] p-5 bg-white shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between border-b border-[#dfe2e8] pb-3">
            <div className="flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-[#1e78f0]" />
              <h3 className="text-sm font-bold text-[#111a2e]">
                Editar Etapa: {tituloEtapa}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setEditandoEtapa(false)}
              className="text-[#6b7385] hover:text-[#111a2e] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#111a2e] mb-1">
                Nome / Título da Etapa
              </label>
              <input
                type="text"
                value={tempTitulo}
                onChange={(e) => setTempTitulo(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs border border-[#dfe2e8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e78f0]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#111a2e] mb-1">
                Data Limite de Entrega
              </label>
              <input
                type="text"
                value={tempDataEntrega}
                onChange={(e) => setTempDataEntrega(e.target.value)}
                placeholder="Ex: 15/07/2026"
                required
                className="w-full px-3 py-2 text-xs border border-[#dfe2e8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e78f0]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#111a2e] mb-1">
                Status Kanban da Etapa
              </label>
              <select
                value={tempStatus}
                onChange={(e) => setTempStatus(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border border-[#dfe2e8] rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#1e78f0]"
              >
                <option value="Pendente">Pendente</option>
                <option value="Em andamento">Em andamento</option>
                <option value="Para correção">Para correção</option>
                <option value="Em correção">Em correção</option>
                <option value="Concluído">Concluído</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#111a2e] mb-1">
                Progresso Concluído (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={tempProgresso}
                onChange={(e) => setTempProgresso(Number(e.target.value))}
                required
                className="w-full px-3 py-2 text-xs border border-[#dfe2e8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e78f0]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#111a2e] mb-1">
                Objetivo e Instruções da Etapa (visível ao aluno)
              </label>
              <textarea
                value={tempInstrucoes}
                onChange={(e) => setTempInstrucoes(e.target.value)}
                rows={3}
                required
                className="w-full px-3 py-2 text-xs border border-[#dfe2e8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e78f0]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#dfe2e8]">
            <button
              type="button"
              onClick={() => setEditandoEtapa(false)}
              className="px-4 py-1.5 rounded-lg border border-[#dfe2e8] bg-white text-xs font-semibold text-[#6b7385] hover:bg-[#f4f5f7] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-1.5 bg-[#1e78f0] hover:bg-[#1666d3] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              Salvar Alterações
            </button>
          </div>
        </form>
      )}

      {/* Cabeçalho da Sala Virtual da Etapa */}
      <div className="border border-[#dfe2e8] rounded-[10px] p-6 bg-white shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-[#1e78f0] uppercase tracking-wider">
                Sala da Etapa &bull; {tituloEtapa}
              </span>
              <StatusPill status={statusKanban} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#111a2e] leading-snug">
              {tituloEtapa}
            </h1>
            <p className="text-xs sm:text-sm text-[#6b7385]">
              {tccTitulo && <span className="font-medium text-[#111a2e]">{tccTitulo} &bull; </span>}
              {alunoNome && <span>Aluno: <b className="text-[#111a2e]">{alunoNome}</b> &bull; </span>}
              Prazo limite da sala: <b className="text-[#111a2e]">{dataEntrega}</b>
            </p>
          </div>

          <div className="min-w-[190px] space-y-2 bg-[#f4f5f7] p-3.5 rounded-xl border border-[#dfe2e8]">
            <div className="flex justify-between items-baseline text-xs">
              <span className="text-[#6b7385] font-semibold uppercase tracking-wider">Progresso da Etapa</span>
              <b className="text-xl font-bold text-[#111a2e]">{progressoEtapa}%</b>
            </div>
            <ProgressBar value={progressoEtapa} className="h-2" />
          </div>
        </div>

        {/* Abas de Navegação Interna da Sala */}
        <div className="flex items-center gap-2 border-t border-[#dfe2e8] pt-4 flex-wrap">
          <button
            type="button"
            onClick={() => setTabAtiva("mural")}
            className={`px-4 py-2 rounded-full text-xs sm:text-[13px] border transition-colors cursor-pointer flex items-center gap-1.5 ${
              tabAtiva === "mural"
                ? "bg-[#0f1b33] text-white border-[#0f1b33] font-medium"
                : "border-[#dfe2e8] bg-white text-[#111a2e] hover:bg-[#f4f5f7]"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Mural de Postagens ({postagens.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setTabAtiva("materiais")}
            className={`px-4 py-2 rounded-full text-xs sm:text-[13px] border transition-colors cursor-pointer flex items-center gap-1.5 ${
              tabAtiva === "materiais"
                ? "bg-[#0f1b33] text-white border-[#0f1b33] font-medium"
                : "border-[#dfe2e8] bg-white text-[#111a2e] hover:bg-[#f4f5f7]"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Materiais de Apoio ({materiais.length})</span>
          </button>

          {!isOrientador && (
            <button
              type="button"
              onClick={() => setTabAtiva("envio")}
              className={`px-4 py-2 rounded-full text-xs sm:text-[13px] border transition-colors cursor-pointer flex items-center gap-1.5 ${
                tabAtiva === "envio"
                  ? "bg-[#0f1b33] text-white border-[#0f1b33] font-medium"
                  : "border-[#dfe2e8] bg-white text-[#111a2e] hover:bg-[#f4f5f7]"
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Submeter Trabalho</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setTabAtiva("historico")}
            className={`px-4 py-2 rounded-full text-xs sm:text-[13px] border transition-colors cursor-pointer flex items-center gap-1.5 ${
              tabAtiva === "historico"
                ? "bg-[#0f1b33] text-white border-[#0f1b33] font-medium"
                : "border-[#dfe2e8] bg-white text-[#111a2e] hover:bg-[#f4f5f7]"
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>
              {isOrientador
                ? `Versões do Aluno (${historico.length})`
                : `Histórico de Versões (${historico.length})`}
            </span>
          </button>
        </div>
      </div>

      {/* ABA 1: MURAL DE POSTAGENS */}
      {tabAtiva === "mural" && (
        <div className="space-y-6">
          {postagemCriadaSucesso && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Sua postagem foi publicada no mural com sucesso!</span>
            </div>
          )}

          {/* Instruções da Sala */}
          <div className="border border-[#dfe2e8] rounded-[10px] p-5 bg-[#f4f5f7] flex items-start gap-3.5">
            <div className="p-2.5 rounded-full bg-blue-100 text-[#1e78f0] shrink-0 mt-0.5">
              <Pin className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <b className="text-xs sm:text-sm font-bold text-[#111a2e]">
                Objetivo e Instruções da Sala &bull; {tituloEtapa}
              </b>
              <p className="text-xs text-[#6b7385] leading-relaxed">
                {descricaoInstrucoes}
              </p>
            </div>
          </div>

          {/* Formulário do Orientador para Postar */}
          {isOrientador && (
            <div className="border border-[#dfe2e8] rounded-[10px] p-5 bg-white shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#111a2e]">
                    Publicar no Mural da Sala
                  </h3>
                  <p className="text-xs text-[#6b7385]">
                    Envie recados, diretrizes, correções ou orientações para o aluno nesta etapa.
                  </p>
                </div>
                {!mostrarFormPostagem && (
                  <button
                    type="button"
                    onClick={() => setMostrarFormPostagem(true)}
                    className="px-4 py-2 bg-[#1e78f0] hover:bg-[#1666d3] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Nova Postagem</span>
                  </button>
                )}
              </div>

              {mostrarFormPostagem && (
                <form onSubmit={handleCriarPostagem} className="space-y-3 pt-2 border-t border-[#dfe2e8]">
                  <div>
                    <label className="block text-xs font-semibold text-[#111a2e] mb-1">
                      Título da Postagem
                    </label>
                    <input
                      type="text"
                      value={novoTitulo}
                      onChange={(e) => setNovoTitulo(e.target.value)}
                      placeholder="Ex: Orientações para revisão da metodologia"
                      required
                      className="w-full px-3 py-2 text-xs border border-[#dfe2e8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e78f0]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#111a2e] mb-1">
                      Conteúdo / Mensagem
                    </label>
                    <textarea
                      value={novoConteudo}
                      onChange={(e) => setNovoConteudo(e.target.value)}
                      placeholder="Escreva aqui as diretrizes ou comentários para o aluno..."
                      rows={4}
                      required
                      className="w-full px-3 py-2 text-xs border border-[#dfe2e8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e78f0]"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setMostrarFormPostagem(false)}
                      className="px-3.5 py-1.5 rounded-lg border border-[#dfe2e8] bg-white text-xs font-semibold text-[#6b7385] hover:bg-[#f4f5f7] cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-[#1e78f0] hover:bg-[#1666d3] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Publicar</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Lista de Postagens / Comunicados */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-[#111a2e]">
              Postagens e Comunicados ({postagens.length})
            </h2>

            <div className="space-y-4">
              {postagens.map((post) => (
                <article
                  key={post.id}
                  className="border border-[#dfe2e8] rounded-[10px] p-6 bg-white shadow-xs space-y-4"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-[#dfe2e8] pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#0f1b33] text-white font-bold flex items-center justify-center text-sm shrink-0">
                        {post.autorNome.charAt(0)}
                      </div>
                      <div>
                        <b className="text-sm font-semibold text-[#111a2e] block leading-tight">
                          {post.autorNome}
                        </b>
                        <span className="text-[11px] text-[#6b7385]">{post.autorPapel}</span>
                      </div>
                    </div>
                    <span className="text-xs text-[#6b7385] flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#6b7385]" /> {post.dataHora}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm sm:text-base font-bold text-[#111a2e]">
                      {post.titulo}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#111a2e]/90 leading-relaxed whitespace-pre-line">
                      {post.conteudo}
                    </p>
                  </div>

                  {post.anexos && post.anexos.length > 0 && (
                    <div className="pt-2 border-t border-[#dfe2e8] space-y-2">
                      <span className="text-[11px] font-bold text-[#6b7385] uppercase tracking-wider flex items-center gap-1">
                        <Paperclip className="w-3.5 h-3.5" /> Arquivos Anexados
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {post.anexos.map((anexo: MaterialApoio) => (
                          <div
                            key={anexo.id}
                            className="p-3 rounded-lg border border-[#dfe2e8] bg-[#f4f5f7] flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <FileText className="w-4 h-4 text-[#1e78f0] shrink-0" />
                              <div className="truncate">
                                <span className="text-xs font-semibold text-[#111a2e] block truncate">
                                  {anexo.nome}
                                </span>
                                <span className="text-[10.5px] text-[#6b7385]">
                                  {anexo.tipo} &bull; {anexo.tamanho}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => alert(`Baixando anexo: ${anexo.nome}`)}
                              className="px-2.5 py-1 text-xs font-semibold text-[#1e78f0] bg-white border border-[#dfe2e8] rounded-md hover:bg-blue-50 flex items-center gap-1 shrink-0 cursor-pointer"
                            >
                              <Download className="w-3 h-3" />
                              <span>Baixar</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: MATERIAIS DE APOIO (ADICIONAR E REMOVER) */}
      {tabAtiva === "materiais" && (
        <div className="border border-[#dfe2e8] rounded-[10px] p-6 bg-white shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#111a2e]">
                Repositório de Materiais e Modelos da Etapa
              </h2>
              <p className="text-xs text-[#6b7385] mt-0.5">
                Arquivos de referência, modelos ABNT, rubricas e roteiros anexados a esta sala
              </p>
            </div>

            {/* Adicionar Material (Orientador) */}
            {isOrientador && !mostrarFormMaterial && (
              <button
                type="button"
                onClick={() => setMostrarFormMaterial(true)}
                className="px-3.5 py-1.5 bg-[#1e78f0] hover:bg-[#1666d3] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Adicionar Material</span>
              </button>
            )}
          </div>

          {/* Formulário para Adicionar Material */}
          {isOrientador && mostrarFormMaterial && (
            <form
              onSubmit={handleAdicionarMaterial}
              className="p-4 rounded-xl bg-[#f4f5f7] border border-[#dfe2e8] space-y-3"
            >
              <div className="flex items-center justify-between">
                <b className="text-xs font-bold text-[#111a2e]">
                  Novo Material para Esta Etapa
                </b>
                <button
                  type="button"
                  onClick={() => setMostrarFormMaterial(false)}
                  className="text-[#6b7385] hover:text-[#111a2e] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#111a2e] mb-1">
                    Nome do Arquivo / Material
                  </label>
                  <input
                    type="text"
                    value={novoMaterialNome}
                    onChange={(e) => setNovoMaterialNome(e.target.value)}
                    placeholder="Ex: Template_Metodologia_2026.docx"
                    required
                    className="w-full px-3 py-2 text-xs bg-white border border-[#dfe2e8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e78f0]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111a2e] mb-1">
                    Tipo do Arquivo
                  </label>
                  <select
                    value={novoMaterialTipo}
                    onChange={(e) => setNovoMaterialTipo(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#dfe2e8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e78f0]"
                  >
                    <option value="PDF">PDF</option>
                    <option value="DOCX">DOCX</option>
                    <option value="XLSX">XLSX</option>
                    <option value="ZIP">ZIP</option>
                    <option value="LINK">LINK</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setMostrarFormMaterial(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-[#dfe2e8] bg-white text-xs font-semibold text-[#6b7385] hover:bg-[#f4f5f7] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#1e78f0] hover:bg-[#1666d3] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  Confirmar e Anexar
                </button>
              </div>
            </form>
          )}

          {materiais.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#6b7385] bg-[#f4f5f7] rounded-lg border border-[#dfe2e8]">
              Nenhum material de apoio anexado a esta etapa ainda.
            </div>
          ) : (
            <div className="divide-y divide-[#dfe2e8] border border-[#dfe2e8] rounded-lg overflow-hidden bg-white">
              {materiais.map((mat) => (
                <div
                  key={mat.id}
                  className="p-4 flex items-center justify-between gap-4 hover:bg-[#f4f5f7] transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="p-2.5 rounded-lg bg-blue-50 text-[#1e78f0]">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 truncate">
                      <span className="text-xs sm:text-sm font-semibold text-[#111a2e] block truncate">
                        {mat.nome}
                      </span>
                      <span className="text-xs text-[#6b7385]">
                        Formato: {mat.tipo} &bull; Tamanho: {mat.tamanho}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => alert(`Baixando material: ${mat.nome}`)}
                      className="px-3 py-1.5 text-xs font-semibold text-[#1e78f0] bg-white border border-[#dfe2e8] hover:bg-blue-50 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Baixar</span>
                    </button>

                    {/* Remover Material (Orientador) */}
                    {isOrientador && (
                      <button
                        type="button"
                        onClick={() => handleRemoverMaterial(mat.id)}
                        title="Remover material"
                        className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ABA 3: SUBMETER TRABALHO (APENAS PARA O ALUNO) */}
      {!isOrientador && tabAtiva === "envio" && (
        <div className="border border-[#dfe2e8] rounded-[10px] p-6 bg-white shadow-xs space-y-5">
          <div>
            <h2 className="text-base font-bold text-[#111a2e]">
              Submissão de Documento &bull; {tituloEtapa}
            </h2>
            <p className="text-xs text-[#6b7385] mt-0.5">
              Faça o upload do documento finalizado desta etapa para que o professor realize a correção
            </p>
          </div>

          {uploadSucesso && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Arquivo submetido com sucesso! O status foi alterado para &quot;Pronta para Revisão&quot;.</span>
            </div>
          )}

          <form onSubmit={handleEnviarTrabalho} className="space-y-4">
            <div className="border-2 border-dashed border-[#dfe2e8] hover:border-[#1e78f0] rounded-xl p-10 text-center bg-[#fafbfc] transition-colors">
              <input
                type="file"
                id="upload-arquivo-sala"
                accept=".pdf,.docx"
                onChange={(e) => setArquivoUpload(e.target.files?.[0] || null)}
                className="hidden"
              />
              <label htmlFor="upload-arquivo-sala" className="cursor-pointer block space-y-2.5">
                <UploadCloud className="w-12 h-12 text-[#1e78f0] mx-auto" />
                <span className="text-sm font-bold text-[#111a2e] block">
                  {arquivoUpload ? arquivoUpload.name : "Clique para selecionar o arquivo da etapa"}
                </span>
                <span className="text-xs text-[#6b7385] block">
                  Formatos aceitos: exclusivamente <b className="text-[#111a2e]">.pdf</b> e <b className="text-[#111a2e]">.docx</b> (Regra US03)
                </span>
              </label>
            </div>

            {arquivoUpload && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#f4f5f7] rounded-lg border border-[#dfe2e8]">
                <span className="text-xs text-[#6b7385] truncate">
                  Arquivo selecionado para envio: <b className="text-[#111a2e]">{arquivoUpload.name}</b>
                </span>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#1e78f0] hover:bg-[#1666d3] text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-colors shadow-xs cursor-pointer justify-center"
                >
                  <Send className="w-4 h-4" />
                  <span>Sinalizar como Pronta para Revisão</span>
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* ABA 4: HISTÓRICO DE VERSÕES / AVALIAÇÃO DO ORIENTADOR */}
      {tabAtiva === "historico" && (
        <div className="border border-[#dfe2e8] rounded-[10px] p-6 bg-white shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-[#111a2e]">
              {isOrientador
                ? `Versões e Entregas do Aluno &bull; ${tituloEtapa}`
                : "Histórico de Versões do Estudante"}
            </h2>
            <p className="text-xs text-[#6b7385] mt-0.5">
              {isOrientador
                ? "Avalie os arquivos enviados pelo aluno e registre feedbacks de correção ou aprovação"
                : "Registro completo e imutável de todas as submissões realizadas nesta etapa"}
            </p>
          </div>

          {/* Área do Orientador: emitir parecer no arquivo mais recente */}
          {isOrientador && historico.length > 0 && (
            <div className="p-4 rounded-xl bg-[#f4f5f7] border border-[#dfe2e8] space-y-3">
              <div className="flex items-center justify-between">
                <b className="text-xs font-bold text-[#111a2e]">
                  Emitir Parecer / Solicitar Correção para a Versão Mais Recente
                </b>
                <span className="text-[11px] text-[#6b7385]">
                  Arquivo: <b>{historico[0].arquivoNome}</b>
                </span>
              </div>

              {parecerSucesso && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-xs font-medium flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Parecer registrado com sucesso na entrega do aluno!</span>
                </div>
              )}

              <form onSubmit={handleEmitirParecer} className="space-y-2.5">
                <textarea
                  value={parecerOrientador}
                  onChange={(e) => setParecerOrientador(e.target.value)}
                  placeholder="Descreva as correções necessárias ou pontos a melhorar neste envio..."
                  rows={2}
                  required
                  className="w-full px-3 py-2 text-xs bg-white border border-[#dfe2e8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e78f0]"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#1e78f0] hover:bg-[#1666d3] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
                  >
                    Registrar Parecer
                  </button>
                </div>
              </form>
            </div>
          )}

          {historico.length ? (
            <div className="divide-y divide-[#dfe2e8] border border-[#dfe2e8] rounded-lg overflow-hidden bg-white text-xs">
              {historico.map((envio: HistoricoEnvioAluno, i: number) => (
                <div key={i} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#f4f5f7] transition-colors">
                  <div className="space-y-1">
                    <span className="font-bold text-sm text-[#111a2e] block">
                      Versão {envio.versao} &bull; {envio.arquivoNome}
                    </span>
                    <span className="text-xs text-[#6b7385] block">Submetido em: {envio.data}</span>
                    {envio.notaOuParecer && (
                      <p className="text-xs text-[#111a2e] bg-[#fafbfc] p-2 rounded border border-[#dfe2e8] mt-1">
                        <b>Parecer do orientador:</b> {envio.notaOuParecer}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => alert(`Baixando versão: ${envio.arquivoNome}`)}
                      className="px-2.5 py-1 text-xs font-semibold text-[#1e78f0] bg-white border border-[#dfe2e8] hover:bg-blue-50 rounded-md cursor-pointer"
                    >
                      Baixar Arquivo
                    </button>
                    <StatusPill status={envio.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-[#6b7385] bg-[#f4f5f7] rounded-lg border border-[#dfe2e8]">
              Nenhuma versão de documento foi submetida nesta etapa ainda.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
