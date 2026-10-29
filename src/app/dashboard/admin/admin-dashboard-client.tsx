"use client";

import React, { useState, useMemo } from "react";
import { StatCard } from "@/components/ui/stat-card";
import { StatusPill } from "@/components/ui/status-pill";
import {
  ShieldCheck,
  Users,
  Server,
  Activity,
  Database,
  Search,
  CheckCircle2,
  Lock,
  RefreshCw,
  PlusCircle,
  X,
  Check,
} from "lucide-react";

interface UsuarioAdmin {
  id: string;
  nome: string;
  email: string;
  perfil: "ALUNO" | "ORIENTADOR" | "AVALIADOR" | "COORDENACAO" | "ADMIN";
  status: "ATIVO" | "BLOQUEADO";
  ultimoAcesso: string;
}

const USUARIOS_MOCK: UsuarioAdmin[] = [
  {
    id: "usr-1",
    nome: "Jorge da Silva",
    email: "jorge@teste.sgtcc.dev",
    perfil: "ALUNO",
    status: "ATIVO",
    ultimoAcesso: "Hoje às 23:45",
  },
  {
    id: "usr-2",
    nome: "Prof.ª Joana Jordão",
    email: "joana@teste.sgtcc.dev",
    perfil: "ORIENTADOR",
    status: "ATIVO",
    ultimoAcesso: "Hoje às 22:10",
  },
  {
    id: "usr-3",
    nome: "Prof. Carlos Avaliador",
    email: "carlos@teste.sgtcc.dev",
    perfil: "AVALIADOR",
    status: "ATIVO",
    ultimoAcesso: "Ontem às 18:30",
  },
  {
    id: "usr-4",
    nome: "Coord. Maria Coordenadora",
    email: "maria@teste.sgtcc.dev",
    perfil: "COORDENACAO",
    status: "ATIVO",
    ultimoAcesso: "Hoje às 20:15",
  },
  {
    id: "usr-5",
    nome: "Admin do Sistema",
    email: "admin@teste.sgtcc.dev",
    perfil: "ADMIN",
    status: "ATIVO",
    ultimoAcesso: "Agora",
  },
];

