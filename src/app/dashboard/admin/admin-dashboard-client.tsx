"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BookOpen,
  GraduationCap,
  Search,
  Users,
  UserPlus,
  Edit2,
  Check,
  X,
  Shield,
  Filter,
  ArrowRight,
  FolderKanban,
  Copy,
  Link as LinkIcon,
  Send,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { StatusPill } from "@/components/ui/status-pill";
import { ROTULO_PERFIL } from "@/lib/auth/perfis";
import type { AdminDashboardData, AdminUsuarioItem } from "@/lib/data/admin-queries";
import { PerfilEnum } from "@/types";

interface Props {
  nome: string;
  dados: AdminDashboardData | null;
  erro?: string;
}

const PERFIS_FILTRO = [
  { id: "TODOS", rotulo: "Todos os Usuários" },
  { id: "ALUNO", rotulo: "Alunos" },
  { id: "ORIENTADOR", rotulo: "Orientadores" },
  { id: "AVALIADOR", rotulo: "Avaliadores" },
  { id: "COORDENACAO", rotulo: "Coordenação" },
  { id: "ADMIN", rotulo: "Administradores" },
] as const;

const CURSOS_PADRAO = [
  "Engenharia de Software",
  "Sistemas de Informação",
  "Ciência da Computação",
  "Engenharia de Computação",
  "Enfermagem",
  "Medicina",
  "Direito",
  "Administração",
];

