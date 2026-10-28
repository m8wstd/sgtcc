"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Download,
  FileCheck,
  FileText,
  HelpCircle,
  MessageSquare,
  Send,
  UploadCloud,
  CheckCircle2,
  Pin,
  Clock,
  PlusCircle,
  User,
  Paperclip,
} from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { SalaEtapaTcc, PostagemSala } from "../dados-etapas";

interface SalaEtapaPageClientProps {
  etapa: SalaEtapaTcc;
  nomeAluno: string;
}

export function SalaEtapaPageClient({ etapa, nomeAluno }: SalaEtapaPageClientProps) {
  const [tabAtiva, setTabAtiva] = useState<"mural" | "materiais" | "envio" | "historico">("mural");

  // Postagens na Sala (Mural da Etapa)
  const [postagens, setPostagens] = useState<PostagemSala[]>(etapa.postagensProfessor);

  // Submissão de Trabalho pelo Aluno
  const [arquivoUpload, setArquivoUpload] = useState<File | null>(null);
  const [uploadSucesso, setUploadSucesso] = useState(false);
  const [historico, setHistorico] = useState(etapa.historicoEnvios);

  const handleEnviarTrabalho = (e: React.FormEvent) => {
    e.preventDefault();
    if (!arquivoUpload) return;

    const novaVersao = {
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

  return (
    <div className="space-y-8 w-full">
      {/* Botão de Retorno para o Dashboard */}
      <div>
        <Link
          href="/dashboard/aluno"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1e78f0] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar ao Painel do Aluno
        </Link>
      </div>

      {/* Cabeçalho da Sala Virtual da Etapa */}
      <div className="border border-[#dfe2e8] rounded-[10px] p-6 bg-white shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#1e78f0] uppercase tracking-wider">
                Sala Virtual de Orientação &bull; Etapa {etapa.titulo}
              </span>
              <StatusPill status={etapa.statusKanban} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#111a2e] leading-snug">
              {etapa.titulo}
            </h1>
            <p className="text-xs sm:text-sm text-[#6b7385]">
              Ambiente de postagens, materiais e entregas do TCC &bull; Prazo limite da sala:{" "}
              <b className="text-[#111a2e]">{etapa.dataEntrega}</b>
            </p>
          </div>

          <div className="min-w-[200px] space-y-2 bg-[#f4f5f7] p-4 rounded-xl border border-[#dfe2e8]">
            <div className="flex justify-between items-baseline text-xs">
              <span className="text-[#6b7385] font-semibold uppercase tracking-wider">Progresso da Etapa</span>
              <b className="text-xl font-bold text-[#111a2e]">{etapa.progresso}%</b>
            </div>
            <ProgressBar value={etapa.progresso} className="h-2.5" />
          </div>
        </div>

        {/* Abas de Navegação Interna da Sala (Mural, Materiais, Enviar Trabalho, Histórico) */}
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
            <span>Materiais do Professor ({etapa.materiaisFixados.length})</span>
          </button>

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
            <span>Histórico de Versões ({historico.length})</span>
          </button>
        </div>
      </div>

      {/* Conteúdo da Aba Selecionada */}

      {/* ABA 1: MURAL DE POSTAGENS DO PROFESSOR (Como na sala Phidelis) */}
      {tabAtiva === "mural" && (
        <div className="space-y-6">
          {/* Instruções Fixadas no Topo da Sala */}
          <div className="border border-[#dfe2e8] rounded-[10px] p-5 bg-[#f4f5f7] flex items-start gap-3.5">
            <div className="p-2.5 rounded-full bg-blue-100 text-[#1e78f0] shrink-0 mt-0.5">
              <Pin className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <b className="text-xs sm:text-sm font-bold text-[#111a2e]">
                Objetivo e Instruções da Sala &bull; {etapa.titulo}
              </b>
              <p className="text-xs text-[#6b7385] leading-relaxed">
                {etapa.descricaoInstrucoes}
              </p>
            </div>
          </div>

          {/* Lista de Postagens / Avisos do Professor */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-[#111a2e]">
              Postagens e Comunicados do Orientador
            </h2>

            <div className="space-y-4">
              {postagens.map((post) => (
                <article
                  key={post.id}
                  className="border border-[#dfe2e8] rounded-[10px] p-6 bg-white shadow-xs space-y-4"
                >
                  {/* Cabeçalho da Postagem */}
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

                  {/* Título e Texto da Postagem */}
                  <div className="space-y-2">
                    <h3 className="text-sm sm:text-base font-bold text-[#111a2e]">
                      {post.titulo}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#111a2e]/90 leading-relaxed whitespace-pre-line">
                      {post.conteudo}
                    </p>
                  </div>

                  {/* Anexos da Postagem (se houver) */}
                  {post.anexos && post.anexos.length > 0 && (
                    <div className="pt-2 border-t border-[#dfe2e8] space-y-2">
                      <span className="text-[11px] font-bold text-[#6b7385] uppercase tracking-wider flex items-center gap-1">
                        <Paperclip className="w-3.5 h-3.5" /> Arquivos Anexados nesta Postagem
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {post.anexos.map((anexo) => (
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

      {/* ABA 2: MATERIAIS POSTADOS PELO PROFESSOR */}
      {tabAtiva === "materiais" && (
        <div className="border border-[#dfe2e8] rounded-[10px] p-6 bg-white shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-bold text-[#111a2e]">
              Repositório de Materiais e Modelos da Etapa
            </h2>
            <p className="text-xs text-[#6b7385] mt-0.5">
              Arquivos de referência, modelos ABNT e guias disponibilizados pelo orientador nesta sala
            </p>
          </div>

          <div className="divide-y divide-[#dfe2e8] border border-[#dfe2e8] rounded-lg overflow-hidden bg-white">
            {etapa.materiaisFixados.map((mat) => (
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

                <button
                  type="button"
                  onClick={() => alert(`Baixando material: ${mat.nome}`)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-[#1e78f0] bg-white border border-[#dfe2e8] hover:bg-blue-50 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ABA 3: SUBMETER TRABALHO (ENVIO DO ALUNO) */}
      {tabAtiva === "envio" && (
        <div className="border border-[#dfe2e8] rounded-[10px] p-6 bg-white shadow-xs space-y-5">
          <div>
            <h2 className="text-base font-bold text-[#111a2e]">
              Submissão de Documento &bull; {etapa.titulo}
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

      {/* ABA 4: HISTÓRICO DE VERSÕES ENVIADAS */}
      {tabAtiva === "historico" && (
        <div className="border border-[#dfe2e8] rounded-[10px] p-6 bg-white shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-bold text-[#111a2e]">
              Histórico de Versões do Estudante
            </h2>
            <p className="text-xs text-[#6b7385] mt-0.5">
              Registro completo e imutável de todas as submissões realizadas pelo aluno nesta etapa
            </p>
          </div>

          {historico.length ? (
            <div className="divide-y divide-[#dfe2e8] border border-[#dfe2e8] rounded-lg overflow-hidden bg-white text-xs">
              {historico.map((envio, i) => (
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
                  <div className="shrink-0">
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
