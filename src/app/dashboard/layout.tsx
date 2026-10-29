import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { LayoutDashboard } from "lucide-react";
import { requireSessao } from "@/lib/auth/server-session";
import { ROTULO_PERFIL, homeDoPerfil } from "@/lib/auth/perfis";
import { LogoutButton } from "@/components/layout/logout-button";

export const dynamic = "force-dynamic";

async function Sidebar() {
  const sessao = await requireSessao();
  const inicial = (sessao.nome || sessao.email || "U").charAt(0).toUpperCase();

  return (
    <aside className="w-full lg:w-60 bg-[#0f1b33] text-white flex flex-col p-4 sm:p-5 flex-shrink-0 min-h-auto lg:min-h-screen justify-between border-b lg:border-b-0 lg:border-r border-[#1a2a4a]">
      <div className="space-y-6">
        {/* Logo SGTCC */}
        <div className="flex items-center gap-3 px-2 py-1">
          <Image
            src="/sgtcc-icon.png"
            alt="SGTCC Cap Icon"
            width={32}
            height={32}
            className="w-7 h-auto"
          />
          <span className="font-bold text-xl tracking-tight text-white">SGTCC</span>
        </div>

        {/* Navegação restrita ao Dashboard do perfil */}
        <nav className="space-y-1">
          <Link
            href={homeDoPerfil(sessao.perfil)}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-[#1e78f0] text-white text-sm font-semibold shadow-xs"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Dashboard</span>
          </Link>
        </nav>
      </div>

      {/* Perfil do Usuário e Logout */}
      <div className="pt-4 mt-6 border-t border-[#1a2a4a] space-y-3">
        <div className="flex items-center gap-3 px-1">
          <div className="w-9 h-9 rounded-full bg-white text-[#0f1b33] font-bold flex items-center justify-center text-sm flex-shrink-0">
            {inicial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate text-white">
              {sessao.nome ?? sessao.email}
            </p>
            <span className="inline-block text-[11px] font-medium text-blue-200 uppercase tracking-wide">
              {ROTULO_PERFIL[sessao.perfil]}
            </span>
          </div>
        </div>
        <div className="pt-1">
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#ffffff] text-[#111a2e] font-sans">
      <Suspense fallback={<div className="w-full lg:w-60 bg-[#0f1b33] h-20 lg:min-h-screen" />}>
        <Sidebar />
      </Suspense>
      <main className="flex-1 p-6 sm:p-10 bg-[#ffffff] min-w-0 overflow-y-auto">
        <div className="max-w-6xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
