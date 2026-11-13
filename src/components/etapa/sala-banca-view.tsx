"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Send,
  FileText,
  Download,
  CheckCircle2,
  AlertCircle,
  CalendarClock,
  UserCheck,
  UploadCloud,
  Eye,
  EyeOff,
  Lock,
} from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { formatarData, formatarDataHora } from "@/components/layout/status";
import {
  ROTULO_DECISAO,
  ROTULO_ETAPA_BANCA,
  PARECER_MIN_FINAL,
  etapaBanca,
} from "@/lib/banca/status";
import type { SalaBanca } from "@/lib/data/queries";
import type { Avaliacao, DecisaoBanca } from "@/types";
import { enviarArquivoTcc, verificarDocumento } from "@/lib/entregas/cliente-upload";

export type PapelBanca = "aluno" | "avaliador" | "orientador" | "gestao";

interface SalaBancaViewProps {
  sala: SalaBanca;
  papelUsuario: PapelBanca;
  voltarHref: string;
}

async function tokenCsrf(): Promise<string> {
  const res = await fetch("/api/auth/csrf", { credentials: "same-origin" });
  return ((await res.json()) as { csrfToken: string }).csrfToken;
}

/** Retorna rota local protegida: jamais expõe o endereço privado do Blob. */
async function urlDoDocumento(documentId: string): Promise<string> {
  return verificarDocumento(documentId);
}

