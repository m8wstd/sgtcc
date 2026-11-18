"use client";

import React, { useState } from "react";
import { semestreAtual } from "@/lib/semestre";
import type { TccResumo } from "@/lib/data/queries";
import {
  Calendar,
  FileSpreadsheet,
  Plus,
  Award,
  X,
  Check,
  AlertTriangle,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface CoordenacaoDashboardClientProps {
  nomeUsuario: string;
  perfil: "COORDENACAO" | "ADMIN";
  tccs: TccResumo[];
  cursosCoordenados?: string[];
}

type PainelAcaoTipo = "alocacao" | "avaliadores" | "cronograma" | "novo_tcc" | null;

const TODOS_CURSOS_INSTITUICAO = [
  "Engenharia de Software",
  "Sistemas de Informação",
  "Ciência da Computação",
  "Engenharia de Computação",
  "Enfermagem",
  "Medicina",
  "Direito",
  "Administração",
];

export function CoordenacaoDashboardClient({
  nomeUsuario: _nomeUsuario,
  perfil,
  tccs: tccsIniciais,
  cursosCoordenados = [],
}: CoordenacaoDashboardClientProps) {
  // Lista de cursos disponíveis:
  // Se for coordenação e tiver cursos definidos, restringe estritamente aos seus cursos.
  // Se for ADMIN (ou coordenação sem restrição), tem acesso a todos os cursos institucionais.
  const cursosDisponiveis = React.useMemo(() => {
    if (perfil === "COORDENACAO" && cursosCoordenados && cursosCoordenados.length > 0) {
      return cursosCoordenados;
    }
    return TODOS_CURSOS_INSTITUICAO;
  }, [perfil, cursosCoordenados]);
  const [tccs, setTccs] = useState<TccResumo[]>(tccsIniciais);

  // Painel de Operações da Coordenação
  const [painelAcaoAtivo, setPainelAcaoAtivo] = useState<PainelAcaoTipo>("novo_tcc");
  const [alertaSucesso, setAlertaSucesso] = useState<string | null>(null);
  const [alertaErro, setAlertaErro] = useState<string | null>(null);

  const _avisar = (msg: string) => {
    setAlertaSucesso(msg);
    setTimeout(() => setAlertaSucesso(null), 5000);
  };

  // Lista de orientadores cadastrados no sistema
  const [orientadoresSistema, setOrientadoresSistema] = useState<Array<{
    id: string;
    usuario_id: string;
    nome: string;
    email: string;
  }>>([]);
  const [carregandoOrientadores, setCarregandoOrientadores] = useState(false);

  // Lista de avaliadores cadastrados no sistema
  const [avaliadoresSistema, setAvaliadoresSistema] = useState<Array<{
    id: string;
    usuario_id: string;
    nome: string;
    email: string;
    cursos?: string[];
  }>>([]);
  const [carregandoAvaliadores, setCarregandoAvaliadores] = useState(false);

  // Lista de alunos cadastrados no sistema para vincular ao TCC
  const [alunosSistema, setAlunosSistema] = useState<Array<{
    id: string;
    matricula: string;
    nome: string;
    email: string;
    curso: string;
    temTcc: boolean;
  }>>([]);
  const [carregandoAlunos, setCarregandoAlunos] = useState(false);

  // Estados do formulário de Novo TCC
  const [novoTccTitulo, setNovoTccTitulo] = useState("");
  const [novoTccAlunosIds, setNovoTccAlunosIds] = useState<string[]>([]);
  const [novoTccOrientadorId, setNovoTccOrientadorId] = useState("");
  const [modalAvaliadoresTccId, setModalAvaliadoresTccId] = useState<string | null>(null);
  const [novoTccCurso, setNovoTccCurso] = useState(() => {
    if (perfil === "COORDENACAO" && cursosCoordenados && cursosCoordenados.length > 0) {
      return cursosCoordenados[0];
    }
    return "Engenharia de Software";
  });
  const [novoTccFase, setNovoTccFase] = useState<1 | 2>(1);
  const [novoTccSemestre, setNovoTccSemestre] = useState(semestreAtual());
  const [salvandoNovoTcc, setSalvandoNovoTcc] = useState(false);

  // Estados da Alocação de Docentes Orientadores
  const [alocacaoMapeamento, setAlocacaoMapeamento] = useState<Record<string, string>>({});
  const [salvandoAlocacao, setSalvandoAlocacao] = useState(false);

  // Estados da Alocação de Professores Avaliadores (Bancas)
  const [alocacaoAvaliadoresMapeamento, setAlocacaoAvaliadoresMapeamento] = useState<Record<string, string[]>>({});
  const [salvandoAvaliadores, setSalvandoAvaliadores] = useState(false);

  const [cronograma, setCronograma] = useState<Array<{
    id: string;
    titulo: string;
    dataLimite: string;
    fase: 1 | 2;
    tipo: "COMUM" | "ENTREGA_FINAL" | "DEFESA";
    ordem: number;
    exigeArquivo?: boolean;
    descricao?: string;
  }>>([]);
  const [faseCronograma, setFaseCronograma] = useState<1 | 2>(1);
  const [salvandoCronograma, setSalvandoCronograma] = useState(false);
  const [editandoCronograma, setEditandoCronograma] = useState(false);
  const [excluirIds, setExcluirIds] = useState<string[]>([]);
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novoPrazo, setNovoPrazo] = useState("");

  // Carregar orientadores da API
  const carregarOrientadores = React.useCallback(() => {
    setCarregandoOrientadores(true);
    fetch("/api/coordenacao/orientadores")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.orientadores && Array.isArray(data.orientadores)) {
          setOrientadoresSistema(data.orientadores);
        }
      })
      .catch((err) => console.error("Falha ao carregar orientadores:", err))
      .finally(() => setCarregandoOrientadores(false));
  }, []);

  // Carregar avaliadores da API
  const carregarAvaliadores = React.useCallback(() => {
    setCarregandoAvaliadores(true);
    fetch("/api/coordenacao/avaliadores")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.avaliadores && Array.isArray(data.avaliadores)) {
          setAvaliadoresSistema(data.avaliadores);
        }
      })
      .catch((err) => console.error("Falha ao carregar avaliadores:", err))
      .finally(() => setCarregandoAvaliadores(false));
  }, []);

  // Carregar alunos da API
  const carregarAlunos = React.useCallback(() => {
    setCarregandoAlunos(true);
    fetch("/api/coordenacao/alunos")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.alunos && Array.isArray(data.alunos)) {
          setAlunosSistema(data.alunos);
        }
      })
      .catch((err) => console.error("Falha ao carregar alunos:", err))
      .finally(() => setCarregandoAlunos(false));
  }, []);

  React.useEffect(() => {
    carregarOrientadores();
    carregarAvaliadores();
    carregarAlunos();
  }, [carregarOrientadores, carregarAvaliadores, carregarAlunos]);

  // Carregar cronograma real da API
  React.useEffect(() => {
    fetch("/api/coordenacao/cronograma")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.marcos && Array.isArray(data.marcos) && data.marcos.length > 0) {
          setCronograma(
            data.marcos.map((m: any) => ({
              id: m.id,
              titulo: m.titulo,
              dataLimite: typeof m.dataLimite === "string" ? m.dataLimite.split("T")[0] : m.dataLimite,
              fase: m.fase === 2 ? 2 : 1,
              tipo: m.tipo ?? (m.id === "entrega-final" ? "ENTREGA_FINAL" : m.id === "defesa" ? "DEFESA" : "COMUM"),
              ordem: m.ordem ?? 1,
              exigeArquivo: m.exigeArquivo,
              descricao: m.descricao,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const handleAdicionarEtapa = () => {
    if (!novoTitulo.trim()) return;
    const slug = novoTitulo
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
    const id = `tcc${faseCronograma}-${slug}-${Date.now().toString().slice(-4)}`;

    const maxOrdemComum = Math.max(
      0,
      ...cronograma.filter((m) => m.tipo === "COMUM" && m.fase === faseCronograma).map((m) => m.ordem)
    );

    setCronograma((prev) => [
      ...prev,
      {
        id,
        titulo: novoTitulo.trim(),
        dataLimite: novoPrazo || new Date().toISOString().split("T")[0],
        fase: faseCronograma,
        tipo: "COMUM",
        ordem: maxOrdemComum + 1,
        exigeArquivo: true,
      },
    ]);
    setNovoTitulo("");
    setNovoPrazo("");
  };

  const handleRemoverEtapa = (id: string) => {
    setCronograma((prev) => prev.filter((m) => m.id !== id));
    setExcluirIds((prev) => [...prev, id]);
  };

  const handleSalvarCronograma = async () => {
    setSalvandoCronograma(true);
    try {
      const res = await fetch("/api/coordenacao/cronograma", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marcos: cronograma, excluirIds }),
      });
      if (res.ok) {
        _avisar("Cronograma e etapas atualizados com sucesso!");
        setEditandoCronograma(false);
        setExcluirIds([]);
      } else {
        alert("Erro ao salvar cronograma.");
      }
    } catch {
      alert("Falha na comunicação com o servidor.");
    } finally {
      setSalvandoCronograma(false);
    }
  };



  const handleSalvarAvaliadoresTcc = async (tccId: string) => {
    const selecionados = alocacaoAvaliadoresMapeamento[tccId] ?? [];
    setSalvandoAvaliadores(true);
    setAlertaErro(null);

    try {
      const res = await fetch("/api/coordenacao/avaliadores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tccId,
          avaliadoresUids: selecionados,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || "Falha ao alocar professores avaliadores.");
      }

      setTccs((prev) =>
        prev.map((t) => (t.id === tccId ? { ...t, avaliadoresUids: selecionados } : t))
      );
      setAlertaSucesso("Professores avaliadores alocados para a banca com sucesso!");
      setTimeout(() => setAlertaSucesso(null), 5000);
    } catch (err) {
      setAlertaErro(err instanceof Error ? err.message : "Erro ao alocar avaliadores.");
      setTimeout(() => setAlertaErro(null), 5000);
    } finally {
      setSalvandoAvaliadores(false);
    }
  };

  const handleSalvarAlocacaoLote = async () => {
    const alocacoesParaEnviar = Object.entries(alocacaoMapeamento)
      .filter(([_, orientadorId]) => Boolean(orientadorId))
      .map(([tccId, orientadorId]) => {
        const doc = orientadoresSistema.find((o) => o.id === orientadorId || o.usuario_id === orientadorId);
        return {
          tccId,
          orientadorId,
          orientadorNome: doc?.nome,
        };
      });

    if (alocacoesParaEnviar.length === 0) {
      setAlertaErro("Nenhuma alteração de docente selecionada para alocação.");
      setTimeout(() => setAlertaErro(null), 4000);
      return;
    }

    setSalvandoAlocacao(true);
    setAlertaErro(null);

    try {
      const res = await fetch("/api/coordenacao/alocacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alocacoes: alocacoesParaEnviar }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || "Falha ao salvar alocação em lote.");
      }

      // Atualiza o estado local
      setTccs((prev) =>
        prev.map((t) => {
          const novaAloc = alocacoesParaEnviar.find((a) => a.tccId === t.id);
          if (novaAloc && novaAloc.orientadorNome) {
            return { ...t, orientadorNome: novaAloc.orientadorNome, orientador_id: novaAloc.orientadorId };
          }
          return t;
        })
      );

      setAlocacaoMapeamento({});
      setPainelAcaoAtivo(null);
      setAlertaSucesso(data?.message || "Alocações de docentes atualizadas com sucesso!");
      setTimeout(() => setAlertaSucesso(null), 5000);
      carregarOrientadores();
    } catch (err) {
      setAlertaErro(err instanceof Error ? err.message : "Erro ao alocar docentes.");
      setTimeout(() => setAlertaErro(null), 5000);
    } finally {
      setSalvandoAlocacao(false);
    }
  };

  const alternarPainelAcao = (tipo: PainelAcaoTipo) => {
    setPainelAcaoAtivo((prev) => (prev === tipo ? null : tipo));
  };

  const handleCriarNovoTcc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoTccTitulo.trim()) {
      setAlertaErro("Informe o título do TCC.");
      return;
    }
    if (novoTccAlunosIds.length === 0) {
      setAlertaErro("Selecione pelo menos um aluno para vincular ao TCC.");
      return;
    }
    if (!novoTccOrientadorId) {
      setAlertaErro("Selecione um professor orientador.");
      return;
    }

    const alunosSelecionados = alunosSistema.filter((a) =>
      novoTccAlunosIds.includes(a.id) || novoTccAlunosIds.includes(a.matricula)
    );
    const orientadorSelecionado = orientadoresSistema.find(
      (o) => o.id === novoTccOrientadorId || o.usuario_id === novoTccOrientadorId
    );

    setSalvandoNovoTcc(true);
    setAlertaErro(null);

    try {
      const res = await fetch("/api/coordenacao/tcc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: novoTccTitulo.trim(),
          alunos: alunosSelecionados.map((a) => ({ matricula: a.matricula, uid: a.id })),
          orientadorId: novoTccOrientadorId,
          curso: novoTccCurso,
          fase: novoTccFase,
          semestre: novoTccSemestre,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || "Falha ao criar e vincular TCC.");
      }

      // Adiciona o novo TCC à lista local
      if (data?.tcc) {
        const nomesAlunos = alunosSelecionados.map((a) => a.nome).join(", ");
        const novoResumo: TccResumo = {
          ...data.tcc,
          alunoNome: nomesAlunos || "Aluno(s)",
          orientadorNome: orientadorSelecionado?.nome || "Docente",
        };
        setTccs((prev) => [novoResumo, ...prev]);
      }

      setAlertaSucesso("Novo TCC criado e vinculado ao cronograma com sucesso!");
      setTimeout(() => setAlertaSucesso(null), 5000);

      // Reseta form
      setNovoTccTitulo("");
      setNovoTccAlunosIds([]);
      setPainelAcaoAtivo(null);
      carregarAlunos();
    } catch (err) {
      setAlertaErro(err instanceof Error ? err.message : "Erro ao criar TCC.");
      setTimeout(() => setAlertaErro(null), 5000);
    } finally {
      setSalvandoNovoTcc(false);
    }
  };



  return (
    <div className="space-y-6 w-full">
      {/* Cabeçalho */}
      <div className="border-b border-[#dfe2e8] pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111a2e]">
          Painel de Operações da Coordenação
        </h1>
        <p className="text-sm text-[#6b7385] mt-1">
          Gerencie o cadastro de novos TCCs, alocação de orientadores, bancas avaliadoras e cronograma oficial.
        </p>
      </div>

      {alertaSucesso && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{alertaSucesso}</span>
        </div>
      )}

      {alertaErro && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs font-medium flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{alertaErro}</span>
          </div>
          <button type="button" onClick={() => setAlertaErro(null)} className="text-red-700 hover:text-red-900 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Mini Painel Acoplado de Gestão da Coordenação */}
      <section className="rounded-2xl border border-[#dfe2e8] bg-white overflow-hidden shadow-xs transition-all">
        {/* Barra Integrada de Botões das Funções */}
        <div className="p-3 bg-[#f8f9fa] border-b border-[#dfe2e8] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#1e78f0]" />
            <span className="text-xs font-bold text-[#111a2e] uppercase tracking-wider">
              Painel de Operações da Coordenação
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => alternarPainelAcao("novo_tcc")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                painelAcaoAtivo === "novo_tcc"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-white border border-[#dfe2e8] text-[#111a2e] hover:bg-[#f0f2f5]"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo TCC</span>
              {painelAcaoAtivo === "novo_tcc" ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3 text-[#6b7385]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => alternarPainelAcao("alocacao")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                painelAcaoAtivo === "alocacao"
                  ? "bg-[#1e78f0] text-white shadow-xs"
                  : "bg-white border border-[#dfe2e8] text-[#111a2e] hover:bg-[#f0f2f5]"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Alocação de Docentes</span>
              {painelAcaoAtivo === "alocacao" ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3 text-[#6b7385]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => alternarPainelAcao("avaliadores")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                painelAcaoAtivo === "avaliadores"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-white border border-[#dfe2e8] text-[#111a2e] hover:bg-[#f0f2f5]"
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Alocação de Avaliadores</span>
              {painelAcaoAtivo === "avaliadores" ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3 text-[#6b7385]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => alternarPainelAcao("cronograma")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                painelAcaoAtivo === "cronograma"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-white border border-[#dfe2e8] text-[#111a2e] hover:bg-[#f0f2f5]"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Cronograma Semestral</span>
              {painelAcaoAtivo === "cronograma" ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3 text-[#6b7385]" />
              )}
            </button>
          </div>
        </div>

        {/* Conteúdo Dinâmico Acoplado (sem pop-ups flutuantes) */}
        {painelAcaoAtivo === "novo_tcc" && (
          <div className="p-3.5 sm:p-5 bg-emerald-50/20 border-b border-[#dfe2e8] space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-emerald-100 text-emerald-700">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#111a2e]">
                    Cadastrar Novo TCC
                  </h3>
                  <p className="text-xs text-[#6b7385]">
                    Vincule um aluno recém-cadastrado ao seu orientador, definindo curso, fase e semestre de acompanhamento.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPainelAcaoAtivo(null)}
                className="p-1 rounded-md text-[#6b7385] hover:bg-[#e5e7eb] cursor-pointer"
                title="Recolher painel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCriarNovoTcc} className="bg-white p-3 sm:p-4 rounded-xl border border-[#dfe2e8] space-y-3.5 sm:space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Título do TCC */}
                <div className="space-y-1 lg:col-span-3">
                  <label className="text-xs font-semibold text-[#111a2e]">
                    Título Provisório / Definitivo do TCC <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Arquitetura de Microsserviços para Plataformas Educacionais"
                    value={novoTccTitulo}
                    onChange={(e) => setNovoTccTitulo(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#dfe2e8] rounded-lg bg-white text-[#111a2e] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                {/* Seleção de Alunos (Múltiplos Autores) */}
                <div className="space-y-1 lg:col-span-2 min-w-0 max-w-full">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <label className="text-xs font-semibold text-[#111a2e]">
                      Alunos / Autores do TCC <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[11px] text-[#6b7385]">
                      {novoTccAlunosIds.length === 0
                        ? "Nenhum aluno selecionado"
                        : `${novoTccAlunosIds.length} selecionado(s)`}
                    </span>
                  </div>

                  {/* Dropdown de adição de alunos */}
                  <div className="w-full min-w-0">
                    <select
                      value=""
                      onChange={(e) => {
                        const selId = e.target.value;
                        if (!selId) return;
                        if (!novoTccAlunosIds.includes(selId)) {
                          setNovoTccAlunosIds((prev) => [...prev, selId]);
                          const al = alunosSistema.find((a) => a.id === selId || a.matricula === selId);
                          if (al?.curso && novoTccAlunosIds.length === 0) {
                            if (cursosDisponiveis.includes(al.curso)) {
                              setNovoTccCurso(al.curso);
                            }
                          }
                        }
                      }}
                      className="w-full max-w-full px-3 py-2 text-xs border border-[#dfe2e8] rounded-lg bg-white text-[#111a2e] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 cursor-pointer truncate"
                    >
                      <option value="">
                        {carregandoAlunos ? "Carregando alunos..." : "+ Adicionar aluno ao trabalho..."}
                      </option>
                      {alunosSistema
                        .filter((a) => !novoTccAlunosIds.includes(a.id) && !novoTccAlunosIds.includes(a.matricula))
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.nome} ({a.matricula}){a.temTcc ? " • Com TCC" : ""}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Tags com os alunos adicionados */}
                  {novoTccAlunosIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1.5 max-w-full overflow-hidden">
                      {novoTccAlunosIds.map((id) => {
                        const al = alunosSistema.find((a) => a.id === id || a.matricula === id);
                        return (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 max-w-full"
                          >
                            <span className="truncate max-w-[200px] sm:max-w-xs">{al?.nome ?? id}</span>
                            <button
                              type="button"
                              onClick={() => setNovoTccAlunosIds((prev) => prev.filter((x) => x !== id))}
                              className="text-emerald-700 hover:text-emerald-900 cursor-pointer shrink-0"
                              title="Remover aluno"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Seleção de Orientador */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#111a2e]">
                    Professor Orientador <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={novoTccOrientadorId}
                    onChange={(e) => setNovoTccOrientadorId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#dfe2e8] rounded-lg bg-white text-[#111a2e] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 cursor-pointer"
                  >
                    <option value="">
                      {carregandoOrientadores ? "Carregando orientadores..." : "Selecione o docente orientador"}
                    </option>
                    {orientadoresSistema.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.nome} {o.email ? `(${o.email})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Curso — Restrito aos cursos que o coordenador coordena */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#111a2e]">
                      Curso <span className="text-red-500">*</span>
                    </label>
                    {perfil === "COORDENACAO" && cursosCoordenados.length > 0 && (
                      <span className="text-[10px] text-[#1e78f0] font-semibold">
                        (Restrito à sua coordenação)
                      </span>
                    )}
                  </div>
                  <select
                    required
                    value={novoTccCurso}
                    onChange={(e) => setNovoTccCurso(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#dfe2e8] rounded-lg bg-white text-[#111a2e] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 cursor-pointer"
                  >
                    {cursosDisponiveis.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Fase */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#111a2e]">Fase do TCC</label>
                  <select
                    value={novoTccFase}
                    onChange={(e) => setNovoTccFase(Number(e.target.value) as 1 | 2)}
                    className="w-full px-3 py-2 text-xs border border-[#dfe2e8] rounded-lg bg-white text-[#111a2e] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 cursor-pointer"
                  >
                    <option value={1}>TCC 1 (Proposta / Projeto Preliminar)</option>
                    <option value={2}>TCC 2 (Monografia Final / Defesa de Banca)</option>
                  </select>
                </div>

                {/* Semestre de Vínculo */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#111a2e]">Semestre Letivo</label>
                  <input
                    type="text"
                    value={novoTccSemestre}
                    onChange={(e) => setNovoTccSemestre(e.target.value)}
                    placeholder="Ex: 2026/2"
                    className="w-full px-3 py-2 text-xs border border-[#dfe2e8] rounded-lg bg-white text-[#111a2e] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-[#dfe2e8]">
                <button
                  type="button"
                  onClick={() => setPainelAcaoAtivo(null)}
                  className="w-full sm:w-auto px-3.5 py-2 sm:py-1.5 rounded-lg border border-[#dfe2e8] bg-white text-xs font-semibold text-[#6b7385] hover:bg-[#f4f5f7] cursor-pointer text-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoNovoTcc || !novoTccTitulo.trim() || novoTccAlunosIds.length === 0 || !novoTccOrientadorId}
                  className="w-full sm:w-auto px-4 py-2 sm:py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{salvandoNovoTcc ? "Criando TCC..." : "Confirmar e Criar TCC"}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Conteúdo Dinâmico Acoplado (sem pop-ups flutuantes) */}
        {painelAcaoAtivo === "alocacao" && (
          <div className="p-5 bg-blue-50/20 border-b border-[#dfe2e8] space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-blue-100 text-[#1e78f0]">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#111a2e]">
                    Alocação e Lotes Semestrais de Orientadores
                  </h3>
                  <p className="text-xs text-[#6b7385]">
                    Distribuir orientandos por curso e capacidade docente autorizada pelo Administrador.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPainelAcaoAtivo(null)}
                className="p-1 rounded-md text-[#6b7385] hover:bg-[#e5e7eb] cursor-pointer"
                title="Recolher painel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabela de Alocação de Docentes */}
            <div className="bg-white rounded-xl border border-[#dfe2e8] overflow-hidden shadow-2xs">
              <div className="p-3 bg-[#f8f9fa] border-b border-[#dfe2e8] flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#111a2e]">TCCs e Alocação de Docente</h4>
                  <p className="text-[11px] text-[#6b7385]">Selecione o orientador responsável para cada trabalho e confirme a alocação.</p>
                </div>
                <button
                  type="button"
                  onClick={handleSalvarAlocacaoLote}
                  disabled={salvandoAlocacao || Object.keys(alocacaoMapeamento).length === 0}
                  className="px-4 py-1.5 bg-[#1e78f0] hover:bg-[#1666d3] disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  {salvandoAlocacao ? "Salvando Alocações..." : "Salvar Alocações"}
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-[#dfe2e8]">
                {tccs.filter((t) => t.statusGeral !== "APROVADO" && t.statusGeral !== "DEFENDIDO").length === 0 ? (
                  <div className="p-4 text-center text-xs text-[#6b7385]">Nenhum TCC em andamento para alocação.</div>
                ) : (
                  tccs
                    .filter((t) => t.statusGeral !== "APROVADO" && t.statusGeral !== "DEFENDIDO")
                    .map((t) => (
                    <div key={t.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-[#fafbfc]">
                      <div className="min-w-0 flex-1">
                        <b className="text-[#111a2e] block truncate">{t.alunoNome}</b>
                        <p className="text-[11px] text-[#6b7385] truncate">{t.titulo}</p>
                        <span className="text-[10px] text-[#6b7385]">{t.curso ?? "Curso Padrão"} &bull; {t.fase ? `TCC ${t.fase}` : "TCC 1"}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] text-[#6b7385] hidden md:inline">Orientador:</span>
                        <select
                          value={alocacaoMapeamento[t.id] ?? t.orientador_id}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAlocacaoMapeamento((prev) => ({ ...prev, [t.id]: val }));
                          }}
                          className="px-2.5 py-1.5 text-xs border border-[#dfe2e8] rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#1e78f0] min-w-[200px]"
                        >
                          {orientadoresSistema.length > 0 ? (
                            orientadoresSistema.map((o) => (
                              <option key={o.id} value={o.id}>
                                {o.nome}
                              </option>
                            ))
                          ) : (
                            <option value={t.orientador_id}>{t.orientadorNome}</option>
                          )}
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {painelAcaoAtivo === "avaliadores" && (
          <div className="p-5 bg-purple-50/20 border-b border-[#dfe2e8] space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-purple-100 text-purple-700">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#111a2e]">
                    Alocação de Professores Avaliadores para Bancas
                  </h3>
                  <p className="text-xs text-[#6b7385]">
                    Convide e vincule os docentes examinadores responsáveis pela avaliação do TCC final.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPainelAcaoAtivo(null)}
                className="p-1 rounded-md text-[#6b7385] hover:bg-[#e5e7eb] cursor-pointer"
                title="Recolher painel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-white rounded-xl border border-[#dfe2e8] overflow-hidden shadow-2xs">
              <div className="p-3 bg-[#f8f9fa] border-b border-[#dfe2e8]">
                <h4 className="text-xs font-bold text-[#111a2e]">Bancas e Avaliadores Designados</h4>
                <p className="text-[11px] text-[#6b7385]">Selecione os professores avaliadores para compor a banca examinadora de cada TCC.</p>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-[#dfe2e8]">
                {tccs.filter((t) => t.statusGeral !== "APROVADO" && t.statusGeral !== "DEFENDIDO").length === 0 ? (
                  <div className="p-4 text-center text-xs text-[#6b7385]">Nenhum TCC ativo necessitando de banca.</div>
                ) : (
                  tccs
                    .filter((t) => t.statusGeral !== "APROVADO" && t.statusGeral !== "DEFENDIDO")
                    .map((t) => {
                      const selecionados = alocacaoAvaliadoresMapeamento[t.id] ?? t.avaliadoresUids ?? [];
                      return (
                        <div key={t.id} className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs hover:bg-[#fafbfc]">
                          <div className="min-w-0 flex-1">
                            <b className="text-[#111a2e] block truncate text-sm">{t.alunoNome}</b>
                            <p className="text-[11.5px] text-[#6b7385] font-medium">{t.titulo}</p>
                            <span className="text-[10px] text-[#1e78f0] font-semibold">
                              {t.curso ?? "Curso Padrão"} &bull; {t.fase ? `TCC ${t.fase}` : "TCC 1"} &bull; Orientador: {t.orientadorNome}
                            </span>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            {/* Tags dos professores já adicionados à banca */}
                            <div className="flex flex-wrap items-center gap-1.5 max-w-md">
                              {selecionados.map((uid) => {
                                const av = avaliadoresSistema.find((a) => (a.usuario_id || a.id) === uid);
                                const nome = av?.nome ?? `Prof. ${uid.slice(0, 6)}`;
                                return (
                                  <span
                                    key={uid}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200"
                                  >
                                    <span>{nome}</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const novo = selecionados.filter((x) => x !== uid);
                                        setAlocacaoAvaliadoresMapeamento((prev) => ({
                                          ...prev,
                                          [t.id]: novo,
                                        }));
                                      }}
                                      className="text-purple-600 hover:text-purple-900 cursor-pointer"
                                      title="Remover avaliador"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </span>
                                );
                              })}

                              {/* Botão de + para abrir modal com professores disponíveis */}
                              <button
                                type="button"
                                onClick={() => setModalAvaliadoresTccId(t.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white text-[#111a2e] border border-[#dfe2e8] hover:border-purple-400 hover:text-purple-700 transition-colors cursor-pointer shadow-2xs"
                                title="Adicionar avaliadores da banca"
                              >
                                <Plus className="w-3.5 h-3.5 text-purple-600" />
                                <span>{selecionados.length === 0 ? "Adicionar Avaliadores" : "+ Adicionar"}</span>
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleSalvarAvaliadoresTcc(t.id)}
                              disabled={salvandoAvaliadores}
                              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs whitespace-nowrap self-start sm:self-center"
                            >
                              Salvar Banca
                            </button>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          </div>
        )}

        {painelAcaoAtivo === "cronograma" && (
          <div className="p-5 bg-amber-50/20 border-b border-[#dfe2e8] space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-amber-100 text-amber-700">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#111a2e]">
                    Cronograma Institucional do Semestre
                  </h3>
                  <p className="text-xs text-[#6b7385]">
                    Datas limites oficiais para submissões de etapas e bancas avaliadoras do curso.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditandoCronograma(!editandoCronograma)}
                  className="px-3.5 py-1.5 bg-white border border-[#dfe2e8] hover:bg-[#f4f5f7] text-[#111a2e] text-xs font-semibold rounded-lg cursor-pointer"
                >
                  {editandoCronograma ? "Visualizar" : "Editar"}
                </button>
                <button
                  type="button"
                  onClick={() => setPainelAcaoAtivo(null)}
                  className="p-1 rounded-md text-[#6b7385] hover:bg-[#e5e7eb] cursor-pointer"
                  title="Recolher painel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Abas TCC 1 vs TCC 2 */}
            <div className="flex items-center gap-2 border-b border-[#dfe2e8] pb-2">
              <button
                type="button"
                onClick={() => setFaseCronograma(1)}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  faseCronograma === 1
                    ? "bg-[#0f1b33] text-white shadow-xs"
                    : "bg-white text-[#6b7385] hover:text-[#111a2e] border border-[#dfe2e8]"
                }`}
              >
                TCC 1
              </button>
              <button
                type="button"
                onClick={() => setFaseCronograma(2)}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  faseCronograma === 2
                    ? "bg-[#0f1b33] text-white shadow-xs"
                    : "bg-white text-[#6b7385] hover:text-[#111a2e] border border-[#dfe2e8]"
                }`}
              >
                TCC 2
              </button>
            </div>

            {/* Etapas */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#111a2e]">
                  Etapas — TCC {faseCronograma}
                </span>
                {editandoCronograma && (
                  <span className="text-[11px] text-[#6b7385]">
                    Adicione novas etapas ou altere os prazos e títulos
                  </span>
                )}
              </div>

              {editandoCronograma && (
                <div className="p-3 bg-white rounded-lg border border-[#1e78f0]/30 bg-blue-50/20 flex flex-col sm:flex-row items-center gap-2">
                  <input
                    type="text"
                    value={novoTitulo}
                    onChange={(e) => setNovoTitulo(e.target.value)}
                    placeholder={`Título da nova etapa de TCC ${faseCronograma}...`}
                    className="flex-1 w-full px-3 py-1.5 text-xs border border-[#dfe2e8] rounded-lg bg-white text-[#111a2e] focus:outline-none focus:ring-1 focus:ring-[#1e78f0]"
                  />
                  <input
                    type="date"
                    value={novoPrazo}
                    onChange={(e) => setNovoPrazo(e.target.value)}
                    className="w-full sm:w-auto px-3 py-1.5 text-xs border border-[#dfe2e8] rounded-lg bg-white text-[#111a2e] focus:outline-none focus:ring-1 focus:ring-[#1e78f0]"
                  />
                  <button
                    type="button"
                    onClick={handleAdicionarEtapa}
                    className="w-full sm:w-auto px-3.5 py-1.5 bg-[#1e78f0] hover:bg-[#1666d3] text-white text-xs font-semibold rounded-lg cursor-pointer whitespace-nowrap"
                  >
                    Criar Etapa
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                {cronograma
                  .filter((m) => m.tipo === "COMUM" && m.fase === faseCronograma)
                  .map((m, idx) => (
                    <div key={m.id} className="p-3 bg-white rounded-lg border border-[#dfe2e8] space-y-1.5 relative group">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[#1e78f0] uppercase">
                          Etapa {idx + 1}
                        </span>
                        {editandoCronograma && (
                          <button
                            type="button"
                            onClick={() => handleRemoverEtapa(m.id)}
                            className="text-[#ff7f7f] hover:text-red-700 p-0.5 rounded cursor-pointer"
                            title="Remover etapa"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      {editandoCronograma ? (
                        <div className="space-y-1">
                          <input
                            type="text"
                            value={m.titulo}
                            onChange={(e) => {
                              const v = e.target.value;
                              setCronograma((prev) =>
                                prev.map((item) => (item.id === m.id ? { ...item, titulo: v } : item))
                              );
                            }}
                            className="w-full px-2 py-1 text-xs border border-[#dfe2e8] rounded bg-white text-[#111a2e]"
                          />
                          <input
                            type="date"
                            value={m.dataLimite}
                            onChange={(e) => {
                              const v = e.target.value;
                              setCronograma((prev) =>
                                prev.map((item) => (item.id === m.id ? { ...item, dataLimite: v } : item))
                              );
                            }}
                            className="w-full px-2 py-1 text-xs border border-[#dfe2e8] rounded bg-white text-[#111a2e]"
                          />
                        </div>
                      ) : (
                        <>
                          <p className="font-semibold text-[#111a2e] leading-snug">{m.titulo}</p>
                          <span className="text-[11px] text-[#6b7385] block">
                            Prazo: {m.dataLimite ? m.dataLimite.split("-").reverse().join("/") : "A definir"}
                          </span>
                        </>
                      )}
                    </div>
                  ))}
              </div>
            </div>

            {/* Banca Avaliadora e Defesa (relevante principalmente para o Trabalho Final TCC 2) */}
            <div className="space-y-2 pt-2 border-t border-[#dfe2e8]/60">
              <span className="text-xs font-bold uppercase tracking-wider text-[#111a2e]">
                Banca Avaliadora e Defesa
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                {cronograma
                  .filter((m) => (m.tipo === "ENTREGA_FINAL" || m.tipo === "DEFESA") && m.fase === faseCronograma)
                  .map((m) => {
                    const isFinal = m.tipo === "ENTREGA_FINAL";
                    return (
                      <div
                        key={m.id}
                        className={`p-3 bg-white rounded-lg border space-y-1.5 ${
                          isFinal ? "border-amber-200 bg-amber-50/20" : "border-emerald-200 bg-emerald-50/20"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[10px] font-bold uppercase ${
                              isFinal ? "text-amber-800" : "text-emerald-800"
                            }`}
                          >
                            {isFinal ? "Envio à Banca" : "Defesa Pública"}
                          </span>
                        </div>
                        {editandoCronograma ? (
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={m.titulo}
                              onChange={(e) => {
                                const v = e.target.value;
                                setCronograma((prev) =>
                                  prev.map((item) => (item.id === m.id ? { ...item, titulo: v } : item))
                                );
                              }}
                              className="w-full px-2 py-1 text-xs border border-[#dfe2e8] rounded bg-white text-[#111a2e]"
                            />
                            <input
                              type="date"
                              value={m.dataLimite}
                              onChange={(e) => {
                                const v = e.target.value;
                                setCronograma((prev) =>
                                  prev.map((item) => (item.id === m.id ? { ...item, dataLimite: v } : item))
                                );
                              }}
                              className="w-full px-2 py-1 text-xs border border-[#dfe2e8] rounded bg-white text-[#111a2e]"
                            />
                          </div>
                        ) : (
                          <>
                            <p className="font-semibold text-[#111a2e] leading-snug">{m.titulo}</p>
                            <span
                              className={`text-[11px] font-bold block ${
                                isFinal ? "text-amber-900" : "text-emerald-900"
                              }`}
                            >
                              Prazo: {m.dataLimite ? m.dataLimite.split("-").reverse().join("/") : "A definir"}
                            </span>
                          </>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>

            {editandoCronograma && (
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#dfe2e8]">
                <button
                  type="button"
                  onClick={() => setEditandoCronograma(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-[#dfe2e8] bg-white text-xs font-semibold text-[#6b7385] hover:bg-[#f4f5f7] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={salvandoCronograma}
                  onClick={handleSalvarCronograma}
                  className="px-4 py-1.5 bg-[#1e78f0] hover:bg-[#1666d3] disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  {salvandoCronograma ? "Salvando..." : "Salvar Alterações no Banco"}
                </button>
              </div>
            )}
          </div>
        )}
      </section>
      {/* Modal / Popup de Seleção de Avaliadores Disponíveis do Curso */}
      {modalAvaliadoresTccId && (() => {
        const tccAtivo = tccs.find((t) => t.id === modalAvaliadoresTccId);
        const selecionadosAtuais = alocacaoAvaliadoresMapeamento[modalAvaliadoresTccId] ?? tccAtivo?.avaliadoresUids ?? [];
        const cursoDoTcc = tccAtivo?.curso;

        // Filtra professores disponíveis: prioriza professores com o curso do aluno, ou lista todos se nenhum tiver
        const avaliadoresDoCurso = avaliadoresSistema.filter((av) => {
          if (!cursoDoTcc) return true;
          if (!av.cursos || av.cursos.length === 0) return true;
          return av.cursos.includes(cursoDoTcc);
        });

        const listaExibicao = avaliadoresDoCurso.length > 0 ? avaliadoresDoCurso : avaliadoresSistema;

        return (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl border border-[#dfe2e8] shadow-xl max-w-lg w-full overflow-hidden space-y-0">
              <div className="p-4 bg-[#f8f9fa] border-b border-[#dfe2e8] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#111a2e]">
                    Professores Disponíveis — Banca Examinadora
                  </h3>
                  <p className="text-xs text-[#6b7385] mt-0.5">
                    {tccAtivo?.titulo} ({cursoDoTcc ?? "Todos os Cursos"})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalAvaliadoresTccId(null)}
                  className="p-1 rounded-md text-[#6b7385] hover:bg-[#e5e7eb] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 max-h-80 overflow-y-auto divide-y divide-[#f0f2f5] space-y-1">
                {listaExibicao.length === 0 ? (
                  <div className="text-center py-6 text-xs text-[#6b7385]">
                    Nenhum professor encontrado para este curso.
                  </div>
                ) : (
                  listaExibicao.map((av) => {
                    const uid = av.usuario_id || av.id;
                    const marcado = selecionadosAtuais.includes(uid);
                    return (
                      <div
                        key={av.id}
                        onClick={() => {
                          const novo = marcado
                            ? selecionadosAtuais.filter((x) => x !== uid)
                            : [...selecionadosAtuais, uid];
                          setAlocacaoAvaliadoresMapeamento((prev) => ({
                            ...prev,
                            [modalAvaliadoresTccId]: novo,
                          }));
                        }}
                        className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${
                          marcado ? "bg-purple-50 text-purple-900" : "hover:bg-[#fafbfc] text-[#111a2e]"
                        }`}
                      >
                        <div>
                          <b className="text-xs font-semibold block">{av.nome}</b>
                          <span className="text-[11px] text-[#6b7385]">
                            {av.email || "Sem e-mail"} {av.cursos?.length ? `• ${av.cursos.join(", ")}` : ""}
                          </span>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                            marcado
                              ? "bg-purple-600 border-purple-600 text-white"
                              : "border-[#dfe2e8] bg-white text-transparent"
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-3 bg-[#f8f9fa] border-t border-[#dfe2e8] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalAvaliadoresTccId(null)}
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  Concluir Seleção ({selecionadosAtuais.length})
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
