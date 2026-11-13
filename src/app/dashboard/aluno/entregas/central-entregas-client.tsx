"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ExternalLink, FileText, Loader2, Lock, UploadCloud } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { ROTULO_STATUS_ENTREGA, formatarData, formatarDataHora } from "@/components/layout/status";
import type { MarcoEntregaView, VersaoView } from "@/lib/entregas/central";
import { ACCEPT_UPLOAD, validarMetadadosArquivo } from "@/lib/entregas/regras";
import { enviarArquivoTcc, verificarDocumento } from "@/lib/entregas/cliente-upload";

interface TccOpcao {
  id: string;
  titulo: string;
  fase: 1 | 2 | null;
}

interface CentralEntregasClientProps {
  tccs: TccOpcao[];
  tccIdAtivo: string | null;
  marcos: MarcoEntregaView[];
}

function CartaoMarco({ tccId, marco }: { tccId: string; marco: MarcoEntregaView }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  function selecionar(e: React.ChangeEvent<HTMLInputElement>) {
    const escolhido = e.target.files?.[0] ?? null;
    setSucesso(null);
    setErro(null);
    if (escolhido) {
      const validacao = validarMetadadosArquivo(escolhido.name, escolhido.size);
      if (!validacao.ok) {
        setErro(validacao.mensagem);
        setArquivo(null);
        e.target.value = "";
        return;
      }
    }
    setArquivo(escolhido);
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!arquivo) return;
    setEnviando(true);
    setErro(null);
    setSucesso(null);
    try {
      const versao = await enviarArquivoTcc(tccId, marco.marcoId, arquivo);
      setSucesso(
        `Versão ${versao.numeroVersao} enviada com sucesso.${marco.emAtraso ? " Atenção: envio após o prazo." : ""}`,
      );
      setArquivo(null);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh(); // recarrega o histórico a partir do servidor
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao enviar o arquivo.");
    } finally {
      setEnviando(false);
    }
  }

  const [erroAbrir, setErroAbrir] = useState<string | null>(null);
  async function abrir(v: VersaoView) {
    setErroAbrir(null);
    const aba = window.open("about:blank", "_blank");
    try {
      const url = await verificarDocumento(v.id);
      if (aba) aba.location.href = url;
      else window.location.href = url;
    } catch (err) {
      aba?.close();
      setErroAbrir(err instanceof Error ? err.message : "Erro ao abrir o documento.");
    }
  }

  return (
    <section className="border border-[#dfe2e8] rounded-[10px] bg-white shadow-xs p-5 space-y-4">
      <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-[#111a2e]">{marco.titulo}</h2>
          <p className="text-xs text-[#6b7385] mt-0.5">
            Prazo: <b className="text-[#111a2e]">{formatarData(marco.dataLimite)}</b>
            {marco.bloqueioEstrito && " • envio bloqueado após o prazo"}
          </p>
        </div>
        <StatusPill status={ROTULO_STATUS_ENTREGA[marco.status]} />
      </header>

      {/* Envio de nova versão */}
      {marco.podeEnviar ? (
        <form onSubmit={enviar} className="space-y-3">
          {marco.emAtraso && (
            <p className="text-xs rounded-lg border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2">
              O prazo deste marco terminou, mas ainda é possível enviar. O envio ficará registrado como atrasado.
            </p>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <input
              ref={inputRef}
              id={`arquivo-${marco.marcoId}`}
              type="file"
              accept={ACCEPT_UPLOAD}
              onChange={selecionar}
              disabled={enviando}
              className="sr-only"
            />
            <label
              htmlFor={`arquivo-${marco.marcoId}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-[#1e78f0] text-[#1e78f0] text-xs font-bold cursor-pointer hover:bg-[#f0f6ff] transition-colors"
            >
              <UploadCloud className="w-4 h-4" />
              {arquivo ? "Trocar arquivo" : "Selecionar arquivo (.pdf ou .docx, até 10 MB)"}
            </label>
            {arquivo && (
              <span className="text-xs text-[#6b7385] truncate min-w-0">
                <FileText className="inline w-3.5 h-3.5 mr-1" />
                {arquivo.name}
              </span>
            )}
            <button
              type="submit"
              disabled={!arquivo || enviando}
              className="sm:ml-auto px-5 py-2.5 bg-[#1e78f0] hover:bg-[#1666d3] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
              {enviando ? "Enviando…" : "Enviar nova versão"}
            </button>
          </div>
        </form>
      ) : (
        <p className="text-xs rounded-lg border border-[#dfe2e8] bg-[#f4f5f7] text-[#6b7385] px-3 py-2 flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 shrink-0" />
          {marco.motivoBloqueio}
        </p>
      )}

      {erro && (
        <p role="alert" className="text-xs rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2">
          {erro}
        </p>
      )}
      {sucesso && (
        <p role="status" className="text-xs rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 px-3 py-2 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {sucesso}
        </p>
      )}

      {/* Histórico de versões (imutável: nunca sobrescreve) */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wide text-[#6b7385] mb-2">
          Versões enviadas ({marco.versoes.length})
        </h3>
        {marco.versoes.length === 0 ? (
          <p className="text-xs text-[#6b7385]">Nenhum arquivo enviado para este marco ainda.</p>
        ) : (
          <ul className="divide-y divide-[#eceef2] border border-[#dfe2e8] rounded-lg">
            {marco.versoes.map((v, i) => (
              <li key={v.id} className="flex items-center gap-3 px-3 py-2.5 text-xs">
                <span className="font-bold text-[#111a2e] w-10 shrink-0">v{v.numeroVersao}</span>
                <span className="truncate min-w-0 flex-1 text-[#111a2e]">{v.nomeArquivo}</span>
                {i === 0 && (
                  <span className="hidden sm:inline text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#e8f1fe] text-[#1e78f0]">
                    mais recente
                  </span>
                )}
                <span className="hidden sm:inline text-[#6b7385] shrink-0">{formatarDataHora(v.dataUpload)}</span>
                <button
                  type="button"
                  onClick={() => abrir(v)}
                  className="inline-flex items-center gap-1 text-[#1e78f0] hover:underline font-semibold cursor-pointer shrink-0"
                >
                  Abrir <ExternalLink className="w-3.5 h-3.5" />
                </button>
                <a href={`/api/documentos/${encodeURIComponent(v.id)}?download=1`} className="text-[#1e78f0] hover:underline font-semibold shrink-0">Baixar</a>
              </li>
            ))}
          </ul>
        )}
        {erroAbrir && (
          <p role="alert" className="mt-2 text-xs text-red-700">
            {erroAbrir}
          </p>
        )}
      </div>
    </section>
  );
}

export function CentralEntregasClient({ tccs, tccIdAtivo, marcos }: CentralEntregasClientProps) {
  if (!tccIdAtivo) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-[#111a2e]">Central de Entregas e Versões</h1>
        <p className="text-sm text-[#6b7385]">Você ainda não possui um TCC vinculado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-[#111a2e]">Central de Entregas e Versões</h1>
        <p className="text-sm text-[#6b7385]">
          Envie capítulos, rascunhos e a monografia para cada marco do cronograma. Cada envio cria uma nova versão e
          as anteriores ficam preservadas.
        </p>
      </div>

      {tccs.length > 1 && (
        <nav aria-label="Trocar de TCC" className="flex flex-wrap gap-2">
          {tccs.map((t) => (
            <Link
              key={t.id}
              href={`/dashboard/aluno/entregas?tcc=${t.id}`}
              aria-current={t.id === tccIdAtivo ? "page" : undefined}
              className={
                t.id === tccIdAtivo
                  ? "px-3 py-1.5 rounded-lg text-xs font-bold bg-[#1e78f0] text-white"
                  : "px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#dfe2e8] text-[#111a2e] hover:bg-[#f4f5f7]"
              }
            >
              {t.fase ? `TCC ${t.fase}` : "TCC"} • {t.titulo}
            </Link>
          ))}
        </nav>
      )}

      {marcos.length === 0 ? (
        <p className="text-sm text-[#6b7385]">Nenhum marco cadastrado no cronograma.</p>
      ) : (
        <div className="space-y-4">
          {marcos.map((m) => (
            <CartaoMarco key={`${tccIdAtivo}-${m.marcoId}`} tccId={tccIdAtivo} marco={m} />
          ))}
        </div>
      )}
    </div>
  );
}
