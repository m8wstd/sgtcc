import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#ffffff] font-sans text-[#111a2e]">
      <div className="w-full max-w-sm flex flex-col items-center text-center space-y-8">
        {/* Identidade Visual com Imagens do Public */}
        <div className="flex flex-col items-center space-y-4">
          <div className="p-4 rounded-2xl bg-[#0f1b33] shadow-md flex items-center justify-center">
            <Image
              src="/sgtcc-icon.png"
              alt="Logo SGTCC"
              width={72}
              height={72}
              className="w-16 h-auto"
              priority
            />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#111a2e]">SGTCC</h1>
          <p className="text-sm text-[#6b7385] font-medium">
            Sistema de Gestão de Trabalho de Conclusão de Curso
          </p>
        </div>

        {/* Ações Principais */}
        <div className="w-full space-y-3">
          <Link
            href="/login"
            className="flex items-center justify-center w-full h-11 bg-[#1e78f0] hover:bg-[#1666d3] text-white font-semibold text-sm rounded-lg transition-colors shadow-xs"
          >
            Entrar
          </Link>
          <Link
            href="/login?tab=criar-senha"
            className="flex items-center justify-center w-full h-11 border border-[#dfe2e8] bg-white hover:bg-[#f4f5f7] text-[#111a2e] font-semibold text-sm rounded-lg transition-colors"
          >
            Criar senha de acesso
          </Link>
        </div>

        {/* Rodapé Minimalista */}
        <p className="text-xs text-[#6b7385]">
          Acesso acadêmico institucional
        </p>
      </div>
    </main>
  );
}