export function AdminDashboardClient({ nomeUsuario }: { nomeUsuario: string }) {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>(USUARIOS_MOCK);
  const [busca, setBusca] = useState("");
  const [perfilFiltro, setPerfilFiltro] = useState("todos");
  const [mostrarModalNovo, setMostrarModalNovo] = useState(false);
  const [alerta, setAlerta] = useState<string | null>(null);

  // Form novo usuario
  const [novoNome, setNovoNome] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [novoPerfil, setNovoPerfil] = useState<UsuarioAdmin["perfil"]>("ALUNO");

  const stats = useMemo(() => {
    const total = usuarios.length;
    const ativos = usuarios.filter((u) => u.status === "ATIVO").length;
    return { total, ativos };
  }, [usuarios]);

  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter((u) => {
      const matchPerfil = perfilFiltro === "todos" ? true : u.perfil === perfilFiltro;
      const termo = busca.toLowerCase();
      const matchBusca =
        !termo ||
        u.nome.toLowerCase().includes(termo) ||
        u.email.toLowerCase().includes(termo) ||
        u.perfil.toLowerCase().includes(termo);
      return matchPerfil && matchBusca;
    });
  }, [usuarios, perfilFiltro, busca]);

  const handleCadastrarUsuario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim() || !novoEmail.trim()) return;

    const novoUsr: UsuarioAdmin = {
      id: `usr-${Date.now()}`,
      nome: novoNome.trim(),
      email: novoEmail.trim(),
      perfil: novoPerfil,
      status: "ATIVO",
      ultimoAcesso: "Nunca acessou",
    };

    setUsuarios([novoUsr, ...usuarios]);
    setNovoNome("");
    setNovoEmail("");
    setMostrarModalNovo(false);
    setAlerta(`Usuário ${novoUsr.nome} cadastrado com credencial institucional ativa!`);
    setTimeout(() => setAlerta(null), 4000);
  };

  const handleAlternarBloqueio = (id: string) => {
    setUsuarios(
      usuarios.map((u) =>
        u.id === id ? { ...u, status: u.status === "ATIVO" ? "BLOQUEADO" : "ATIVO" } : u
      )
    );
  };

  return (
    <div className="space-y-6 w-full">
      {/* Cabeçalho */}
      <div className="border-b border-[#dfe2e8] pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111a2e]">
          Painel do Administrador Geral
        </h1>
        <p className="text-sm text-[#6b7385] mt-1">
          Monitoramento de integridade do sistema, auditoria de segurança e gestão centralizada de contas &bull; Olá, {nomeUsuario}
        </p>
      </div>

      {alerta && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{alerta}</span>
        </div>
      )}

      {/* Métricas de Infraestrutura e Usuários */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          label="Total de Usuários"
          value={stats.total}
          variant="blue"
          icon={<Users className="w-5 h-5" />}
          className="p-5"
        />
        <StatCard
          label="Status dos Serviços"
          value="100% Online"
          variant="green"
          icon={<Server className="w-5 h-5" />}
          className="p-5"
        />
        <StatCard
          label="Banco Firestore"
          value="Operacional"
          variant="yellow"
          icon={<Database className="w-5 h-5" />}
          className="p-5"
        />
        <StatCard
          label="Sessões Ativas"
          value={stats.ativos}
          variant="neutral"
          icon={<ShieldCheck className="w-5 h-5" />}
          className="p-5"
        />
      </div>

      {/* Diagnóstico Rápido do Sistema (RNF01 e RNF03) */}
      <div className="border border-[#dfe2e8] rounded-[10px] p-5 bg-white shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-[#111a2e] uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-600" />
            Integridade dos Serviços e Segurança (RNF01 & RNF03)
          </h2>
          <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold border border-emerald-200">
            Todos os subsistemas saudáveis
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-[#f4f5f7] border border-[#dfe2e8]">
            <b className="block text-[#111a2e]">Firebase Auth & RBAC</b>
            <span className="text-[#6b7385] text-[11px]">Tokens criptografados e controle de sessão</span>
          </div>
          <div className="p-3 rounded-lg bg-[#f4f5f7] border border-[#dfe2e8]">
            <b className="block text-[#111a2e]">Storage de Arquivos</b>
            <span className="text-[#6b7385] text-[11px]">Controle estrito de permissões (PDF/DOCX)</span>
          </div>
          <div className="p-3 rounded-lg bg-[#f4f5f7] border border-[#dfe2e8]">
            <b className="block text-[#111a2e]">Auditoria de Acesso (403)</b>
            <span className="text-[#6b7385] text-[11px]">Tentativas não autorizadas bloqueadas</span>
          </div>
        </div>
      </div>

      {/* Modal / Formulário de Novo Usuário */}
      {mostrarModalNovo && (
        <form
          onSubmit={handleCadastrarUsuario}
          className="border-2 border-[#1e78f0] rounded-[10px] p-5 bg-white shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between border-b border-[#dfe2e8] pb-3">
            <div className="flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-[#1e78f0]" />
              <h3 className="text-sm font-bold text-[#111a2e]">
                Cadastrar Novo Usuário Institucional
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setMostrarModalNovo(false)}
              className="text-[#6b7385] hover:text-[#111a2e] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#111a2e] mb-1">
                Nome Completo
              </label>
              <input
                type="text"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                placeholder="Ex: Carlos Roberto"
                required
                className="w-full px-3 py-2 text-xs border border-[#dfe2e8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e78f0]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#111a2e] mb-1">
                E-mail Institucional
              </label>
              <input
                type="email"
                value={novoEmail}
                onChange={(e) => setNovoEmail(e.target.value)}
                placeholder="Ex: carlos@teste.sgtcc.dev"
                required
                className="w-full px-3 py-2 text-xs border border-[#dfe2e8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e78f0]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#111a2e] mb-1">
                Papel / Perfil
              </label>
              <select
                value={novoPerfil}
                onChange={(e) => setNovoPerfil(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border border-[#dfe2e8] rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#1e78f0]"
              >
                <option value="ALUNO">Aluno</option>
                <option value="ORIENTADOR">Professor Orientador</option>
                <option value="AVALIADOR">Professor Avaliador</option>
                <option value="COORDENACAO">Coordenação</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#dfe2e8]">
            <button
              type="button"
              onClick={() => setMostrarModalNovo(false)}
              className="px-4 py-1.5 rounded-lg border border-[#dfe2e8] bg-white text-xs font-semibold text-[#6b7385] hover:bg-[#f4f5f7] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-1.5 bg-[#1e78f0] hover:bg-[#1666d3] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              Criar Usuário
            </button>
          </div>
        </form>
      )}

      {/* Gestão de Contas de Usuários */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[#111a2e]">
              Contas de Usuários Cadastradas ({usuariosFiltrados.length})
            </h2>
            <p className="text-xs text-[#6b7385]">
              Gerencie permissões, bloqueios e criação de acessos de alunos, docentes e administradores.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {!mostrarModalNovo && (
              <button
                type="button"
                onClick={() => setMostrarModalNovo(true)}
                className="px-3.5 py-1.5 bg-[#1e78f0] hover:bg-[#1666d3] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Novo Usuário</span>
              </button>
            )}

            <div className="relative min-w-[200px] sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#6b7385]" />
              <input
                type="text"
                placeholder="Buscar por nome ou e-mail..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#f4f5f7] border border-[#dfe2e8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e78f0] focus:bg-white text-[#111a2e]"
              />
            </div>
          </div>
        </div>

        {/* Lista de Contas */}
        <div className="border border-[#dfe2e8] rounded-[10px] overflow-hidden bg-white shadow-xs">
          <div className="hidden md:grid grid-cols-[1.5fr_1.8fr_1.2fr_100px_100px] gap-4 px-6 py-3 bg-[#f4f5f7] border-b border-[#dfe2e8] text-xs font-semibold text-[#6b7385]">
            <span>Nome</span>
            <span>E-mail</span>
            <span>Perfil</span>
            <span>Status</span>
            <span className="text-right">Ação</span>
          </div>

          <div className="divide-y divide-[#dfe2e8]">
            {usuariosFiltrados.map((u) => (
              <div
                key={u.id}
                className="p-4 sm:px-6 sm:py-3.5 flex flex-col md:grid md:grid-cols-[1.5fr_1.8fr_1.2fr_100px_100px] gap-3 md:gap-4 items-start md:items-center text-xs"
              >
                <div>
                  <b className="font-semibold text-[#111a2e] block">{u.nome}</b>
                  <span className="text-[11px] text-[#6b7385]">Último acesso: {u.ultimoAcesso}</span>
                </div>

                <div className="truncate text-[#111a2e] font-mono text-[11px]">
                  {u.email}
                </div>

                <div>
                  <span className="text-[11px] font-bold text-[#1e78f0] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                    {u.perfil}
                  </span>
                </div>

                <div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      u.status === "ATIVO"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                  >
                    {u.status}
                  </span>
                </div>

                <div className="flex justify-end w-full md:w-auto">
                  <button
                    type="button"
                    onClick={() => handleAlternarBloqueio(u.id)}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded border border-[#dfe2e8] hover:bg-[#f4f5f7] text-[#111a2e] cursor-pointer"
                  >
                    {u.status === "ATIVO" ? "Bloquear" : "Ativar"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