export function SalaBancaView({ sala, papelUsuario, voltarHref }: SalaBancaViewProps) {
  const router = useRouter();
  const { tcc, versaoFinal, minhaAvaliacao, resultados, totalAvaliadores } = sala;
  const isAvaliador = papelUsuario === "avaliador";
  const isAluno = papelUsuario === "aluno";
  const rotuloFase = tcc.fase ? `TCC ${tcc.fase}` : "TCC";

  // ----- Documento: leitor embutido (US14) e abertura em nova aba -----
  const [leitorUrl, setLeitorUrl] = useState<string | null>(null);
  const [carregandoDoc, setCarregandoDoc] = useState(false);
  const [erroDoc, setErroDoc] = useState<string | null>(null);

  async function alternarLeitor() {
    if (!versaoFinal) return;
    if (leitorUrl) {
      setLeitorUrl(null);
      return;
    }
    setCarregandoDoc(true);
    setErroDoc(null);
    try {
      setLeitorUrl(await urlDoDocumento(versaoFinal.id));
    } catch (e) {
      setErroDoc(e instanceof Error ? e.message : "Erro ao abrir o documento.");
    } finally {
      setCarregandoDoc(false);
    }
  }

  async function abrirEmNovaAba() {
    if (!versaoFinal) return;
    setErroDoc(null);
    // Abrir no clique evita bloqueio de pop-ups após uma operação assíncrona.
    const novaAba = window.open("about:blank", "_blank");
    try {
      const url = await urlDoDocumento(versaoFinal.id);
      if (novaAba) {
        novaAba.opener = null;
        novaAba.location.href = url;
      } else {
        window.location.href = url;
      }
    } catch (e) {
      novaAba?.close();
      setErroDoc(e instanceof Error ? e.message : "Erro ao abrir o documento.");
    }
  }

  // ----- Avaliação (somente avaliador) -----
  const [avaliacao, setAvaliacao] = useState<Avaliacao | null>(minhaAvaliacao);
  const [nota, setNota] = useState(minhaAvaliacao?.nota !== undefined ? String(minhaAvaliacao.nota) : "");
  const [decisao, setDecisao] = useState<DecisaoBanca | "">(minhaAvaliacao?.decisao ?? "");
  const [parecer, setParecer] = useState(minhaAvaliacao?.parecer ?? "");
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  const etapa = etapaBanca(Boolean(versaoFinal), avaliacao);
  const finalizada = avaliacao?.status === "FINALIZADA";
  const podeAvaliar = isAvaliador && Boolean(versaoFinal) && !finalizada;

  async function enviar(finalizar: boolean) {
    if (finalizar && !window.confirm("Finalizar a avaliação? Depois disso ela não poderá mais ser alterada.")) {
      return;
    }
    setSalvando(true);
    setMensagem(null);
    try {
      const res = await fetch(`/api/tcc/${tcc.id}/avaliacao`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": await tokenCsrf() },
        body: JSON.stringify({ finalizar, nota, decisao, parecer }),
      });
      const corpo = (await res.json()) as { avaliacao?: Avaliacao; message?: string };
      if (!res.ok || !corpo.avaliacao) throw new Error(corpo.message ?? "Não foi possível salvar a avaliação.");
      setAvaliacao(corpo.avaliacao);
      setMensagem({
        tipo: "ok",
        texto: finalizar ? "Avaliação finalizada e registrada. Orientador e aluno foram notificados." : "Rascunho salvo.",
      });
      router.refresh();
    } catch (e) {
      setMensagem({ tipo: "erro", texto: e instanceof Error ? e.message : "Erro ao salvar." });
    } finally {
      setSalvando(false);
    }
  }

  // ----- Aluno: envio real da monografia, pelo marco entrega-final -----
  const [arquivoUpload, setArquivoUpload] = useState<File | null>(null);
  const [envioSucesso, setEnvioSucesso] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [enviandoFinal, setEnviandoFinal] = useState(false);

  async function dispararParaBanca(e: React.FormEvent) {
    e.preventDefault();
    if (!arquivoUpload) return;
    setEnviandoFinal(true);
    setErroEnvio(null);
    try {
      await enviarArquivoTcc(tcc.id, "entrega-final", arquivoUpload);
      setEnvioSucesso(true);
      setArquivoUpload(null);
      router.refresh();
    } catch (error) {
      setErroEnvio(error instanceof Error ? error.message : "Falha ao salvar o arquivo final.");
    } finally {
      setEnviandoFinal(false);
    }
  }

  const cabecalhoStatus = isAvaliador ? ROTULO_ETAPA_BANCA[etapa] : versaoFinal ? "Aguardando banca" : "Aguardando envio";

  return (
    <div className="space-y-6 w-full">
      <div>
        <Link
          href={voltarHref}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1e78f0] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
      </div>

      {/* Cabeçalho */}
      <div className="border border-[#dfe2e8] rounded-[10px] p-6 bg-white shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-[#1e78f0] uppercase tracking-wider">
                {rotuloFase} &bull; Banca Avaliadora
              </span>
              <StatusPill status={cabecalhoStatus} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#111a2e] leading-snug">{tcc.titulo}</h1>
            <p className="text-xs sm:text-sm text-[#6b7385]">
              Aluno: <b className="text-[#111a2e]">{tcc.alunoNome}</b> (Matrícula: {tcc.aluno_id}) &bull; Orientador:{" "}
              <b className="text-[#111a2e]">{tcc.orientadorNome}</b>
              {tcc.curso ? <> &bull; {tcc.curso}</> : null}
            </p>
          </div>

          <div className="min-w-[210px] space-y-2 bg-[#f4f5f7] p-3.5 rounded-xl border border-[#dfe2e8]">
            <div className="flex items-center gap-2 text-xs font-bold text-[#111a2e]">
              <CalendarClock className="w-4 h-4 text-[#1e78f0]" />
              <span>Defesa</span>
            </div>
            <p className="text-xs text-[#111a2e] font-medium">
              {tcc.defesaEm ? formatarDataHora(tcc.defesaEm) : "Data a definir"}
            </p>
            <p className="text-[11px] text-[#6b7385]">
              {totalAvaliadores} {totalAvaliadores === 1 ? "avaliador" : "avaliadores"} na banca
            </p>
          </div>
        </div>
      </div>

      {/* Aluno: envio à banca */}
      {isAluno && (
        <div className="border border-[#dfe2e8] rounded-[10px] p-6 bg-white shadow-xs space-y-5">
          <div>
            <h2 className="text-base font-bold text-[#111a2e]">Enviar Monografia Final para a Banca Avaliadora</h2>
            <p className="text-xs text-[#6b7385] mt-0.5">
              Quando seu trabalho estiver pronto e revisado pelo seu orientador, submeta a versão final aqui.
            </p>
          </div>

          {erroEnvio && <p role="alert" className="text-xs text-red-700">{erroEnvio}</p>}
          {envioSucesso && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Versão final salva e registrada. A aprovação e o encaminhamento à banca são etapas próprias da RF04/RF06.</span>
            </div>
          )}

          <form onSubmit={dispararParaBanca} className="space-y-4">
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
              </label>
            </div>

            {arquivoUpload && (
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={enviandoFinal}
                  className="px-5 py-2.5 bg-[#1e78f0] hover:bg-[#1666d3] text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-colors shadow-xs cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{enviandoFinal ? "Salvando..." : "Enviar versão final"}</span>
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* Documento disponível para a banca */}
      <div className="border border-[#dfe2e8] rounded-[10px] p-6 bg-white shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#dfe2e8] pb-3">
          <div>
            <h2 className="text-base font-bold text-[#111a2e]">Versão Final para Avaliação</h2>
            <p className="text-xs text-[#6b7385] mt-0.5">Documento oficial submetido pelo estudante ({rotuloFase})</p>
          </div>
          {versaoFinal && (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Versão v{versaoFinal.numeroVersao}
            </span>
          )}
        </div>

        {versaoFinal ? (
          <>
            <div className="p-4 rounded-xl border border-[#dfe2e8] bg-[#f4f5f7] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="p-3 rounded-lg bg-blue-100 text-[#1e78f0] shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <b className="text-sm font-bold text-[#111a2e] block truncate">{versaoFinal.nomeArquivo}</b>
                  <span className="text-xs text-[#6b7385]">
                    Enviado em {formatarDataHora(versaoFinal.dataUpload)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={alternarLeitor}
                  disabled={carregandoDoc}
                  className="px-4 py-2 bg-[#1e78f0] hover:bg-[#1666d3] disabled:opacity-60 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  {leitorUrl ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span>{carregandoDoc ? "Abrindo..." : leitorUrl ? "Fechar leitor" : "Ler aqui"}</span>
                </button>
                <button
                  type="button"
                  onClick={abrirEmNovaAba}
                  className="px-4 py-2 bg-white hover:bg-[#f4f5f7] border border-[#dfe2e8] text-[#111a2e] text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Nova aba</span>
                </button>
                <a href={`/api/documentos/${encodeURIComponent(versaoFinal.id)}?download=1`} className="px-4 py-2 bg-white hover:bg-[#f4f5f7] border border-[#dfe2e8] text-[#111a2e] text-xs font-bold rounded-lg inline-flex items-center gap-1.5">
                  <Download className="w-4 h-4" /> Baixar
                </a>
              </div>
            </div>

            {erroDoc && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{erroDoc}</span>
              </div>
            )}

            {leitorUrl && (
              <iframe
                src={leitorUrl}
                title={`Leitor de PDF: ${versaoFinal.nomeArquivo}`}
                className="w-full h-[70vh] min-h-[420px] rounded-lg border border-[#dfe2e8] bg-white"
              />
            )}
          </>
        ) : (
          <div className="p-8 text-center text-xs text-[#6b7385] bg-[#f4f5f7] rounded-lg border border-[#dfe2e8]">
            O aluno ainda não enviou a versão final deste trabalho para a banca avaliadora.
          </div>
        )}
      </div>

      {/* Avaliador: formulário */}
      {isAvaliador && (
        <div className="border border-[#dfe2e8] rounded-[10px] p-6 bg-white shadow-xs space-y-5">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#1e78f0]" />
            <div className="flex-1">
              <h2 className="text-base font-bold text-[#111a2e]">Avaliação da Banca Examinadora</h2>
              <p className="text-xs text-[#6b7385]">
                {finalizada
                  ? `Finalizada em ${formatarDataHora(avaliacao?.dataAvaliacao)}. Registro imutável.`
                  : "Atribua a nota final, escolha a decisão e redija o parecer. Você pode salvar um rascunho e voltar depois."}
              </p>
            </div>
            {finalizada && <Lock className="w-4 h-4 text-[#6b7385]" />}
          </div>

          {mensagem && (
            <div
              className={`p-3.5 border rounded-lg text-xs font-medium flex items-center gap-2 ${
                mensagem.tipo === "ok"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              {mensagem.tipo === "ok" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{mensagem.texto}</span>
            </div>
          )}

          {!versaoFinal && (
            <p className="text-xs text-[#6b7385]">
              O formulário é liberado assim que o aluno enviar a versão final.
            </p>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void enviar(true);
            }}
            className="space-y-4"
          >
            <fieldset disabled={!podeAvaliar || salvando} className="space-y-4 disabled:opacity-70">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="nota-banca" className="block text-xs font-semibold text-[#111a2e] mb-1">
                    Nota final (0 a 10)
                  </label>
                  <input
                    id="nota-banca"
                    type="text"
                    inputMode="decimal"
                    value={nota}
                    onChange={(e) => setNota(e.target.value)}
                    placeholder="Ex: 9,5"
                    className="w-full px-3 py-2 text-xs border border-[#dfe2e8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e78f0]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="decisao-banca" className="block text-xs font-semibold text-[#111a2e] mb-1">
                    Decisão da banca
                  </label>
                  <select
                    id="decisao-banca"
                    value={decisao}
                    onChange={(e) => setDecisao(e.target.value as DecisaoBanca | "")}
                    className="w-full px-3 py-2 text-xs border border-[#dfe2e8] rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#1e78f0]"
                  >
                    <option value="">Selecione...</option>
                    {(Object.keys(ROTULO_DECISAO) as DecisaoBanca[]).map((d) => (
                      <option key={d} value={d}>
                        {ROTULO_DECISAO[d]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="parecer-banca" className="block text-xs font-semibold text-[#111a2e] mb-1">
                  Parecer acadêmico
                </label>
                <textarea
                  id="parecer-banca"
                  value={parecer}
                  onChange={(e) => setParecer(e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 text-xs border border-[#dfe2e8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e78f0]"
                />
                <span className="text-[11px] text-[#6b7385]">
                  Mínimo de {PARECER_MIN_FINAL} caracteres para finalizar ({parecer.trim().length} agora).
                </span>
              </div>

              {!finalizada && (
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 border-t border-[#dfe2e8]">
                <button
                  type="button"
                  onClick={() => void enviar(false)}
                  className="px-5 py-2 bg-white hover:bg-[#f4f5f7] border border-[#dfe2e8] text-[#111a2e] text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  {salvando ? "Salvando..." : "Salvar rascunho"}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1e78f0] hover:bg-[#1666d3] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  Finalizar avaliação
                </button>
              </div>
              )}
            </fieldset>
          </form>
        </div>
      )}

      {/* Aluno / orientador / gestão: resultado publicado */}
      {!isAvaliador && (
        <div className="border border-[#dfe2e8] rounded-[10px] p-6 bg-white shadow-xs space-y-3">
          <h2 className="text-base font-bold text-[#111a2e]">Resultado e Parecer da Banca</h2>

          {resultados.length === 0 ? (
            <p className="text-xs text-[#6b7385] p-4 bg-[#f4f5f7] rounded-lg border border-[#dfe2e8]">
              Nenhum avaliador finalizou a avaliação ainda ({resultados.length} de {totalAvaliadores}).
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-[11px] text-[#6b7385]">
                {resultados.length} de {totalAvaliadores} avaliações finalizadas
                {tcc.defesaEm ? ` · defesa em ${formatarData(tcc.defesaEm)}` : ""}
              </p>
              {resultados.map((r) => (
                <div key={r.id} className="p-4 bg-[#f4f5f7] border-l-4 border-emerald-500 rounded-lg space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <b className="text-xs text-[#111a2e]">Prof(a). {r.avaliadorNome}</b>
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                      Nota: {r.nota?.toLocaleString("pt-BR")} &bull; {r.decisao ? ROTULO_DECISAO[r.decisao] : "—"}
                    </span>
                  </div>
                  <p className="text-xs text-[#111a2e] leading-relaxed whitespace-pre-line">{r.parecer}</p>
                  <span className="block text-[11px] text-[#6b7385]">
                    Registrado em {formatarDataHora(r.dataAvaliacao)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
