"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, FolderKanban, MessageSquare, Calendar, Award, BookOpen, Layers, ShieldCheck, GraduationCap } from "lucide-react";
import { homeDoPerfil } from "@/lib/auth/perfis";
import { PerfilEnum } from "@/types";

interface FloatingHubProps {
  perfil: PerfilEnum;
}

export function FloatingHub({ perfil }: FloatingHubProps) {
  const pathname = usePathname();
  const inicioHref = homeDoPerfil(perfil);

  // No momento, conforme especificado: só temos a aba 'Início' (renomeada de 'Dashboard')
  // Com visual preparado e expansível para futuras abas
  const abas = [
    {
      rotulo:
        perfil === PerfilEnum.ALUNO
          ? "Aluno"
          : perfil === PerfilEnum.ORIENTADOR || perfil === PerfilEnum.AVALIADOR
          ? "Orientações"
          : perfil === PerfilEnum.COORDENACAO
          ? "Coordenação"
          : perfil === PerfilEnum.ADMIN
          ? "Administração"
          : "Início",
      href: inicioHref,
      icone:
        perfil === PerfilEnum.ALUNO
          ? GraduationCap
          : perfil === PerfilEnum.ORIENTADOR || perfil === PerfilEnum.AVALIADOR
          ? BookOpen
          : perfil === PerfilEnum.COORDENACAO
          ? Layers
          : perfil === PerfilEnum.ADMIN
          ? ShieldCheck
          : Home,
      ativo:
        (pathname === inicioHref ||
          pathname === "/dashboard" ||
          (pathname.startsWith(`${inicioHref}`) && !pathname.includes("/coordenacao")) ||
          (pathname.startsWith("/dashboard/tcc/") && perfil !== "ADMIN")) &&
        pathname !== "/dashboard/aluno/entregas",
    },
    ...(perfil === PerfilEnum.ALUNO
      ? [
          {
            rotulo: "Entregas",
            href: "/dashboard/aluno/entregas",
            icone: Compass,
            ativo: pathname === "/dashboard/aluno/entregas",
          },
        ]
      : []),
    ...(perfil === PerfilEnum.ADMIN
      ? [
          {
            rotulo: "Coordenação",
            href: "/dashboard/coordenacao",
            icone: Layers,
            ativo: pathname.startsWith("/dashboard/coordenacao"),
          },
        ]
      : []),
    ...(perfil === PerfilEnum.COORDENACAO || perfil === PerfilEnum.ADMIN
      ? [
          {
            rotulo: "Orientações",
            href: "/dashboard/professor",
            icone: BookOpen,
            ativo: pathname.startsWith("/dashboard/professor") || pathname.startsWith("/dashboard/orientador"),
          },
        ]
      : []),
    ...(perfil === PerfilEnum.ORIENTADOR || perfil === PerfilEnum.AVALIADOR || perfil === PerfilEnum.COORDENACAO || perfil === PerfilEnum.ADMIN
      ? [
          {
            rotulo: "Banca",
            href: "/dashboard/avaliador",
            icone: Award,
            ativo: pathname.startsWith("/dashboard/avaliador"),
          },
        ]
      : []),

    {
      rotulo: "Mensagens",
      href: "/dashboard/mensagens",
      icone: MessageSquare,
      ativo: pathname.startsWith("/dashboard/mensagens"),
    },
    {
      rotulo: "Cronograma",
      href: "/dashboard/cronograma",
      icone: Calendar,
      ativo: pathname.startsWith("/dashboard/cronograma"),
    },
  ];

  return (
    <aside
      aria-label="Navegação Principal"
      className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-[96vw] w-auto"
    >
      {/* Container estilo Apple Liquid Glass com layout dinâmico responsivo */}
      <nav
        className="flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 rounded-full border border-white/60 bg-white/80 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(15,27,51,0.14)] ring-1 ring-black/5 transition-all duration-300"
        style={{
          boxShadow:
            "0 10px 30px -5px rgba(15, 27, 51, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.8) inset, 0 2px 4px rgba(0, 0, 0, 0.04)",
        }}
      >
        {abas.map((aba) => {
          const Icone = aba.icone;
          return (
            <Link
              key={aba.rotulo}
              href={aba.href}
              title={aba.rotulo}
              aria-label={aba.rotulo}
              className={`group relative flex items-center rounded-full text-xs font-bold transition-all duration-300 ease-out cursor-pointer select-none ${
                aba.ativo
                  ? "bg-[#1e78f0] text-white shadow-[0_4px_14px_0_rgba(30,120,240,0.38)] px-3.5 sm:px-4 py-2 sm:py-2.5 gap-1.5 sm:gap-2"
                  : "text-[#4b5563] hover:text-[#111a2e] hover:bg-white/70 p-2 sm:p-2.5"
              }`}
            >
              <Icone
                className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                  aba.ativo ? "text-white scale-105" : "text-[#4b5563] group-hover:scale-110"
                }`}
              />

              {/* Rótulo expandido exclusivamente quando a aba está ativa */}
              {aba.ativo && (
                <>
                  <span className="tracking-wide whitespace-nowrap animate-in fade-in zoom-in-95 duration-200">
                    {aba.rotulo}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-white/90 animate-pulse shrink-0 hidden sm:inline-block" />
                </>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
