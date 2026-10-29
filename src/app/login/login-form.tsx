"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";

interface LoginFormProps {
  destino: string;
  initialTab?: "login" | "cadastro";
}

export function LoginForm({ destino, initialTab = "login" }: LoginFormProps) {
  const router = useRouter();
  const [modo, setModo] = useState<"login" | "cadastro">(initialTab);

  // Estados do Login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Estados do Cadastro
  const [cadNome, setCadNome] = useState("");
  const [cadEmail, setCadEmail] = useState("");
  const [cadMatricula, setCadMatricula] = useState("");
  const [cadPerfil, setCadPerfil] = useState<"ALUNO" | "ORIENTADOR" | "COORDENACAO" | "AVALIADOR">("ALUNO");
  const [cadPassword, setCadPassword] = useState("");
  const [cadConfirmPassword, setCadConfirmPassword] = useState("");
  const [showCadPassword, setShowCadPassword] = useState(false);
  const [cadLoading, setCadLoading] = useState(false);
  const [cadSucesso, setCadSucesso] = useState<string | null>(null);

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
        // Mensagem de erro padrão ao falhar o login
        setErro(data.message || "Credenciais inválidas ou usuário não encontrado.");
        setLoading(false);
        return;
      }

      // Redirecionamento de perfil
      router.push(destino && destino !== "/dashboard" ? destino : data.redirectTo || "/dashboard");
      router.refresh();
    } catch {
      setErro("Credenciais inválidas ou usuário não encontrado.");
      setLoading(false);
    }
  }

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCadSucesso(null);

    if (cadPassword !== cadConfirmPassword) {
      setErro("As senhas digitadas não coincidem.");
      return;
    }

    if (cadPassword.length < 6) {
      setErro("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    setCadLoading(true);

    try {
      const res = await fetch("/api/auth/cadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: cadNome,
          email: cadEmail,
          password: cadPassword,
          perfil: cadPerfil,
          matricula: cadMatricula || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErro(data.message || "Erro ao realizar o cadastro institucional.");
        setCadLoading(false);
        return;
      }

      setCadSucesso("Cadastro realizado com sucesso! Conectando à sua conta institucional...");

      // Autentica automaticamente
      const loginRes = await fetch("/api/auth/login-credenciais", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: cadEmail, password: cadPassword }),
      });

      const loginData = await loginRes.json();
      if (loginRes.ok) {
        router.push(data.redirectTo || loginData.redirectTo || "/dashboard");
        router.refresh();
      } else {
        setModo("login");
        setEmail(cadEmail);
        setCadLoading(false);
      }
    } catch {
      setErro("Erro de conexão ao processar o cadastro.");
      setCadLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#ffffff] font-sans text-[#111a2e]">
      {/* Coluna Esquerda: Banner / Identidade Visual SGTCC */}
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

      {/* Coluna Direita: Formulário de Autenticação */}
      <div className="w-full md:w-7/12 lg:w-8/12 flex items-center justify-center p-6 sm:p-12 lg:p-20 bg-white">
        <div className="w-full max-w-[420px] space-y-6">
          {/* Mensagens de Alerta / Erro */}
          {erro && (
            <div
              role="alert"
              className="p-3 text-sm rounded-lg bg-red-50 text-red-700 font-medium border border-red-200"
            >
              {erro}
            </div>
          )}
          {cadSucesso && (
            <div
              role="status"
              className="p-3 text-sm rounded-lg bg-emerald-50 text-emerald-800 font-medium border border-emerald-200"
            >
              {cadSucesso}
            </div>
          )}

          {modo === "login" ? (
            /* ===================================================
               TELA DE LOGIN (Idêntica ao layout da imagem)
               =================================================== */
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl sm:text-[26px] font-bold tracking-tight text-[#111a2e]">
                  Acesse sua conta
                </h2>
                <p className="text-sm text-[#6b7385] mt-1.5">
                  Digite seus dados para continuar
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                      aria-label={showPassword ? "Ocultar senha" : "Ver senha"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-[#1e78f0] hover:bg-[#1666d3] text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center disabled:opacity-60 shadow-sm mt-2"
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
                  <a
                    href="#esqueci-senha"
                    onClick={(e) => {
                      e.preventDefault();
                      alert("Para recuperação de senha institucional, solicite auxílio à coordenação de TCC.");
                    }}
                    className="text-xs font-medium text-[#1e78f0] hover:underline"
                  >
                    Esqueci minha senha
                  </a>
                </div>

                <div className="text-center pt-4 border-t border-[#dfe2e8]">
                  <p className="text-xs text-[#6b7385]">
                    Não tem uma conta institucional?{" "}
                    <button
                      type="button"
                      onClick={() => { setModo("cadastro"); setErro(null); }}
                      className="text-[#1e78f0] font-semibold hover:underline"
                    >
                      Cadastre-se
                    </button>
                  </p>
                </div>
              </form>
            </div>
          ) : (
            /* ===================================================
               TELA DE CADASTRO (RF01 - Cadastro Institucional)
               =================================================== */
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl sm:text-[26px] font-bold tracking-tight text-[#111a2e]">
                  Cadastro Institucional
                </h2>
                <p className="text-sm text-[#6b7385] mt-1.5">
                  Informe seus dados acadêmicos para criar sua conta
                </p>
              </div>

              <form onSubmit={handleCadastro} className="space-y-3.5">
                <div className="space-y-1">
                  <label htmlFor="cadNome" className="block text-xs font-semibold text-[#111a2e]">
                    Nome Completo:
                  </label>
                  <input
                    id="cadNome"
                    type="text"
                    placeholder="Ex: Carlos Eduardo de Oliveira"
                    value={cadNome}
                    onChange={(e) => setCadNome(e.target.value)}
                    required
                    disabled={cadLoading}
                    className="w-full px-3 py-2 rounded-lg border border-[#dfe2e8] bg-white text-sm focus:outline-none focus:border-[#1e78f0] transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="cadEmail" className="block text-xs font-semibold text-[#111a2e]">
                    E-mail Institucional:
                  </label>
                  <input
                    id="cadEmail"
                    type="email"
                    placeholder="usuario@uvv.br"
                    value={cadEmail}
                    onChange={(e) => setCadEmail(e.target.value)}
                    required
                    disabled={cadLoading}
                    className="w-full px-3 py-2 rounded-lg border border-[#dfe2e8] bg-white text-sm focus:outline-none focus:border-[#1e78f0] transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="cadPerfil" className="block text-xs font-semibold text-[#111a2e]">
                      Perfil Acadêmico:
                    </label>
                    <select
                      id="cadPerfil"
                      value={cadPerfil}
                      onChange={(e) => setCadPerfil(e.target.value as typeof cadPerfil)}
                      className="w-full h-[38px] px-3 py-2 rounded-lg border border-[#dfe2e8] bg-white text-xs font-medium text-[#111a2e] focus:outline-none focus:border-[#1e78f0]"
                      disabled={cadLoading}
                    >
                      <option value="ALUNO">Aluno</option>
                      <option value="ORIENTADOR">Professor Orientador</option>
                      <option value="COORDENACAO">Coordenação de TCC</option>
                      <option value="AVALIADOR">Professor Avaliador (Banca)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="cadMatricula" className="block text-xs font-semibold text-[#111a2e]">
                      Matrícula / ID:
                    </label>
                    <input
                      id="cadMatricula"
                      type="text"
                      placeholder={cadPerfil === "ALUNO" ? "Ex: 2026101" : "Ex: DOC-104"}
                      value={cadMatricula}
                      onChange={(e) => setCadMatricula(e.target.value)}
                      required={cadPerfil === "ALUNO"}
                      disabled={cadLoading}
                      className="w-full px-3 py-2 rounded-lg border border-[#dfe2e8] bg-white text-sm focus:outline-none focus:border-[#1e78f0] transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="cadPass" className="block text-xs font-semibold text-[#111a2e]">
                      Senha:
                    </label>
                    <div className="relative">
                      <input
                        id="cadPass"
                        type={showCadPassword ? "text" : "password"}
                        placeholder="Mínimo 6 dígitos"
                        value={cadPassword}
                        onChange={(e) => setCadPassword(e.target.value)}
                        required
                        disabled={cadLoading}
                        className="w-full px-3 py-2 pr-8 rounded-lg border border-[#dfe2e8] bg-white text-sm focus:outline-none focus:border-[#1e78f0] transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCadPassword(!showCadPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                      >
                        {showCadPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="cadConfirm" className="block text-xs font-semibold text-[#111a2e]">
                      Confirmar Senha:
                    </label>
                    <input
                      id="cadConfirm"
                      type={showCadPassword ? "text" : "password"}
                      placeholder="Repita a senha"
                      value={cadConfirmPassword}
                      onChange={(e) => setCadConfirmPassword(e.target.value)}
                      required
                      disabled={cadLoading}
                      className="w-full px-3 py-2 rounded-lg border border-[#dfe2e8] bg-white text-sm focus:outline-none focus:border-[#1e78f0] transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={cadLoading}
                  className="w-full py-2.5 px-4 bg-[#1e78f0] hover:bg-[#1666d3] text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center disabled:opacity-60 shadow-sm mt-3"
                >
                  {cadLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" /> Realizando cadastro…
                    </>
                  ) : (
                    "Cadastrar Conta Institucional"
                  )}
                </button>

                <div className="text-center pt-3 border-t border-[#dfe2e8]">
                  <p className="text-xs text-[#6b7385]">
                    Já possui acesso institucional?{" "}
                    <button
                      type="button"
                      onClick={() => { setModo("login"); setErro(null); }}
                      className="text-[#1e78f0] font-semibold hover:underline"
                    >
                      Acesse sua conta
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
