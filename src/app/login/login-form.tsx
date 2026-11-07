"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Loader2,
  Mail,
  CheckCircle2,
  KeyRound,
  UserCheck,
  ArrowLeft,
  ShieldAlert,
} from "lucide-react";
import { validarEmail } from "@/lib/auth/cadastro-tokens";

interface LoginFormProps {
  destino: string;
  initialTab?: "login" | "criar-senha" | "esqueci-senha";
}

export function LoginForm({ destino, initialTab = "login" }: LoginFormProps) {
  const router = useRouter();
  const [modo, setModo] = useState<"login" | "criar-senha" | "esqueci-senha">(initialTab);

  // Estados do Login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Estados da Solicitação de Criação de Senha
  const [solicitarEmail, setSolicitarEmail] = useState("");
  const [solicitarLoading, setSolicitarLoading] = useState(false);
  const [solicitarSucesso, setSolicitarSucesso] = useState<string | null>(null);

  // Estados da Recuperação de Senha ("Esqueci minha senha")
  const [recuperarEmail, setRecuperarEmail] = useState("");
  const [recuperarLoading, setRecuperarLoading] = useState(false);
  const [recuperarSucesso, setRecuperarSucesso] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login-credenciais", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErro(data.message || "Credenciais inválidas ou usuário não encontrado.");
        setLoading(false);
        return;
      }

      router.push(destino && destino !== "/dashboard" ? destino : data.redirectTo || "/dashboard");
      router.refresh();
    } catch {
      setErro("Credenciais inválidas ou usuário não encontrado.");
      setLoading(false);
    }
  }

  async function handleSolicitarSenha(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSolicitarSucesso(null);

    const emailLimpo = solicitarEmail.trim().toLowerCase();
    if (!validarEmail(emailLimpo)) {
      setErro("Por favor, informe um endereço de e-mail institucional válido.");
      return;
    }

    setSolicitarLoading(true);

    try {
      const res = await fetch("/api/auth/solicitar-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailLimpo }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErro(data.message || "Não foi possível solicitar o link de criação de senha.");
        setSolicitarLoading(false);
        return;
      }

      setSolicitarSucesso(
        data.message || "Solicitação registrada! Um link de criação de senha será enviado por e-mail."
      );
      setSolicitarLoading(false);
    } catch {
      setErro("Erro de conexão ao processar solicitação.");
      setSolicitarLoading(false);
    }
  }

  async function handleRecuperarSenha(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setRecuperarSucesso(null);

    const emailLimpo = recuperarEmail.trim().toLowerCase();
    if (!validarEmail(emailLimpo)) {
      setErro("Por favor, informe um e-mail institucional válido.");
      return;
    }

    setRecuperarLoading(true);

    try {
      const res = await fetch("/api/auth/recuperar-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailLimpo }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErro(data.message || "Falha ao processar a recuperação de senha.");
        setRecuperarLoading(false);
        return;
      }

      setRecuperarSucesso(
        data.message ||
          "Instruções enviadas! Verifique seu e-mail institucional para redefinir sua senha de acesso."
      );
      setRecuperarLoading(false);
    } catch {
      setErro("Erro de comunicação ao solicitar recuperação de senha.");
      setRecuperarLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#ffffff] font-sans text-[#111a2e]">
      {/* Coluna Esquerda: Banner SGTCC */}
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
            Sistema de Gestão de TCC
          </p>
        </div>
      </div>

      {/* Coluna Direita: Formulários */}
      <div className="w-full md:w-7/12 lg:w-8/12 flex items-center justify-center p-6 sm:p-12 lg:p-20 bg-white">
        <div className="w-full max-w-[420px] space-y-6">
          {/* Mensagens de Alerta / Erro */}
          {erro && (
            <div
              role="alert"
              className="p-3 text-xs sm:text-sm rounded-lg bg-red-50 text-red-700 font-medium border border-red-200 animate-in fade-in"
            >
              {erro}
            </div>
          )}

          {solicitarSucesso && (
            <div
              role="status"
              className="p-3 text-xs sm:text-sm rounded-lg bg-emerald-50 text-emerald-800 font-medium border border-emerald-200 flex items-start gap-2 animate-in fade-in"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{solicitarSucesso}</span>
            </div>
          )}

          {recuperarSucesso && (
            <div
              role="status"
              className="p-3 text-xs sm:text-sm rounded-lg bg-emerald-50 text-emerald-800 font-medium border border-emerald-200 flex items-start gap-2 animate-in fade-in"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{recuperarSucesso}</span>
            </div>
          )}

          {modo === "login" ? (
            /* ===================================================
               TELA DE LOGIN
               =================================================== */
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl sm:text-[26px] font-bold tracking-tight text-[#111a2e]">
                  Acesse sua conta
                </h2>
                <p className="text-sm text-[#6b7385] mt-1.5">
                  Digite suas credenciais institucionais para continuar
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-sm font-semibold text-[#111a2e]">
                    E-mail:
                  </label>
                  <input
                    id="email"
                    type="text"
                    placeholder="usuario@uvv.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#dfe2e8] bg-white text-[#111a2e] placeholder-gray-400 focus:outline-none focus:border-[#1e78f0] focus:ring-1 focus:ring-[#1e78f0] text-sm transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="pass" className="block text-sm font-semibold text-[#111a2e]">
                    Senha:
                  </label>
                  <div className="relative">
                    <input
                      id="pass"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-[#dfe2e8] bg-white text-[#111a2e] placeholder-gray-400 focus:outline-none focus:border-[#1e78f0] focus:ring-1 focus:ring-[#1e78f0] text-sm transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none cursor-pointer"
                      aria-label={showPassword ? "Ocultar senha" : "Ver senha"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-[#1e78f0] hover:bg-[#1666d3] text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center disabled:opacity-60 shadow-xs mt-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" /> Entrando…
                    </>
                  ) : (
                    "Entrar"
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setModo("esqueci-senha");
                      setErro(null);
                      setRecuperarSucesso(null);
                    }}
                    className="text-xs font-medium text-[#1e78f0] hover:underline cursor-pointer"
                  >
                    Esqueci minha senha
                  </button>
                </div>

                {/* Substituto do antigo 'Cadastre-se' */}
                <div className="text-center pt-4 border-t border-[#dfe2e8]">
                  <p className="text-xs text-[#6b7385]">
                    Recebeu uma autorização ou convite institucional?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setModo("criar-senha");
                        setErro(null);
                        setSolicitarSucesso(null);
                      }}
                      className="text-[#1e78f0] font-semibold hover:underline cursor-pointer"
                    >
                      Criar senha de acesso
                    </button>
                  </p>
                </div>
              </form>
            </div>
          ) : modo === "esqueci-senha" ? (
            /* ===================================================
               TELA 'ESQUECI MINHA SENHA' (Design Adaptado)
               =================================================== */
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <span className="text-xs font-bold text-[#1e78f0] uppercase tracking-wider flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-[#1e78f0]" />
                  Recuperação de Acesso
                </span>
                <h2 className="text-2xl sm:text-[26px] font-bold tracking-tight text-[#111a2e] mt-1">
                  Redefinir sua senha
                </h2>
                <p className="text-sm text-[#6b7385] mt-1.5">
                  Informe o seu e-mail institucional cadastrado para receber o link seguro de redefinição de senha.
                </p>
              </div>

              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-950 space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-[#1e78f0]">
                  Instruções Institucionais:
                </span>
                <p className="text-[#374151] leading-relaxed">
                  Por motivos de segurança acadêmica, links de redefinição são válidos por 1 hora e só podem ser enviados para e-mails já ativos no sistema.
                </p>
              </div>

              <form onSubmit={handleRecuperarSenha} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="recuperarEmail" className="block text-xs font-semibold text-[#111a2e]">
                    E-mail Institucional:
                  </label>
                  <div className="relative">
                    <input
                      id="recuperarEmail"
                      type="email"
                      placeholder="usuario@uvv.br"
                      value={recuperarEmail}
                      onChange={(e) => setRecuperarEmail(e.target.value)}
                      required
                      disabled={recuperarLoading}
                      className="w-full px-3.5 py-2.5 pl-9 rounded-lg border border-[#dfe2e8] bg-white text-sm focus:outline-none focus:border-[#1e78f0] focus:ring-1 focus:ring-[#1e78f0] transition-colors"
                    />
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={recuperarLoading}
                  className="w-full py-2.5 px-4 bg-[#1e78f0] hover:bg-[#1666d3] text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center disabled:opacity-60 shadow-xs cursor-pointer"
                >
                  {recuperarLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" /> Enviando instruções…
                    </>
                  ) : (
                    "Enviar instruções de recuperação"
                  )}
                </button>

                <div className="text-center pt-3 border-t border-[#dfe2e8]">
                  <p className="text-xs text-[#6b7385]">
                    Lembrou da sua senha?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setModo("login");
                        setErro(null);
                        setRecuperarSucesso(null);
                      }}
                      className="text-[#1e78f0] font-semibold hover:underline cursor-pointer inline-flex items-center gap-1"
                    >
                      Voltar ao login
                    </button>
                  </p>
                </div>
              </form>
            </div>
          ) : (
            /* ===================================================
               TELA 'CRIAR SENHA DE ACESSO' (Solicitação por e-mail)
               =================================================== */
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <span className="text-xs font-bold text-[#1e78f0] uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-[#1e78f0]" />
                  Primeiro Acesso
                </span>
                <h2 className="text-2xl sm:text-[26px] font-bold tracking-tight text-[#111a2e] mt-1">
                  Criar senha de acesso
                </h2>
                <p className="text-sm text-[#6b7385] mt-1.5">
                  Informe o seu e-mail institucional pré-cadastrado pela administração para receber as instruções de criação de senha.
                </p>
              </div>

              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-950 space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-[#1e78f0]">
                  Acesso Restrito:
                </span>
                <p className="text-[#374151] leading-relaxed">
                  O cadastro não é aberto publicamente. O(s) administrador(es) do sistema iniciam o processo e geram seu link com seu perfil institucional pré-definido.
                </p>
              </div>

              <form onSubmit={handleSolicitarSenha} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="solicitarEmail" className="block text-xs font-semibold text-[#111a2e]">
                    E-mail Institucional:
                  </label>
                  <div className="relative">
                    <input
                      id="solicitarEmail"
                      type="email"
                      placeholder="usuario@uvv.br"
                      value={solicitarEmail}
                      onChange={(e) => setSolicitarEmail(e.target.value)}
                      required
                      disabled={solicitarLoading}
                      className="w-full px-3.5 py-2.5 pl-9 rounded-lg border border-[#dfe2e8] bg-white text-sm focus:outline-none focus:border-[#1e78f0] focus:ring-1 focus:ring-[#1e78f0] transition-colors"
                    />
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={solicitarLoading}
                  className="w-full py-2.5 px-4 bg-[#1e78f0] hover:bg-[#1666d3] text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center disabled:opacity-60 shadow-xs cursor-pointer"
                >
                  {solicitarLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" /> Verificando cadastro…
                    </>
                  ) : (
                    "Enviar instruções por e-mail"
                  )}
                </button>

                <div className="text-center pt-3 border-t border-[#dfe2e8]">
                  <p className="text-xs text-[#6b7385]">
                    Já possui senha configurada?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setModo("login");
                        setErro(null);
                        setSolicitarSucesso(null);
                      }}
                      className="text-[#1e78f0] font-semibold hover:underline cursor-pointer"
                    >
                      Voltar ao login
                    </button>
                  </p>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
