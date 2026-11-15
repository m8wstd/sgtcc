"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";
import { validarSenhaSegura } from "@/lib/auth/cadastro-tokens";

export function CadastroConviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [verificando, setVerificando] = useState(true);
  const [conviteValido, setConviteValido] = useState(false);
  const [dadosConvite, setDadosConvite] = useState<{
    nome: string;
    email: string;
    perfil: string;
    perfilRotulo: string;
    matricula: string;
    curso?: string;
  } | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    if (!token) {
      setVerificando(false);
      setErro("Nenhum token ou link de cadastro foi fornecido.");
      return;
    }

    async function checarConvite() {
      try {
        const res = await fetch(`/api/auth/validar-convite?token=${token}`);
        const data = await res.json();
        if (!res.ok) {
          setErro(data.message || "Link inválido ou expirado.");
          setConviteValido(false);
        } else {
          setConviteValido(true);
          setDadosConvite(data);
        }
      } catch {
        setErro("Falha ao validar o convite.");
      } finally {
        setVerificando(false);
      }
    }

    checarConvite();
  }, [token]);

  const requisitosSenha = validarSenhaSegura(password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (password !== confirmPassword) {
      setErro("As senhas digitadas não coincidem.");
      return;
    }

    if (!requisitosSenha.valida) {
      setErro(requisitosSenha.erros[0] || "A senha não atende a todos os critérios de segurança.");
      return;
    }

    setSalvando(true);

    try {
      const res = await fetch("/api/auth/cadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErro(data.message || "Erro ao concluir o cadastro.");
        setSalvando(false);
        return;
      }

      setSucesso(true);

      // Efetua login automático
      if (dadosConvite?.email) {
        await fetch("/api/auth/login-credenciais", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: dadosConvite.email, password }),
        });
      }

      setTimeout(() => {
        router.push(data.redirectTo || "/dashboard");
        router.refresh();
      }, 1500);
    } catch {
      setErro("Falha na comunicação com o servidor.");
      setSalvando(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#ffffff] font-sans text-[#111a2e]">
      {/* Banner Esquerdo */}
      <div className="w-full md:w-5/12 lg:w-4/12 bg-[#0f1b33] flex flex-col items-center justify-center p-8 sm:p-12 text-center text-white min-h-[220px] md:min-h-screen">
        <div className="flex flex-col items-center space-y-3 max-w-xs">
          <Image
            src="/sgtcc-icon.png"
            alt="Ícone SGTCC"
            width={120}
            height={120}
            className="w-24 md:w-28 h-auto drop-shadow-md"
            priority
          />
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mt-1">
            SGTCC
          </h1>
          <p className="text-sm md:text-base text-gray-300 font-medium">
            Cadastro Institucional de Acesso
          </p>
        </div>
      </div>

      {/* Formulário Direito */}
      <div className="w-full md:w-7/12 lg:w-8/12 flex items-center justify-center p-6 sm:p-12 lg:p-20 bg-white">
        <div className="w-full max-w-[460px] space-y-6">
          {verificando ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3 text-[#6b7385]">
              <Loader2 className="w-8 h-8 animate-spin text-[#1e78f0]" />
              <p className="text-sm font-medium">Validando token de convite institucional...</p>
            </div>
          ) : !conviteValido ? (
            <div className="space-y-4 text-center py-8">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-[#111a2e]">Link Inválido ou Expirado</h2>
              <p className="text-sm text-[#6b7385]">
                {erro || "O link de cadastro é inválido, já foi utilizado ou sua validade de 1 semana expirou."}
              </p>
              <div className="pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center px-4 py-2 bg-[#1e78f0] hover:bg-[#1666d3] text-white text-xs font-bold rounded-lg transition-colors"
                >
                  Ir para a tela de login
                </Link>
              </div>
            </div>
          ) : sucesso ? (
            <div className="space-y-4 text-center py-8">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-[#111a2e]">Cadastro Realizado com Sucesso!</h2>
              <p className="text-sm text-[#6b7385]">
                Sua senha foi configurada. Redirecionando para o seu painel acadêmico...
              </p>
              <Loader2 className="w-5 h-5 animate-spin text-[#1e78f0] mx-auto" />
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <span className="text-xs font-bold text-[#1e78f0] uppercase tracking-wider">
                  Convite Institucional Confirmado
                </span>
                <h2 className="text-2xl font-bold tracking-tight text-[#111a2e] mt-1">
                  Criar Senha de Acesso
                </h2>
                <p className="text-sm text-[#6b7385] mt-1">
                  Confira seus dados pré-cadastrados pelo administrador e crie sua senha de acesso.
                </p>
              </div>

              {erro && (
                <div className="p-3 text-xs rounded-lg bg-red-50 text-red-700 font-medium border border-red-200">
                  {erro}
                </div>
              )}

              {/* Informações pré-definidas pelo Admin (Não editáveis pelo usuário) */}
              <div className="bg-[#f8f9fa] border border-[#dfe2e8] rounded-xl p-4 space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-[#eceef2]">
                  <span className="text-[#6b7385] font-medium">Nome:</span>
                  <span className="font-bold text-[#111a2e]">{dadosConvite?.nome}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#eceef2]">
                  <span className="text-[#6b7385] font-medium">E-mail:</span>
                  <span className="font-bold text-[#111a2e]">{dadosConvite?.email}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#eceef2]">
                  <span className="text-[#6b7385] font-medium">Tipo de Usuário:</span>
                  <span className="font-bold text-[#1e78f0]">{dadosConvite?.perfilRotulo}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#eceef2]">
                  <span className="text-[#6b7385] font-medium">Matrícula:</span>
                  <span className="font-mono font-bold text-[#111a2e]">{dadosConvite?.matricula}</span>
                </div>
                {dadosConvite?.curso && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-[#6b7385] font-medium">Curso:</span>
                    <span className="font-semibold text-[#111a2e]">{dadosConvite.curso}</span>
                  </div>
                )}
              </div>

              {/* Formulário de Criação de Senha Segura */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="pass" className="block text-xs font-semibold text-[#111a2e]">
                    Nova Senha:
                  </label>
                  <div className="relative">
                    <input
                      id="pass"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      maxLength={32}
                      disabled={salvando}
                      className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-[#dfe2e8] bg-white text-sm focus:outline-none focus:border-[#1e78f0] focus:ring-1 focus:ring-[#1e78f0]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="confirmPass" className="block text-xs font-semibold text-[#111a2e]">
                    Confirmar Senha:
                  </label>
                  <input
                    id="confirmPass"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    maxLength={32}
                    disabled={salvando}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#dfe2e8] bg-white text-sm focus:outline-none focus:border-[#1e78f0] focus:ring-1 focus:ring-[#1e78f0]"
                  />
                </div>

                {/* Checklist de requisitos de segurança */}
                <div className="p-3 bg-[#f4f5f7] rounded-lg border border-[#dfe2e8] space-y-1.5">
                  <span className="text-[11px] font-bold text-[#111a2e] flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#1e78f0]" /> Requisitos de Senha Segura:
                  </span>
                  <div className="grid grid-cols-2 gap-1 text-[11px]">
                    <span className={`flex items-center gap-1 ${password.length >= 8 && password.length <= 32 ? "text-emerald-700 font-semibold" : "text-[#6b7385]"}`}>
                      • 8 a 32 caracteres
                    </span>
                    <span className={`flex items-center gap-1 ${/[A-Z]/.test(password) ? "text-emerald-700 font-semibold" : "text-[#6b7385]"}`}>
                      • 1 Letra maiúscula
                    </span>
                    <span className={`flex items-center gap-1 ${/[a-z]/.test(password) ? "text-emerald-700 font-semibold" : "text-[#6b7385]"}`}>
                      • 1 Letra minúscula
                    </span>
                    <span className={`flex items-center gap-1 ${/[0-9]/.test(password) ? "text-emerald-700 font-semibold" : "text-[#6b7385]"}`}>
                      • 1 Número
                    </span>
                    <span className={`flex items-center gap-1 col-span-2 ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password) ? "text-emerald-700 font-semibold" : "text-[#6b7385]"}`}>
                      • 1 Símbolo especial (!@#$%...)
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={salvando}
                  className="w-full py-2.5 px-4 bg-[#1e78f0] hover:bg-[#1666d3] text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center disabled:opacity-60 shadow-xs cursor-pointer"
                >
                  {salvando ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" /> Ativando Conta…
                    </>
                  ) : (
                    "Cadastrar e Acessar Conta"
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
