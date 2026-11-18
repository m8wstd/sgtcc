"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, Users, User, MessageSquare, ArrowLeft } from "lucide-react";
import type { ConversaItem, MensagemChat } from "@/app/api/mensagens/route";

interface MensagensClientProps {
  usuarioId: string;
  usuarioNome: string;
  conversaInicialId?: string | null;
}

export function MensagensClient({
  usuarioId,
  usuarioNome,
  conversaInicialId,
}: MensagensClientProps) {
  const [conversas, setConversas] = useState<ConversaItem[]>([]);
  const [conversaAtivaId, setConversaAtivaId] = useState<string | null>(conversaInicialId ?? null);
  const [mensagens, setMensagens] = useState<MensagemChat[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [carregandoConversas, setCarregandoConversas] = useState(true);
  const [carregandoMsgs, setCarregandoMsgs] = useState(false);

  const msgsEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 1. Carregar lista de conversas
  const carregarConversas = async () => {
    try {
      const res = await fetch("/api/mensagens");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.conversas)) {
          setConversas(data.conversas);
          // No desktop seleciona automaticamente a primeira conversa se não houver selecionada e não for mobile
          if (!conversaAtivaId && data.conversas.length > 0 && typeof window !== "undefined" && window.innerWidth >= 768) {
            setConversaAtivaId(data.conversas[0].id);
          }
        }
      }
    } catch {
    } finally {
      setCarregandoConversas(false);
    }
  };

  useEffect(() => {
    carregarConversas();
  }, []);

  // 2. Carregar mensagens da conversa ativa
  const carregarMensagens = async (cId: string, silencioso: boolean = false) => {
    try {
      if (!silencioso) setCarregandoMsgs(true);
      const res = await fetch(`/api/mensagens?conversaId=${encodeURIComponent(cId)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.mensagens)) {
          setMensagens(data.mensagens);
        }
      }
    } catch {
    } finally {
      if (!silencioso) setCarregandoMsgs(false);
    }
  };

  useEffect(() => {
    if (conversaAtivaId) {
      // Primeira carga visível
      carregarMensagens(conversaAtivaId, false);
      // Polling para novas mensagens em segundo plano sem piscar "Carregando"
      const timer = setInterval(() => {
        carregarMensagens(conversaAtivaId, true);
        carregarConversas(); // atualiza prévia de mensagens e posições
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [conversaAtivaId]);

  // Scroll para o fim sempre que mensagens mudarem
  useEffect(() => {
    msgsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  const handleEnviar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!texto.trim() || !conversaAtivaId || enviando) return;

    const textoEnvio = texto.trim();
    setTexto("");
    setEnviando(true);

    try {
      const csrfRes = await fetch("/api/auth/csrf");
      const { csrfToken } = await csrfRes.json();

      const res = await fetch("/api/mensagens", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
        body: JSON.stringify({ conversaId: conversaAtivaId, texto: textoEnvio }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.mensagem) {
          setMensagens((prev) => [...prev, data.mensagem]);
          // Atualiza última mensagem e move a conversa para o topo da lista
          setConversas((prev) => {
            const conversaAlvo = prev.find((c) => c.id === conversaAtivaId);
            if (!conversaAlvo) return prev;
            const conversaAtualizada: ConversaItem = {
              ...conversaAlvo,
              ultimaMensagem: {
                texto: textoEnvio,
                autorNome: usuarioNome,
                hora: data.mensagem.hora,
                criadoEm: data.mensagem.criadoEm,
              },
            };
            const outras = prev.filter((c) => c.id !== conversaAtivaId);
            return [conversaAtualizada, ...outras];
          });
        }
      }
    } catch {
    } finally {
      setEnviando(false);
      inputRef.current?.focus();
    }
  };

  const conversaAtiva = conversas.find((c) => c.id === conversaAtivaId);

  return (
    <div className="space-y-6 w-full">
      {/* Cabeçalho */}
      <div className="border-b border-[#dfe2e8] pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111a2e]">
          Mensagens Integradas
        </h1>
        <p className="text-sm text-[#6b7385] mt-1">
          Converse em tempo real com orientadores, colegas de grupo do TCC, avaliadores e coordenação.
        </p>
      </div>

      {/* Caixa do Chat (Layout estilo WhatsApp: no mobile mostra lista OU conversa aberta; no desktop mostra ambos lado a lado) */}
      <div className="flex md:grid md:grid-cols-[320px_1fr] h-[calc(100vh-210px)] min-h-[500px] border border-[#dfe2e8] rounded-2xl overflow-hidden bg-white shadow-xs">
        {/* Lista Lateral de Contatos / Grupos (.wl) */}
        <div
          className={`border-r border-[#dfe2e8] overflow-y-auto bg-white flex flex-col w-full md:w-auto h-full ${
            conversaAtivaId ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="p-3.5 border-b border-[#dfe2e8] bg-[#f4f5f7]/60 flex items-center justify-between">
            <span className="text-xs font-bold text-[#111a2e] uppercase tracking-wider">
              Conversas & Grupos
            </span>
            <span className="text-[11px] text-[#6b7385] font-medium">
              {conversas.length} {conversas.length === 1 ? "conversa" : "conversas"}
            </span>
          </div>

          <div className="divide-y divide-[#dfe2e8] flex-1 overflow-y-auto">
            {carregandoConversas ? (
              <div className="p-6 text-center text-xs text-[#6b7385]">
                Carregando conversas...
              </div>
            ) : conversas.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#6b7385]">
                Nenhuma conversa disponível.
              </div>
            ) : (
              conversas.map((c) => {
                const ativo = c.id === conversaAtivaId;
                const inicial = c.titulo.charAt(0).toUpperCase();

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setConversaAtivaId(c.id)}
                    className={`w-full text-left p-3.5 flex items-center gap-3 transition-colors cursor-pointer border-l-4 ${
                      ativo
                        ? "bg-[#f4f5f7] border-l-[#1e78f0]"
                        : "border-l-transparent hover:bg-[#f8f9fa] active:bg-[#f4f5f7]"
                    }`}
                  >
                    {/* Avatar (.wav) */}
                    <div
                      className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                        c.tipo === "GRUPO"
                          ? "bg-[#1e78f0] text-white"
                          : "bg-[#0f1b33] text-white"
                      }`}
                    >
                      {c.tipo === "GRUPO" ? <Users className="w-5 h-5" /> : inicial}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <b className="text-xs sm:text-sm font-bold text-[#111a2e] truncate">
                          {c.titulo}
                        </b>
                        {c.ultimaMensagem && (
                          <i className="not-italic text-[10px] sm:text-[11px] text-[#6b7385] whitespace-nowrap">
                            {c.ultimaMensagem.hora}
                          </i>
                        )}
                      </div>
                      <span className="block text-xs text-[#6b7385] truncate">
                        {c.ultimaMensagem
                          ? `${c.ultimaMensagem.texto}`
                          : c.subtitulo || "Sem mensagens"}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Área Principal de Conversa (.wr) */}
        <div
          className={`flex flex-col min-w-0 bg-[#f4f5f7] w-full h-full ${
            !conversaAtivaId ? "hidden md:flex" : "flex"
          }`}
        >
          {conversaAtiva ? (
            <>
              {/* Topbar da Conversa estilo WhatsApp (.wh) com botão Voltar no Mobile */}
              <div className="flex items-center gap-2 sm:gap-3 p-3 px-3 sm:px-4 bg-white border-b border-[#dfe2e8] shadow-2xs shrink-0">
                {/* Botão de Voltar para a lista no Mobile */}
                <button
                  type="button"
                  onClick={() => setConversaAtivaId(null)}
                  className="md:hidden p-1.5 -ml-1 text-[#111a2e] hover:bg-[#f4f5f7] rounded-full cursor-pointer transition-colors"
                  aria-label="Voltar para a lista de conversas"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 ${
                    conversaAtiva.tipo === "GRUPO" ? "bg-[#1e78f0]" : "bg-[#0f1b33]"
                  }`}
                >
                  {conversaAtiva.tipo === "GRUPO" ? (
                    <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                  ) : (
                    conversaAtiva.titulo.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <b className="text-xs sm:text-sm font-bold text-[#111a2e] block truncate">
                    {conversaAtiva.titulo}
                  </b>
                  <small className="text-[10px] sm:text-[11px] text-[#6b7385] block truncate">
                    {conversaAtiva.subtitulo || (conversaAtiva.tipo === "GRUPO" ? "Grupo do TCC" : "Mensagem Privada")}
                  </small>
                </div>
              </div>

              {/* Mensagens (.wmsgs) */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
                {carregandoMsgs && mensagens.length === 0 ? (
                  <div className="m-auto text-xs text-[#6b7385]">
                    Carregando mensagens...
                  </div>
                ) : mensagens.length === 0 ? (
                  <div className="m-auto text-center p-6 text-xs text-[#6b7385]">
                    <MessageSquare className="w-8 h-8 text-[#9fb0cf] mx-auto mb-2" />
                    Nenhuma mensagem ainda. Diga olá!
                  </div>
                ) : (
                  mensagens.map((m) => {
                    const souEu = m.autorId === usuarioId;
                    return (
                      <div
                        key={m.id}
                        className={`max-w-[75%] p-2.5 px-3.5 text-xs shadow-2xs break-words ${
                          souEu
                            ? "self-end bg-[#1e78f0] text-white rounded-2xl rounded-tr-xs"
                            : "self-start bg-white text-[#111a2e] border border-[#dfe2e8] rounded-2xl rounded-tl-xs"
                        }`}
                      >
                        {!souEu && conversaAtiva.tipo === "GRUPO" && (
                          <span className="block text-[10px] font-bold text-[#1e78f0] mb-0.5">
                            {m.autorNome}
                          </span>
                        )}
                        <p className="leading-relaxed whitespace-pre-wrap">{m.texto}</p>
                        <i
                          className={`block not-italic text-[9.5px] mt-1 text-right ${
                            souEu ? "text-white/80" : "text-[#9ca3af]"
                          }`}
                        >
                          {m.hora}
                        </i>
                      </div>
                    );
                  })
                )}
                <div ref={msgsEndRef} />
              </div>

              {/* Input de Envio (.wi) */}
              <form
                onSubmit={handleEnviar}
                className="flex items-center gap-2 p-3 bg-white border-t border-[#dfe2e8]"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder="Digite uma mensagem..."
                  aria-label="Mensagem"
                  autoComplete="off"
                  className="flex-1 min-w-0 px-4 py-2 text-xs border border-[#dfe2e8] rounded-full bg-[#f4f5f7] text-[#111a2e] focus:outline-none focus:border-[#1e78f0] focus:ring-1 focus:ring-[#1e78f0]"
                />
                <button
                  type="submit"
                  disabled={!texto.trim() || enviando}
                  className="bg-[#1e78f0] hover:bg-[#1a6cd8] disabled:opacity-50 text-white px-4 py-2 rounded-full font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar</span>
                </button>
              </form>
            </>
          ) : (
            <div className="m-auto text-center p-8 text-xs text-[#6b7385]">
              Selecione uma conversa ao lado para começar.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
