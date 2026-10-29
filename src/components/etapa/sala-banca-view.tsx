"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Award,
  Send,
  FileText,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  UserCheck,
  UploadCloud,
  Check,
} from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import type { TccResumo } from "@/lib/data/queries";

interface SalaBancaViewProps {
  tcc: TccResumo;
  nomeUsuario: string;
  papelUsuario: "aluno" | "avaliador" | "orientador";
  voltarHref: string;
}

export function SalaBancaView({
  tcc,
  nomeUsuario,
  papelUsuario,
  voltarHref,
}: SalaBancaViewProps) {
  const isAvaliador = papelUsuario === "avaliador";
  const isAluno = papelUsuario === "aluno";

  // Estado do envio para a banca (pelo aluno)
  const [versaoEnviada, setVersaoEnviada] = useState<{
    arquivoNome: string;
    dataEnvio: string;
    tamanho: string;
  } | null>({
    arquivoNome: `Monografia_Final_${tcc.fase ? `TCC${tcc.fase}` : "TCC"}_${tcc.alunoNome.replace(/\s+/g, "_")}.pdf`,
    dataEnvio: "26/10/2026 às 16:30",
    tamanho: "4.2 MB",
  });

  const [arquivoUpload, setArquivoUpload] = useState<File | null>(null);
  const [envioSucesso, setEnvioSucesso] = useState(false);

  // Estado da avaliação (pelo professor avaliador)
  const [nota, setNota] = useState<string>("9.5");
  const [parecerBanca, setParecerBanca] = useState<string>(
    "Trabalho com excelente fundamentação teórica e rigor metodológico. Aprovado com louvor pela banca examinadora."
  );
  const [avaliadoSucesso, setAvaliadoSucesso] = useState(false);

  const handleEnviarParaBanca = (e: React.FormEvent) => {
    e.preventDefault();
    if (!arquivoUpload) return;

    setVersaoEnviada({
      arquivoNome: arquivoUpload.name,
      dataEnvio:
        new Date().toLocaleDateString("pt-BR") +
        " às " +
        new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      tamanho: "3.8 MB",
    });
    setArquivoUpload(null);
    setEnvioSucesso(true);
    setTimeout(() => setEnvioSucesso(false), 5000);
  };

  const handleSalvarAvaliacao = (e: React.FormEvent) => {
    e.preventDefault();
    setAvaliadoSucesso(true);
    setTimeout(() => setAvaliadoSucesso(false), 4000);
  };

  return (
    <div className="space-y-6 w-full">
      {/* Botão de Retorno */}
      <div>
        <Link
          href={voltarHref}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1e78f0] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
      </div>

      {/* Cabeçalho da Etapa de Envio para a Banca */}
      <div className="border border-[#dfe2e8] rounded-[10px] p-6 bg-white shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-[#1e78f0] uppercase tracking-wider">
                {tcc.fase ? `TCC ${tcc.fase}` : "TCC"} &bull; Etapa Final de Envio à Banca Avaliadora
              </span>
              <StatusPill status="AGUARDANDO BANCA" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#111a2e] leading-snug">
              {tcc.titulo}
            </h1>
            <p className="text-xs sm:text-sm text-[#6b7385]">
              Aluno: <b className="text-[#111a2e]">{tcc.alunoNome}</b> (Matrícula: {tcc.aluno_id}) &bull; Orientador:{" "}
              <b className="text-[#111a2e]">{tcc.orientadorNome}</b>
            </p>
          </div>

          <div className="min-w-[190px] space-y-2 bg-[#f4f5f7] p-3.5 rounded-xl border border-[#dfe2e8]">
            <div className="flex items-center gap-2 text-xs font-bold text-[#111a2e]">
              <Award className="w-4 h-4 text-[#1e78f0]" />
              <span>Banca Examinadora</span>
            </div>
            <p className="text-xs text-[#6b7385]">
              Avaliação do projeto finalizado e defesa da monografia
            </p>
          </div>
        </div>
      </div>

      {/* 1. SEÇÃO DO ALUNO: Enviar Trabalho Final para a Banca */}
      {isAluno && (
        <div className="border border-[#dfe2e8] rounded-[10px] p-6 bg-white shadow-xs space-y-5">
          <div>
            <h2 className="text-base font-bold text-[#111a2e]">
              Enviar Monografia Final para a Banca Avaliadora
            </h2>
            <p className="text-xs text-[#6b7385] mt-0.5">
              Quando seu trabalho estiver pronto e revisado pelo seu orientador, submeta a versão final aqui para que os professores avaliadores realizem a avaliação.
            </p>
          </div>

          {envioSucesso && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Projeto final enviado à banca avaliadora com sucesso!</span>
            </div>
          )}

          <form onSubmit={handleEnviarParaBanca} className="space-y-4">
            <div className="border-2 border-dashed border-[#dfe2e8] hover:border-[#1e78f0] rounded-xl p-8 text-center bg-[#fafbfc] transition-colors">
              <input
                type="file"
                id="upload-monografia-final"
                accept=".pdf,.docx"
                onChange={(e) => setArquivoUpload(e.target.files?.[0] || null)}
                className="hidden"
              />
              <label htmlFor="upload-monografia-final" className="cursor-pointer block space-y-2">
                <UploadCloud className="w-10 h-10 text-[#1e78f0] mx-auto" />
                <span className="text-sm font-bold text-[#111a2e] block">
                  {arquivoUpload ? arquivoUpload.name : "Clique para selecionar a Monografia Final (PDF ou DOCX)"}
                </span>
                <span className="text-xs text-[#6b7385] block">
                  Esta versão será enviada automaticamente para todos os professores membros da banca examinadora.
                </span>
              </label>
            </div>

            {arquivoUpload && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#f4f5f7] rounded-lg border border-[#dfe2e8]">
                <span className="text-xs text-[#6b7385] truncate">
                  Arquivo pronto para disparo à banca: <b className="text-[#111a2e]">{arquivoUpload.name}</b>
                </span>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#1e78f0] hover:bg-[#1666d3] text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-colors shadow-xs cursor-pointer justify-center"
                >
                  <Send className="w-4 h-4" />
                  <span>Disparar para a Banca Avaliadora</span>
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* 2. VERSÃO DISPONIBILIZADA PARA A BANCA */}
      <div className="border border-[#dfe2e8] rounded-[10px] p-6 bg-white shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#dfe2e8] pb-3">
          <div>
            <h2 className="text-base font-bold text-[#111a2e]">
              Projeto Final Disponível para Avaliação da Banca
            </h2>
            <p className="text-xs text-[#6b7385] mt-0.5">
              Documento oficial submetido pelo estudante ({tcc.fase ? `TCC ${tcc.fase}` : "TCC"})
            </p>
          </div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            Versão Final Oficial
          </span>
        </div>

        {versaoEnviada ? (
          <div className="p-4 rounded-xl border border-[#dfe2e8] bg-[#f4f5f7] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="p-3 rounded-lg bg-blue-100 text-[#1e78f0] shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div className="min-w-0 truncate">
                <b className="text-sm font-bold text-[#111a2e] block truncate">
                  {versaoEnviada.arquivoNome}
                </b>
                <span className="text-xs text-[#6b7385]">
                  Enviado pelo aluno em {versaoEnviada.dataEnvio} &bull; Tamanho: {versaoEnviada.tamanho}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => alert(`Baixando monografia final: ${versaoEnviada.arquivoNome}`)}
              className="px-4 py-2 bg-[#1e78f0] hover:bg-[#1666d3] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Baixar Monografia Completa</span>
            </button>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-[#6b7385] bg-[#f4f5f7] rounded-lg border border-[#dfe2e8]">
            O aluno ainda não enviou a versão final deste trabalho para a banca avaliadora.
          </div>
        )}
      </div>

      {/* 3. SEÇÃO DO AVALIADOR: Formulário de Avaliação e Nota da Banca */}
      {isAvaliador && (
        <div className="border border-[#dfe2e8] rounded-[10px] p-6 bg-white shadow-xs space-y-5">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#1e78f0]" />
            <div>
              <h2 className="text-base font-bold text-[#111a2e]">
                Formulário de Avaliação da Banca Examinadora
              </h2>
              <p className="text-xs text-[#6b7385]">
                Atribua a nota final e redija o parecer acadêmico da banca para o estudante.
              </p>
            </div>
          </div>

          {avaliadoSucesso && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Avaliação e parecer da banca salvos com sucesso!</span>
            </div>
          )}

          <form onSubmit={handleSalvarAvaliacao} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#111a2e] mb-1">
                  Nota Final da Banca (0 a 10)
                </label>
                <input
                  type="text"
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  placeholder="Ex: 9.5"
                  required
                  className="w-full px-3 py-2 text-xs border border-[#dfe2e8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e78f0]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#111a2e] mb-1">
                  Decisão da Banca
                </label>
                <select className="w-full px-3 py-2 text-xs border border-[#dfe2e8] rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#1e78f0]">
                  <option value="APROVADO">Aprovado sem ressalvas</option>
                  <option value="APROVADO_RESSALVAS">Aprovado com ressalvas</option>
                  <option value="REPROVADO">Reprovado</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#111a2e] mb-1">
                Parecer Acadêmico da Banca Examinadora
              </label>
              <textarea
                value={parecerBanca}
                onChange={(e) => setParecerBanca(e.target.value)}
                rows={4}
                required
                className="w-full px-3 py-2 text-xs border border-[#dfe2e8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e78f0]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#dfe2e8]">
              <button
                type="submit"
                className="px-5 py-2 bg-[#1e78f0] hover:bg-[#1666d3] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                Salvar Avaliação da Banca
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Visualização do Parecer para Aluno e Orientador (se já avaliado) */}
      {!isAvaliador && (
        <div className="border border-[#dfe2e8] rounded-[10px] p-6 bg-white shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#111a2e]">
              Resultado e Parecer da Banca Examinadora
            </h2>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
              Nota: 9.5 &bull; Aprovado
            </span>
          </div>
          <div className="p-4 bg-[#f4f5f7] border-l-4 border-emerald-500 rounded-lg">
            <p className="text-xs text-[#111a2e] leading-relaxed">
              &quot;Trabalho com excelente fundamentação teórica e rigor metodológico. Aprovado com louvor pela banca examinadora.&quot;
            </p>
            <span className="block text-[11px] text-[#6b7385] mt-2">
              Parecer registrado pelos membros da banca examinadora.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
