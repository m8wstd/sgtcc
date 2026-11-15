import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { FolderUp, LayoutDashboard } from "lucide-react";
import { requireSessao } from "@/lib/auth/server-session";
import { ROTULO_PERFIL, homeDoPerfil } from "@/lib/auth/perfis";
import { PerfilEnum } from "@/types";
import { LogoutButton } from "@/components/layout/logout-button";

export const dynamic = "force-dynamic";

async function ShellComSessao({ children }: { children: React.ReactNode }) {
  const sessao = await requireSessao();

  return (
    <>
      {/* Topbar moderna com Notificações e Menu de Perfil no canto superior direito */}
      <DashboardHeader
        usuario={{
          id: sessao.uid,
          nome: sessao.nome ?? null,
          email: sessao.email ?? null,
          perfil: sessao.perfil,
        }}
      />

        {/* Navegação restrita ao Dashboard do perfil */}
        <nav className="space-y-1">
          <Link
            href={homeDoPerfil(sessao.perfil)}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-[#1e78f0] text-white text-sm font-semibold shadow-xs"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Dashboard</span>
          </Link>
          {sessao.perfil === PerfilEnum.ALUNO && (
            <Link
              href="/dashboard/aluno/entregas"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-blue-100 hover:bg-[#1a2a4a] hover:text-white text-sm font-semibold transition-colors"
            >
              <FolderUp className="h-4 w-4" />
              <span>Central de Entregas</span>
            </Link>
          )}
        </nav>
      </div>

      {/* Hub Flutuante moderno (Apple Liquid Glass) */}
      <FloatingHub perfil={sessao.perfil} />
    </>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#ffffff] text-[#111a2e] font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
      <Suspense
        fallback={
          <div className="w-full flex-1 flex flex-col">
            <div className="h-16 w-full border-b border-[#dfe2e8] bg-white animate-pulse" />
            <div className="max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
              <div className="h-40 w-full rounded-2xl bg-[#f4f5f7] animate-pulse" />
            </div>
          </div>
        }
      >
        <ShellComSessao>{children}</ShellComSessao>
      </Suspense>
    </div>
  );
}