export function AdminDashboardClient({ nome, dados, erro }: Props) {
  const [busca, setBusca] = useState("");
  const [perfilFiltro, setPerfilFiltro] = useState<string>("TODOS");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const ITENS_POR_PAGINA = 20;

  // Lista local de usuários para reflexão imediata das ações (criar/editar)
  const [usuariosLocais, setUsuariosLocais] = useState<AdminUsuarioItem[]>(
    dados?.listaUsuarios ?? []
  );

  // Estados dos modais de Criação e Edição
  const [modalCriarAberto, setModalCriarAberto] = useState(false);
  const [usuarioEmEdicao, setUsuarioEmEdicao] = useState<AdminUsuarioItem | null>(null);

  // Link gerado para compartilhamento (WhatsApp, e-mail, etc.)
  const [linkGerado, setLinkGerado] = useState<{
    url: string;
    token: string;
    nome: string;
    email: string;
    perfilRotulo: string;
    matricula: string;
  } | null>(null);
  const [copiado, setCopiado] = useState(false);

  // Formulário de Criação (Pré-cadastro do Admin)
  const [novoNome, setNovoNome] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [novoPerfil, setNovoPerfil] = useState<PerfilEnum>(PerfilEnum.ALUNO);
  const [novaMatricula, setNovaMatricula] = useState("");
  const [novoCurso, setNovoCurso] = useState("Engenharia de Software");
  const [novoCursosCoordenados, setNovoCursosCoordenados] = useState<string[]>([
    "Engenharia de Software",
  ]);
  const [novoEnviarEmail, setNovoEnviarEmail] = useState(true);

  // Senha na Edição (opcional)
  const [edicaoSenha, setEdicaoSenha] = useState("");

  // Estado do Link de Conclusão de Cadastro no Modal de Edição
  const [linkConclusaoEdicao, setLinkConclusaoEdicao] = useState<{
    url: string;
    expiraEm?: string;
  } | null>(null);
  const [carregandoLinkEdicao, setCarregandoLinkEdicao] = useState(false);
  const [copiadoLinkEdicao, setCopiadoLinkEdicao] = useState(false);

  // Busca o link ativo do usuário ao abrir o modal de edição
  async function buscarLinkConclusaoUsuario(email: string) {
    setCarregandoLinkEdicao(true);
    setLinkConclusaoEdicao(null);
    try {
      const res = await fetch(`/api/admin/convites?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.convite && data.convite.id) {
          setLinkConclusaoEdicao({
            url: `${window.location.origin}/cadastro?token=${data.convite.id}`,
            expiraEm: data.convite.expiraEm,
          });
        }
      }
    } catch (err) {
      console.warn("Erro ao buscar link de conclusão do usuário:", err);
    } finally {
      setCarregandoLinkEdicao(false);
    }
  }

  // Gera um novo link de cadastro sob demanda para o usuário em edição
  async function handleGerarNovoLinkConclusao() {
    if (!usuarioEmEdicao) return;
    setCarregandoLinkEdicao(true);
    try {
      const res = await fetch("/api/admin/convites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: usuarioEmEdicao.nome,
          email: usuarioEmEdicao.email,
          perfil: usuarioEmEdicao.perfil,
          matricula: usuarioEmEdicao.matricula,
          curso: usuarioEmEdicao.curso,
          cursosCoordenados: usuarioEmEdicao.cursosCoordenados,
          enviarEmail: false,
          gerarLinkConclusao: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Erro ao gerar novo link.");
      }

      const url = `${window.location.origin}/cadastro?token=${data.token}`;
      setLinkConclusaoEdicao({
        url,
        expiraEm: data.convite?.expiraEm,
      });
      setMensagemSucesso("Novo link de cadastro gerado com sucesso!");
      setTimeout(() => setMensagemSucesso(null), 4000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao gerar link de cadastro.";
      setMensagemErro(msg);
    } finally {
      setCarregandoLinkEdicao(false);
    }
  }

  // Feedback e Loading
  const [salvando, setSalvando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  // Atualiza contadores locais
  const contadores = useMemo(() => {
    const counts: Record<string, number> = {
      TODOS: usuariosLocais.length,
      ALUNO: 0,
      ORIENTADOR: 0,
      AVALIADOR: 0,
      COORDENACAO: 0,
      ADMIN: 0,
    };
    for (const u of usuariosLocais) {
      if (counts[u.perfil] !== undefined) counts[u.perfil] += 1;
    }
    return counts;
  }, [usuariosLocais]);

  const usuariosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return usuariosLocais.filter((u) => {
      const matchPerfil = perfilFiltro === "TODOS" || u.perfil === perfilFiltro;
      const matchBusca =
        !termo ||
        u.nome.toLowerCase().includes(termo) ||
        u.email.toLowerCase().includes(termo) ||
        (u.matricula && u.matricula.toLowerCase().includes(termo)) ||
        (u.curso && u.curso.toLowerCase().includes(termo));
      return matchPerfil && matchBusca;
    });
  }, [usuariosLocais, busca, perfilFiltro]);

  const totalPaginas = Math.max(1, Math.ceil(usuariosFiltrados.length / ITENS_POR_PAGINA));
  const paginaValida = Math.min(paginaAtual, totalPaginas);

  const usuariosPaginados = useMemo(() => {
    const inicio = (paginaValida - 1) * ITENS_POR_PAGINA;
    return usuariosFiltrados.slice(inicio, inicio + ITENS_POR_PAGINA);
  }, [usuariosFiltrados, paginaValida]);

  async function handleCriarSolicitacao(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setMensagemErro(null);

    try {
      const res = await fetch("/api/admin/convites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: novoNome,
          email: novoEmail,
          password: novaSenha.trim() ? novaSenha.trim() : undefined,
          perfil: novoPerfil,
          matricula: novaMatricula.trim() ? novaMatricula.trim() : undefined,
          curso: novoCurso,
          cursosCoordenados:
            novoPerfil === PerfilEnum.COORDENACAO ? novoCursosCoordenados : undefined,
          enviarEmail: novoEnviarEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Erro ao gerar convite.");
      }

      // Se foi criado com senha direta:
      if (data.usuarioCriado) {
        setUsuariosLocais((prev) => [data.usuarioCriado, ...prev]);
        setModalCriarAberto(false);
        setNovoNome("");
        setNovoEmail("");
        setNovaSenha("");
        setNovaMatricula("");
        setMensagemSucesso(`Usuário ${data.usuarioCriado.nome} cadastrado com sucesso com a senha definida!`);
        setTimeout(() => setMensagemSucesso(null), 5000);
        return;
      }

      const convite = data.convite;
      const urlCompleta = `${window.location.origin}/cadastro?token=${data.token}`;

      setLinkGerado({
        url: urlCompleta,
        token: data.token,
        nome: convite.nome,
        email: convite.email,
        perfilRotulo: ROTULO_PERFIL[convite.perfil as keyof typeof ROTULO_PERFIL] || convite.perfil,
        matricula: convite.matricula,
      });

      setModalCriarAberto(false);
      setNovoNome("");
      setNovoEmail("");
      setNovaSenha("");
      setNovaMatricula("");
      setMensagemSucesso(
        novoEnviarEmail
          ? `Solicitação gerada para ${convite.nome}! Notificação por e-mail agendada e link disponível abaixo.`
          : `Solicitação gerada para ${convite.nome}! Sem envio de e-mail (link pronto para envio manual).`
      );
      setTimeout(() => setMensagemSucesso(null), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao gerar solicitação.";
      setMensagemErro(msg);
    } finally {
      setSalvando(false);
    }
  }

  async function handleSalvarEdicao(e: React.FormEvent) {
    e.preventDefault();
    if (!usuarioEmEdicao) return;
    setSalvando(true);
    setMensagemErro(null);

    try {
      const payload: Record<string, unknown> = { ...usuarioEmEdicao };
      if (edicaoSenha.trim()) {
        payload.password = edicaoSenha.trim();
      }

      const res = await fetch("/api/admin/usuarios", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Erro ao atualizar dados.");
      }

      setUsuariosLocais((prev) =>
        prev.map((u) => (u.id === usuarioEmEdicao.id ? { ...usuarioEmEdicao } : u))
      );
      setUsuarioEmEdicao(null);
      setEdicaoSenha("");
      setMensagemSucesso("Dados do usuário atualizados com sucesso!");
      setTimeout(() => setMensagemSucesso(null), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao atualizar usuário.";
      setMensagemErro(msg);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="w-full space-y-8">
      {/* Cabeçalho */}
      <header className="border-b border-[#dfe2e8] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#1e78f0]">
            Administração do sistema
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#111a2e] sm:text-3xl">
            Painel do Administrador
          </h1>
          <p className="mt-1 text-sm text-[#6b7385]">
            Gestão centralizada de contas, permissões institucionais e alocação de coordenadores
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/admin/coordenacao"
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#dfe2e8] bg-white text-xs font-bold text-[#111a2e] hover:bg-[#f4f5f7] hover:border-[#1e78f0] transition-all shadow-xs cursor-pointer"
          >
            <FolderKanban className="w-4 h-4 text-[#1e78f0]" />
            <span>Aba de Coordenação Global</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#6b7385]" />
          </Link>

          <button
            type="button"
            onClick={() => {
              setMensagemErro(null);
              setModalCriarAberto(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1e78f0] hover:bg-[#1666d3] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Solicitar Cadastro</span>
          </button>
        </div>
      </header>

      {/* Alertas */}
      {mensagemSucesso && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{mensagemSucesso}</span>
        </div>
      )}

      {/* Card Visível do Link de Convite Gerado (visível na plataforma para WhatsApp, email, etc.) */}
      {linkGerado && (
        <div className="p-5 bg-blue-50/70 border-2 border-[#1e78f0] rounded-2xl shadow-sm space-y-3 animate-in zoom-in-95">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-[#1e78f0]" />
              <h3 className="text-sm font-bold text-[#111a2e]">
                Link de Cadastro Gerado para {linkGerado.nome} ({linkGerado.perfilRotulo})
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setLinkGerado(null)}
              className="text-[#6b7385] hover:text-[#111a2e] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-[#4b5563]">
            Este link é exclusivo para <b>{linkGerado.email}</b> e permite que o usuário crie sua senha de acesso. Ele expira em <b>7 dias (1 semana)</b> ou assim que for utilizado.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
            <input
              type="text"
              readOnly
              value={linkGerado.url}
              className="flex-1 px-3 py-2 text-xs font-mono bg-white border border-[#dfe2e8] rounded-lg text-[#111a2e] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(linkGerado.url);
                setCopiado(true);
                setTimeout(() => setCopiado(false), 3000);
              }}
              className="px-4 py-2 bg-[#1e78f0] hover:bg-[#1666d3] text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiado ? "Copiado!" : "Copiar Link"}</span>
            </button>
            <a
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                `Olá ${linkGerado.nome}! Aqui está o seu link institucional para cadastrar sua senha no SGTCC (válido por 1 semana): ${linkGerado.url}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Send className="w-4 h-4" />
              <span>Enviar via WhatsApp</span>
            </a>
          </div>
        </div>
      )}

      {erro && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="flex-1">{erro}</div>
        </div>
      )}

      {/* Cards Informativos de Usuários com Atalhos de Filtro Imediatos */}
      <section aria-labelledby="usuarios-heading" className="space-y-3">
        <div>
          <h2 id="usuarios-heading" className="text-base font-bold text-[#111a2e]">
            Distribuição de Contas por Perfil
          </h2>
          <p className="text-xs text-[#6b7385]">
            Clique em qualquer card para filtrar a listagem instantaneamente
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard
            label="Total Geral"
            value={contadores.TODOS}
            variant="blue"
            icon={<Users className="w-4 h-4" />}
            className="p-4"
            onClick={() => {
              setPerfilFiltro("TODOS");
              setPaginaAtual(1);
            }}
            active={perfilFiltro === "TODOS"}
          />
          <StatCard
            label="Alunos"
            value={contadores.ALUNO}
            variant="yellow"
            className="p-4"
            onClick={() => {
              setPerfilFiltro(perfilFiltro === "ALUNO" ? "TODOS" : "ALUNO");
              setPaginaAtual(1);
            }}
            active={perfilFiltro === "ALUNO"}
          />
          <StatCard
            label="Orientadores"
            value={contadores.ORIENTADOR}
            variant="green"
            icon={<BookOpen className="w-4 h-4" />}
            className="p-4"
            onClick={() => {
              setPerfilFiltro(perfilFiltro === "ORIENTADOR" ? "TODOS" : "ORIENTADOR");
              setPaginaAtual(1);
            }}
            active={perfilFiltro === "ORIENTADOR"}
          />
          <StatCard
            label="Avaliadores"
            value={contadores.AVALIADOR}
            variant="neutral"
            className="p-4"
            onClick={() => {
              setPerfilFiltro(perfilFiltro === "AVALIADOR" ? "TODOS" : "AVALIADOR");
              setPaginaAtual(1);
            }}
            active={perfilFiltro === "AVALIADOR"}
          />
          <StatCard
            label="Coordenação"
            value={contadores.COORDENACAO}
            variant="blue"
            className="p-4"
            onClick={() => {
              setPerfilFiltro(perfilFiltro === "COORDENACAO" ? "TODOS" : "COORDENACAO");
              setPaginaAtual(1);
            }}
            active={perfilFiltro === "COORDENACAO"}
          />
          <StatCard
            label="Administradores"
            value={contadores.ADMIN}
            variant="red"
            icon={<Shield className="w-4 h-4" />}
            className="p-4"
            onClick={() => {
              setPerfilFiltro(perfilFiltro === "ADMIN" ? "TODOS" : "ADMIN");
              setPaginaAtual(1);
            }}
            active={perfilFiltro === "ADMIN"}
          />
        </div>
      </section>

      {/* Seção Principal: Busca e Tabela de Usuários */}
      <section aria-labelledby="tabela-usuarios-heading" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 id="tabela-usuarios-heading" className="text-base font-bold text-[#111a2e]">
              Usuários Registrados
            </h2>
            <span className="text-xs text-[#6b7385] bg-[#f4f5f7] px-2.5 py-0.5 rounded-full border border-[#dfe2e8]">
              {usuariosFiltrados.length} {usuariosFiltrados.length === 1 ? "encontrado" : "encontrados"}
            </span>
          </div>

          <div className="relative min-w-[260px] sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#6b7385]" />
            <input
              type="text"
              placeholder="Buscar nome, e-mail, curso ou matrícula..."
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setPaginaAtual(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#f4f5f7] border border-[#dfe2e8] rounded-full focus:outline-none focus:ring-1 focus:ring-[#1e78f0] focus:bg-white text-[#111a2e]"
            />
          </div>
        </div>

        {/* Tabela de Usuários */}
        <div className="overflow-hidden rounded-xl border border-[#dfe2e8] bg-white shadow-xs">
          <div className="hidden grid-cols-[1.5fr_1.8fr_120px_1.4fr_90px] gap-4 border-b border-[#dfe2e8] bg-[#f4f5f7] px-6 py-3 text-xs font-semibold text-[#6b7385] md:grid">
            <span>Nome do Usuário</span>
            <span>E-mail</span>
            <span>Perfil</span>
            <span>Vínculo / Cursos Alocados</span>
            <span className="text-right">Ação</span>
          </div>

          {usuariosFiltrados.length === 0 ? (
            <div className="p-10 text-center text-sm text-[#6b7385]">
              Nenhum usuário encontrado para os critérios de busca selecionados.
            </div>
          ) : (
            <ul className="divide-y divide-[#dfe2e8]">
              {usuariosPaginados.map((u) => {
                const rotulo = ROTULO_PERFIL[u.perfil] ?? u.perfil;
                return (
                  <li key={u.id}>
                    <div
                      onClick={() => {
                        setMensagemErro(null);
                        setUsuarioEmEdicao({ ...u });
                        buscarLinkConclusaoUsuario(u.email);
                      }}
                      className="group block p-4 transition-colors hover:bg-blue-50/30 cursor-pointer sm:px-6 md:grid md:grid-cols-[1.5fr_1.8fr_120px_1.4fr_90px] md:items-center md:gap-4"
                      title="Clique para editar dados deste usuário"
                    >
                      <div className="min-w-0">
                        <b className="block truncate text-sm font-semibold text-[#111a2e] group-hover:text-[#1e78f0]">
                          {u.nome}
                        </b>
                        {u.matricula && (
                          <small className="text-xs text-[#6b7385]">Matrícula: {u.matricula}</small>
                        )}
                      </div>

                      <p className="truncate text-xs text-[#6b7385]">{u.email}</p>

                      <div>
                        <span className="text-xs font-semibold text-[#111a2e]">
                          {rotulo}
                        </span>
                      </div>

                      <div className="min-w-0 text-xs text-[#111a2e]">
                        {u.perfil === PerfilEnum.COORDENACAO ? (
                          <span className="text-[11px] text-blue-700 font-medium">
                            {u.cursosCoordenados?.length
                              ? `Cursos: ${u.cursosCoordenados.join(", ")}`
                              : "Coordenação Geral (Todos os Cursos)"}
                          </span>
                        ) : u.curso ? (
                          <span className="text-[#6b7385]">{u.curso}</span>
                        ) : (
                          <span className="text-[#9ca3af]">—</span>
                        )}
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-[#1e78f0] bg-blue-50 border border-blue-100 group-hover:bg-[#1e78f0] group-hover:text-white transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Paginação de 20 por página */}
          {usuariosFiltrados.length > ITENS_POR_PAGINA && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3.5 bg-[#f8f9fa] border-t border-[#dfe2e8] text-xs text-[#6b7385]">
              <div>
                Mostrando{" "}
                <b className="text-[#111a2e]">
                  {(paginaValida - 1) * ITENS_POR_PAGINA + 1}
                </b>{" "}
                a{" "}
                <b className="text-[#111a2e]">
                  {Math.min(paginaValida * ITENS_POR_PAGINA, usuariosFiltrados.length)}
                </b>{" "}
                de <b className="text-[#111a2e]">{usuariosFiltrados.length}</b> usuários
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={paginaValida <= 1}
                  onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 rounded-lg border border-[#dfe2e8] bg-white text-xs font-semibold text-[#111a2e] hover:bg-[#f4f5f7] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Anterior</span>
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((num) => {
                    const ativo = num === paginaValida;
                    // Mostra primeira, última, e adjacentes se houver muitas páginas
                    if (
                      totalPaginas > 7 &&
                      num !== 1 &&
                      num !== totalPaginas &&
                      Math.abs(num - paginaValida) > 1
                    ) {
                      if (Math.abs(num - paginaValida) === 2) {
                        return (
                          <span key={num} className="px-1 text-[#6b7385]">
                            ...
                          </span>
                        );
                      }
                      return null;
                    }

                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setPaginaAtual(num)}
                        className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-bold transition-all ${
                          ativo
                            ? "bg-[#1e78f0] text-white shadow-xs"
                            : "bg-white border border-[#dfe2e8] text-[#111a2e] hover:bg-[#f4f5f7]"
                        }`}
                      >
                        {num}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  disabled={paginaValida >= totalPaginas}
                  onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
                  className="px-2.5 py-1 rounded-lg border border-[#dfe2e8] bg-white text-xs font-semibold text-[#111a2e] hover:bg-[#f4f5f7] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                >
                  <span>Próxima</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Modal / Diálogo de Criação de Novo Usuário */}
      {/* Modal / Diálogo de Solicitação de Cadastro pelo Admin */}
      {modalCriarAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-2xl border border-[#dfe2e8] bg-white p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#dfe2e8] pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#1e78f0]" />
                <div>
                  <h3 className="text-base font-bold text-[#111a2e]">Solicitar Cadastro de Usuário</h3>
                  <p className="text-[11px] text-[#6b7385]">
                    O administrador preenche os dados iniciais e gera um link seguro exclusivo (válido por 1 semana).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalCriarAberto(false)}
                className="p-1 rounded-lg text-[#6b7385] hover:bg-[#f4f5f7] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {mensagemErro && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs font-medium">
                {mensagemErro}
              </div>
            )}

            <form onSubmit={handleCriarSolicitacao} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#111a2e] mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  placeholder="Ex: Dra. Mariana Vasconcelos"
                  className="w-full px-3 py-2 border border-[#dfe2e8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e78f0]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#111a2e] mb-1">
                  E-mail
                </label>
                <input
                  type="email"
                  required
                  value={novoEmail}
                  onChange={(e) => setNovoEmail(e.target.value)}
                  placeholder="usuario@dominio.com"
                  className="w-full px-3 py-2 border border-[#dfe2e8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e78f0]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#111a2e] mb-1">
                  Senha de Acesso (opcional)
                </label>
                <input
                  type="password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Se preenchido, define a senha diretamente (mín. 8 caracteres, maiúscula, número, símbolo)"
                  maxLength={32}
                  className="w-full px-3 py-2 border border-[#dfe2e8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e78f0]"
                />
                <span className="text-[10px] text-[#6b7385] mt-0.5 block">
                  * Deixe em branco se preferir que o usuário defina sua própria senha ao acessar o link de ativação.
                </span>
              </div>

              <div>
                <label className="block font-semibold text-[#111a2e] mb-1">
                  Tipo de Usuário Institucional (Definido exclusivamente pelo Admin)
                </label>
                <select
                  value={novoPerfil}
                  onChange={(e) => setNovoPerfil(e.target.value as PerfilEnum)}
                  className="w-full px-3 py-2 border border-[#dfe2e8] rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#1e78f0]"
                >
                  <option value={PerfilEnum.ALUNO}>Aluno</option>
                  <option value={PerfilEnum.ORIENTADOR}>Professor Orientador</option>
                  <option value={PerfilEnum.AVALIADOR}>Professor Avaliador (Banca)</option>
                  <option value={PerfilEnum.COORDENACAO}>Coordenação de TCC</option>
                  <option value={PerfilEnum.ADMIN}>Administrador do Sistema</option>
                </select>
              </div>

              {/* Matrícula (opcional se quiser personalizar; se vazio, gerada automaticamente) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#111a2e] mb-1">
                    Matrícula Institucional (opcional)
                  </label>
                  <input
                    type="text"
                    value={novaMatricula}
                    onChange={(e) => setNovaMatricula(e.target.value)}
                    placeholder={
                      novoPerfil === PerfilEnum.ALUNO
                        ? "Vazio = auto (9 dígitos)"
                        : "Vazio = auto (5 dígitos)"
                    }
                    className="w-full px-3 py-2 border border-[#dfe2e8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e78f0]"
                  />
                  <span className="text-[10px] text-[#6b7385] mt-0.5 block">
                    {novoPerfil === PerfilEnum.ALUNO
                      ? "Formato automático: Ano + 5 dígitos (ex: 202693245)"
                      : "Formato automático: 5 dígitos aleatórios únicos"}
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-[#111a2e] mb-1">
                    Curso / Departamento
                  </label>
                  <select
                    value={novoCurso}
                    onChange={(e) => setNovoCurso(e.target.value)}
                    className="w-full px-3 py-2 border border-[#dfe2e8] rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#1e78f0]"
                  >
                    {CURSOS_PADRAO.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {novoPerfil === PerfilEnum.COORDENACAO && (
                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 space-y-2">
                  <span className="font-semibold text-[#1e78f0] block">
                    Alocação do Coordenador por Curso
                  </span>
                  <p className="text-[11px] text-[#6b7385]">
                    Selecione quais cursos este coordenador terá permissão para gerenciar:
                  </p>
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    {CURSOS_PADRAO.map((curso) => {
                      const ativo = novoCursosCoordenados.includes(curso);
                      return (
                        <label
                          key={curso}
                          className="flex items-center gap-2 p-1.5 rounded-md hover:bg-white cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={ativo}
                            onChange={() => {
                              if (ativo) {
                                setNovoCursosCoordenados(
                                  novoCursosCoordenados.filter((c) => c !== curso)
                                );
                              } else {
                                setNovoCursosCoordenados([...novoCursosCoordenados, curso]);
                              }
                            }}
                            className="rounded text-[#1e78f0]"
                          />
                          <span className="text-[11px] font-medium text-[#111a2e]">{curso}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Toggle de Envio de E-mail */}
              <div className="p-3.5 bg-[#f8f9fa] border border-[#dfe2e8] rounded-xl flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="font-bold text-[#111a2e] block">
                    Enviar e-mail de cadastro ao usuário
                  </span>
                  <p className="text-[11px] text-[#6b7385]">
                    {novoEnviarEmail
                      ? "O sistema enviará automaticamente o link de ativação para a caixa de entrada institucional do usuário."
                      : "O e-mail não será enviado. O administrador deverá repassar o link gerado manualmente (via WhatsApp, etc)."}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={novoEnviarEmail}
                    onChange={(e) => setNovoEnviarEmail(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1e78f0]"></div>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#dfe2e8]">
                <button
                  type="button"
                  onClick={() => setModalCriarAberto(false)}
                  className="px-4 py-2 border border-[#dfe2e8] rounded-lg text-xs font-semibold text-[#6b7385] hover:bg-[#f4f5f7] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="px-5 py-2 bg-[#1e78f0] hover:bg-[#1666d3] text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {salvando ? "Gerando link..." : "Gerar Link de Cadastro"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal / Diálogo de Edição de Usuário Existente */}
      {usuarioEmEdicao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-2xl border border-[#dfe2e8] bg-white p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#dfe2e8] pb-3">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-[#1e78f0]" />
                <h3 className="text-base font-bold text-[#111a2e]">Editar Dados do Usuário</h3>
              </div>
              <button
                type="button"
                onClick={() => setUsuarioEmEdicao(null)}
                className="p-1 rounded-lg text-[#6b7385] hover:bg-[#f4f5f7] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {mensagemErro && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs font-medium">
                {mensagemErro}
              </div>
            )}

            <form onSubmit={handleSalvarEdicao} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#111a2e] mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={usuarioEmEdicao.nome}
                  onChange={(e) =>
                    setUsuarioEmEdicao({ ...usuarioEmEdicao, nome: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-[#dfe2e8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e78f0]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#111a2e] mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    required
                    value={usuarioEmEdicao.email}
                    onChange={(e) =>
                      setUsuarioEmEdicao({ ...usuarioEmEdicao, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-[#dfe2e8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e78f0]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#111a2e] mb-1">
                    Perfil
                  </label>
                  <select
                    value={usuarioEmEdicao.perfil}
                    onChange={(e) =>
                      setUsuarioEmEdicao({
                        ...usuarioEmEdicao,
                        perfil: e.target.value as PerfilEnum,
                      })
                    }
                    className="w-full px-3 py-2 border border-[#dfe2e8] rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#1e78f0]"
                  >
                    <option value={PerfilEnum.ALUNO}>Aluno</option>
                    <option value={PerfilEnum.ORIENTADOR}>Professor Orientador</option>
                    <option value={PerfilEnum.AVALIADOR}>Professor Avaliador (Banca)</option>
                    <option value={PerfilEnum.COORDENACAO}>Coordenação de TCC</option>
                    <option value={PerfilEnum.ADMIN}>Administrador do Sistema</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#111a2e] mb-1">
                  Redefinir Senha do Usuário (opcional)
                </label>
                <input
                  type="password"
                  value={edicaoSenha}
                  onChange={(e) => setEdicaoSenha(e.target.value)}
                  placeholder="Deixe em branco para manter a senha atual inalterada"
                  maxLength={32}
                  className="w-full px-3 py-2 border border-[#dfe2e8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1e78f0]"
                />
                <span className="text-[10px] text-[#6b7385] mt-0.5 block">
                  * Caso deseje alterar, use pelo menos 8 caracteres (maiúscula, minúscula, número e símbolo).
                </span>
              </div>

              {usuarioEmEdicao.perfil === PerfilEnum.ALUNO && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-[#f8f9fa] rounded-xl border border-[#dfe2e8]">
                  <div>
                    <label className="block font-semibold text-[#111a2e] mb-1">Matrícula</label>
                    <input
                      type="text"
                      value={usuarioEmEdicao.matricula ?? ""}
                      onChange={(e) =>
                        setUsuarioEmEdicao({ ...usuarioEmEdicao, matricula: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-[#dfe2e8] rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#111a2e] mb-1">Curso</label>
                    <select
                      value={usuarioEmEdicao.curso ?? CURSOS_PADRAO[0]}
                      onChange={(e) =>
                        setUsuarioEmEdicao({ ...usuarioEmEdicao, curso: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-[#dfe2e8] rounded-lg bg-white"
                    >
                      {CURSOS_PADRAO.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {usuarioEmEdicao.perfil === PerfilEnum.COORDENACAO && (
                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 space-y-2">
                  <span className="font-semibold text-[#1e78f0] block">
                    Cursos sob Responsabilidade deste Coordenador
                  </span>
                  <p className="text-[11px] text-[#6b7385]">
                    Defina especificamente quais áreas o coordenador poderá atuar:
                  </p>
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    {CURSOS_PADRAO.map((curso) => {
                      const list = usuarioEmEdicao.cursosCoordenados ?? [];
                      const ativo = list.includes(curso);
                      return (
                        <label
                          key={curso}
                          className="flex items-center gap-2 p-1.5 rounded-md hover:bg-white cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={ativo}
                            onChange={() => {
                              const novaLista = ativo
                                ? list.filter((c) => c !== curso)
                                : [...list, curso];
                              setUsuarioEmEdicao({
                                ...usuarioEmEdicao,
                                cursosCoordenados: novaLista,
                              });
                            }}
                            className="rounded text-[#1e78f0]"
                          />
                          <span className="text-[11px] font-medium text-[#111a2e]">{curso}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Seção: Link de Cadastro */}
              <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200/80 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <LinkIcon className="w-4 h-4 text-[#1e78f0]" />
                    <span className="font-bold text-[#111a2e]">Link de Cadastro</span>
                  </div>
                  <button
                    type="button"
                    disabled={carregandoLinkEdicao}
                    onClick={handleGerarNovoLinkConclusao}
                    className="px-2.5 py-1 bg-white hover:bg-blue-50 text-[#1e78f0] border border-blue-300 rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                  >
                    <span>{linkConclusaoEdicao ? "Gerar Novo Link" : "Gerar link"}</span>
                  </button>
                </div>

                {carregandoLinkEdicao ? (
                  <p className="text-[11px] text-[#6b7385] animate-pulse">
                    Verificando link de cadastro ativo...
                  </p>
                ) : linkConclusaoEdicao ? (
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[11px] text-[#4b5563]">
                      Existe um link ativo para este usuário (válido por até 7 dias após geração):
                    </p>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        readOnly
                        value={linkConclusaoEdicao.url}
                        className="flex-1 px-2.5 py-1.5 text-[11px] font-mono bg-white border border-[#dfe2e8] rounded-lg text-[#111a2e] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(linkConclusaoEdicao.url);
                          setCopiadoLinkEdicao(true);
                          setTimeout(() => setCopiadoLinkEdicao(false), 2500);
                        }}
                        className="px-2.5 py-1.5 bg-[#1e78f0] hover:bg-[#1666d3] text-white text-[11px] font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                      >
                        {copiadoLinkEdicao ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiadoLinkEdicao ? "Copiado!" : "Copiar"}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-[#6b7385]">
                    Nenhum link ativo pendente no momento. Clique no botão acima para gerar um link de cadastro para este usuário.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#dfe2e8]">
                <button
                  type="button"
                  onClick={() => setUsuarioEmEdicao(null)}
                  className="px-4 py-2 border border-[#dfe2e8] rounded-lg text-xs font-semibold text-[#6b7385] hover:bg-[#f4f5f7] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="px-5 py-2 bg-[#1e78f0] hover:bg-[#1666d3] text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {salvando ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
