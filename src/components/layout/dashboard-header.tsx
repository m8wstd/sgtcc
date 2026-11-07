"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Settings, LogOut, Check, X, Shield, User } from "lucide-react";
import { ROTULO_PERFIL, homeDoPerfil } from "@/lib/auth/perfis";
import type { PerfilEnum } from "@/types";

interface DashboardHeaderProps {
  usuario: {
    id: string;
    nome: string | null;
    email: string | null;
    perfil: PerfilEnum;
    fotoUrl?: string | null;
  };
}

export function DashboardHeader({ usuario }: DashboardHeaderProps) {
  const router = useRouter();
  const [menuAberto, setMenuAberto] = useState(false);
  const [notifAberta, setNotifAberta] = useState(false);
  const [modalConfigAberto, setModalConfigAberto] = useState(false);
  const [saindo, setSaindo] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Fecha menus ao clicar fora
  useEffect(() => {
    function handleClickFora(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuAberto(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifAberta(false);
      }
    }
    document.addEventListener("mousedown", handleClickFora);
    return () => document.removeEventListener("mousedown", handleClickFora);
  }, []);

  async function handleLogout() {
    setSaindo(true);
    try {
      const { csrfToken } = (await (
        await fetch("/api/auth/csrf", { credentials: "same-origin" })
      ).json()) as { csrfToken: string };

      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        headers: { "X-CSRF-Token": csrfToken },
      });

      const [{ signOut }, { auth }] = await Promise.all([
        import("firebase/auth"),
        import("@/lib/firebase/config"),
      ]);
      await signOut(auth);
    } finally {
      window.location.href = "/login";
    }
  }

  const inicial = (usuario.nome || usuario.email || "U").charAt(0).toUpperCase();
  const nomeExibicao = usuario.nome ?? usuario.email ?? "Usuário";
  const rotuloPerfil = ROTULO_PERFIL[usuario.perfil] ?? usuario.perfil;

  // Notificações simuladas relevantes para o contexto do SGTCC
  const notificacoes = [
    {
      id: "1",
      titulo: "Novo prazo institucional",
      descricao: "Calendário do semestre atualizado pela coordenação.",
      tempo: "Há 1 hora",
      lida: false,
    },
    {
      id: "2",
      titulo: "Sistema em operação",
      descricao: "Ambiente do SGTCC operando normalmente.",
      tempo: "Hoje",
      lida: true,
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-30 w-full bg-white/70 backdrop-blur-md transition-all">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo SGTCC */}
          <Link
            href={homeDoPerfil(usuario.perfil)}
            className="flex items-center gap-2.5 transition-opacity hover:opacity-85 focus:outline-none"
            title="Ir para o início"
          >
            <div className="relative w-8 h-8 flex items-center justify-center rounded-lg bg-[#0f1b33] p-1.5 shadow-xs">
              <Image
                src="/sgtcc-icon.png"
                alt="SGTCC Cap Icon"
                width={28}
                height={28}
                className="w-full h-auto object-contain"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight text-[#111a2e] leading-tight">
                SGTCC
              </span>
              <span className="text-[10px] font-medium text-[#6b7385] -mt-0.5 tracking-wider uppercase">
                {rotuloPerfil}
              </span>
            </div>
          </Link>

          {/* Ações do Canto Superior Direito: Notificações + Foto do Usuário */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Botão de Notificações */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => {
                  setNotifAberta((prev) => !prev);
                  setMenuAberto(false);
                }}
                className={`relative p-2 rounded-full border transition-all cursor-pointer ${
                  notifAberta
                    ? "bg-[#f4f5f7] border-[#1e78f0] text-[#1e78f0]"
                    : "border-[#dfe2e8] bg-white text-[#4b5563] hover:bg-[#f4f5f7] hover:text-[#111a2e]"
                }`}
                aria-label="Abrir notificações"
                title="Notificações"
              >
                <Bell className="w-4 h-4" />
                {/* Badge de notificação não lida */}
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#1e78f0] ring-2 ring-white" />
              </button>

              {/* Popover de Notificações */}
              {notifAberta && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-[#dfe2e8] bg-white/95 backdrop-blur-xl p-4 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-3 border-b border-[#dfe2e8]">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-[#1e78f0]" />
                      <span className="text-sm font-bold text-[#111a2e]">Notificações</span>
                    </div>
                    <span className="text-[11px] font-medium text-[#1e78f0] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                      1 nova
                    </span>
                  </div>

                  <div className="divide-y divide-[#f0f2f5] max-h-72 overflow-y-auto mt-2">
                    {notificacoes.map((item) => (
                      <div
                        key={item.id}
                        className={`py-3 px-2 rounded-lg transition-colors flex items-start gap-3 ${
                          !item.lida ? "bg-blue-50/40" : "hover:bg-[#f8f9fa]"
                        }`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                            !item.lida ? "bg-[#1e78f0]" : "bg-[#cbd5e1]"
                          }`}
                        />
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <p className="text-xs font-semibold text-[#111a2e]">{item.titulo}</p>
                          <p className="text-[11px] text-[#6b7385] leading-relaxed">
                            {item.descricao}
                          </p>
                          <span className="text-[10px] text-[#9ca3af] block pt-0.5">
                            {item.tempo}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-[#dfe2e8] text-center">
                    <button
                      type="button"
                      onClick={() => setNotifAberta(false)}
                      className="text-xs font-medium text-[#1e78f0] hover:underline"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Foto / Avatar do Usuário */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => {
                  setMenuAberto((prev) => !prev);
                  setNotifAberta(false);
                }}
                className={`relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full border transition-all cursor-pointer focus:outline-none ${
                  menuAberto
                    ? "border-[#1e78f0] shadow-sm ring-2 ring-blue-100"
                    : "border-transparent hover:border-[#1e78f0]"
                } ${usuario.fotoUrl ? "overflow-hidden" : "bg-[#0f1b33] text-white"}`}
                aria-label="Menu do usuário"
                title="Meu Perfil"
              >
                {usuario.fotoUrl ? (
                  <Image
                    src={usuario.fotoUrl}
                    alt={nomeExibicao}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-bold text-sm tracking-tight">{inicial}</span>
                )}
              </button>

              {/* Menu Dropdown do Usuário */}
              {menuAberto && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-[#dfe2e8] bg-white/95 backdrop-blur-xl p-3 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
                  {/* Cabeçalho com Nome e Tipo */}
                  <div className="px-3 py-2.5 rounded-xl bg-[#f8f9fa] border border-[#eceef2] mb-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#0f1b33] text-white font-bold flex items-center justify-center text-xs shrink-0">
                        {inicial}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-[#111a2e] truncate">{nomeExibicao}</p>
                        <p className="text-[11px] text-[#6b7385] truncate">{usuario.email}</p>
                      </div>
                    </div>
                    <div className="pt-1.5 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#1e78f0]/10 text-[#1e78f0] text-[10px] font-bold uppercase tracking-wider">
                        <Shield className="w-3 h-3" />
                        {rotuloPerfil}
                      </span>
                    </div>
                  </div>

                  {/* Ações do Menu */}
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuAberto(false);
                        setModalConfigAberto(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#374151] hover:bg-[#f4f5f7] hover:text-[#111a2e] transition-colors cursor-pointer text-left"
                    >
                      <Settings className="w-4 h-4 text-[#6b7385]" />
                      <span>Configurações</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={saindo}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer text-left disabled:opacity-50"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>{saindo ? "Saindo..." : "Sair da Conta"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Modal de Configurações */}
      {modalConfigAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl border border-[#dfe2e8] bg-white p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#dfe2e8] pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#1e78f0]" />
                <h3 className="text-base font-bold text-[#111a2e]">Configurações da Conta</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalConfigAberto(false)}
                className="p-1 rounded-lg text-[#6b7385] hover:bg-[#f4f5f7] hover:text-[#111a2e] cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-[#374151]">
              <div className="p-3 rounded-xl bg-[#f8f9fa] border border-[#eceef2] space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#6b7385]">Nome Completo</span>
                  <span className="font-bold text-[#111a2e]">{nomeExibicao}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6b7385]">E-mail Institucional</span>
                  <span className="font-bold text-[#111a2e]">{usuario.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6b7385]">Perfil de Acesso</span>
                  <span className="font-bold text-[#1e78f0]">{rotuloPerfil}</span>
                </div>
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 space-y-1.5">
                <p className="font-bold text-[#1e78f0] flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  Autenticação e Sessão Institucional
                </p>
                <p className="text-[11px] text-[#4b5563] leading-relaxed">
                  Os dados de cadastro e permissões de perfil são gerenciados centralmente pelo
                  sistema da instituição.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setModalConfigAberto(false)}
                className="px-4 py-2 bg-[#1e78f0] hover:bg-[#1666d3] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
