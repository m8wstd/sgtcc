"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, BookOpen, GraduationCap, Info, Search, Users } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { StatusPill } from "@/components/ui/status-pill";
import { ROTULO_STATUS_TCC } from "@/components/layout/status";
import type { AdminDashboardData } from "@/lib/data/admin-queries";
import type { StatusGeralTCC } from "@/types";

interface Props {
  nome: string;
  dados: AdminDashboardData | null;
  erro?: string;
}

const PERFIS = [
  ["ALUNO", "Alunos"],
  ["ORIENTADOR", "Orientadores"],
  ["AVALIADOR", "Avaliadores"],
  ["COORDENACAO", "Coordenação"],
  ["ADMIN", "Administradores"],
] as const;

const STATUS = [
  "EM_ANDAMENTO",
  "AGUARDANDO_BANCA",
  "DEFENDIDO",
  "APROVADO",
  "REPROVADO",
] as const satisfies readonly StatusGeralTCC[];

export function AdminDashboardClient({ nome, dados, erro }: Props) {
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<"TODOS" | StatusGeralTCC>("TODOS");

  const tccsFiltrados = useMemo(() => {
    if (!dados) return [];
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    return dados.tccs.filter((tcc) => {
      const correspondeStatus = status === "TODOS" || tcc.statusGeral === status;
      const correspondeBusca = !termo || [tcc.titulo, tcc.alunoNome, tcc.orientadorNome]
        .some((valor) => valor.toLocaleLowerCase("pt-BR").includes(termo));
      return correspondeStatus && correspondeBusca;
    });
  }, [dados, busca, status]);

  return (
    <div className="w-full space-y-8">
      <header className="border-b border-[#dfe2e8] pb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#1e78f0]">Administração do sistema</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#111a2e] sm:text-3xl">Dashboard do Administrador</h1>
        <p className="mt-1 text-sm text-[#6b7385]">Visão geral dos usuários e trabalhos acadêmicos — Olá, {nome}</p>
      </header>

      {erro && (
        <div role="alert" className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="flex-1">{erro}</div>
          <button type="button" onClick={() => window.location.reload()} className="font-semibold underline">Tentar novamente</button>
        </div>
      )}

      {dados ? (
        <>
          <section aria-labelledby="usuarios-heading" className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 id="usuarios-heading" className="text-base font-bold text-[#111a2e]">Usuários cadastrados</h2>
                <p className="text-xs text-[#6b7385]">{dados.totalUsuarios} contas registradas no sistema</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {PERFIS.map(([perfil, rotulo], index) => (
                <StatCard
                  key={perfil}
                  label={rotulo}
                  value={dados.usuarios[perfil]}
                  variant={["blue", "green", "yellow", "neutral", "red"][index] as "blue" | "green" | "yellow" | "neutral" | "red"}
                  className="p-4"
                />
              ))}
            </div>
          </section>

          <section aria-labelledby="tcc-overview-heading" className="space-y-3">
            <div>
              <h2 id="tcc-overview-heading" className="text-base font-bold text-[#111a2e]">Trabalhos de conclusão</h2>
              <p className="text-xs text-[#6b7385]">Distribuição dos TCCs registrados por situação atual</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <StatCard label="Total de TCCs" value={dados.totalTccs} variant="blue" icon={<GraduationCap className="h-5 w-5" />} className="p-4" />
              {STATUS.map((item, index) => (
                <StatCard
                  key={item}
                  label={ROTULO_STATUS_TCC[item]}
                  value={dados.tccsPorStatus[item]}
                  variant={["yellow", "neutral", "blue", "green", "red"][index] as "blue" | "green" | "yellow" | "neutral" | "red"}
                  className="p-4"
                />
              ))}
            </div>
          </section>

          <section aria-label="Vínculos e entregas" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Alunos com TCC" value={dados.alunosComTcc} variant="neutral" icon={<Users className="h-5 w-5" />} className="p-5" />
            <StatCard label="Orientadores com TCC" value={dados.orientadoresAtivos} variant="green" icon={<BookOpen className="h-5 w-5" />} className="p-5" />
            <StatCard label="Entregas aguardando envio" value={dados.entregasPendentes} variant="yellow" className="p-5" />
            <StatCard label="Entregas atrasadas" value={dados.entregasAtrasadas} variant="red" icon={<AlertTriangle className="h-5 w-5" />} className="p-5" />
          </section>

          <section aria-labelledby="tcc-list-heading" className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 id="tcc-list-heading" className="text-base font-bold text-[#111a2e]">TCCs registrados</h2>
                <p className="text-xs text-[#6b7385]">Consulte os vínculos de alunos e orientadores</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <label className="relative block sm:w-72">
                  <span className="sr-only">Buscar TCC, aluno ou orientador</span>
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#6b7385]" />
                  <input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar TCC, aluno ou orientador..." className="w-full rounded-full border border-[#dfe2e8] bg-[#f4f5f7] py-2 pl-9 pr-3 text-xs text-[#111a2e] focus:border-[#1e78f0] focus:bg-white focus:outline-none" />
                </label>
                <label>
                  <span className="sr-only">Filtrar por status</span>
                  <select value={status} onChange={(event) => setStatus(event.target.value as "TODOS" | StatusGeralTCC)} className="w-full rounded-full border border-[#dfe2e8] bg-white px-3 py-2 text-xs text-[#111a2e] focus:border-[#1e78f0] focus:outline-none sm:w-48">
                    <option value="TODOS">Todos os status</option>
                    {STATUS.map((item) => <option key={item} value={item}>{ROTULO_STATUS_TCC[item]}</option>)}
                  </select>
                </label>
              </div>
            </div>

            <div className="overflow-hidden rounded-[10px] border border-[#dfe2e8] bg-white shadow-xs">
              <div className="hidden grid-cols-[1fr_1.5fr_1fr_150px_40px] gap-4 border-b border-[#dfe2e8] bg-[#f4f5f7] px-5 py-3 text-xs font-semibold text-[#6b7385] md:grid">
                <span>Aluno</span><span>Tema / Projeto</span><span>Orientador</span><span>Status</span><span />
              </div>
              {tccsFiltrados.length === 0 ? (
                <div className="p-10 text-center text-sm text-[#6b7385]">
                  {dados.totalTccs === 0 ? "Ainda não há TCCs registrados." : "Nenhum TCC corresponde aos filtros selecionados."}
                </div>
              ) : (
                <ul className="divide-y divide-[#dfe2e8]">
                  {tccsFiltrados.map((tcc) => (
                    <li key={tcc.id}>
                      <Link href={`/dashboard/tcc/${tcc.id}`} className="group block p-4 transition-colors hover:bg-[#f4f5f7] sm:px-5 md:grid md:grid-cols-[1fr_1.5fr_1fr_150px_40px] md:items-center md:gap-4">
                        <div className="min-w-0"><b className="block truncate text-sm font-semibold text-[#111a2e] group-hover:text-[#1e78f0]">{tcc.alunoNome}</b><small className="text-xs text-[#6b7385]">Matrícula: {tcc.aluno_id}</small></div>
                        <p className="mt-2 line-clamp-2 text-xs font-medium text-[#111a2e] md:mt-0">{tcc.titulo}</p>
                        <p className="mt-1 truncate text-xs text-[#111a2e] md:mt-0">{tcc.orientadorNome}</p>
                        <div className="mt-2 md:mt-0"><StatusPill status={ROTULO_STATUS_TCC[tcc.statusGeral] ?? tcc.statusGeral} /></div>
                        <span className="sr-only">Abrir detalhes do TCC</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <aside className="flex gap-3 rounded-lg border border-[#dfe2e8] bg-[#f4f5f7] p-4 text-sm text-[#6b7385]">
            <Info className="h-5 w-5 shrink-0 text-[#1e78f0]" />
            <p><b className="text-[#111a2e]">Operações administrativas</b><br />O painel apresenta dados de consulta. Provisionamento de contas, alteração de perfis e outras operações ainda dependem de um fluxo institucional autorizado.</p>
          </aside>
        </>
      ) : !erro ? (
        <div className="h-64 animate-pulse rounded-xl bg-[#f4f5f7]" aria-label="Carregando dados" />
      ) : null}
    </div>
  );
}
