"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, FolderKanban } from "lucide-react";
import { homeDoPerfil } from "@/lib/auth/perfis";
import type { PerfilEnum } from "@/types";

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
      rotulo: "Início",
      href: inicioHref,
      icone: Home,
      ativo:
        pathname === inicioHref ||
        pathname === "/dashboard" ||
        (pathname.startsWith(`${inicioHref}`) && !pathname.includes("/coordenacao")) ||
        (pathname.startsWith("/dashboard/tcc/") && perfil !== "ADMIN"),
    },
    ...(perfil === "ADMIN"
      ? [
          {
            rotulo: "Coordenação",
            href: "/dashboard/admin/coordenacao",
            icone: FolderKanban,
            ativo: pathname === "/dashboard/admin/coordenacao" || pathname.startsWith("/dashboard/tcc/"),
          },
        ]
      : []),
  ];

  return (
    <aside
      aria-label="Navegação Principal"
      className="fixed bottom-5 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-[92vw] sm:max-w-md w-auto"
    >
      {/* Container estilo Apple Liquid Glass */}
      <nav
        className="flex items-center gap-1.5 p-1.5 rounded-full border border-white/60 bg-white/70 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(15,27,51,0.14)] ring-1 ring-black/5 transition-all"
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
              className={`group relative flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
                aba.ativo
                  ? "bg-[#1e78f0] text-white shadow-[0_4px_14px_0_rgba(30,120,240,0.38)]"
                  : "text-[#4b5563] hover:text-[#111a2e] hover:bg-white/60"
              }`}
            >
              <Icone
                className={`w-4 h-4 transition-transform group-hover:scale-110 duration-200 ${
                  aba.ativo ? "text-white" : "text-[#4b5563]"
                }`}
              />
              <span className="tracking-wide">{aba.rotulo}</span>

              {/* Ponto indicador sutil quando ativo */}
              {aba.ativo && (
                <span className="w-1.5 h-1.5 rounded-full bg-white/90 animate-pulse" />
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
