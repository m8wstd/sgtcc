import { Suspense } from "react";
import { requireSessao } from "@/lib/auth/server-session";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { FloatingHub } from "@/components/layout/floating-hub";

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

      {/* Conteúdo Principal com espaço inferior para não sobrepor o Floating Hub */}
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-28 sm:pb-32 min-w-0">
        {children}
      </main>

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
