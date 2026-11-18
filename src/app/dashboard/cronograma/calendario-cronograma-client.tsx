"use client";

import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, CheckCircle2 } from "lucide-react";
import type { EventoCronograma } from "@/app/api/cronograma/route";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function CalendarioCronogramaClient() {
  const [dataAtual, setDataAtual] = useState(() => new Date(2026, 9, 1)); // Outubro 2026 como base do semestre letivo do SGTCC
  const [eventos, setEventos] = useState<EventoCronograma[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [diaSelecionado, setDiaSelecionado] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/cronograma")
      .then((res) => (res.ok ? res.json() : { eventos: [] }))
      .then((data) => {
        if (Array.isArray(data.eventos)) {
          setEventos(data.eventos);
        }
      })
      .catch(() => {})
      .finally(() => setCarregando(false));
  }, []);

  const ano = dataAtual.getFullYear();
  const mes = dataAtual.getMonth();

  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
  const totalDiasMes = new Date(ano, mes + 1, 0).getDate();

  const mesAnterior = () => {
    setDataAtual(new Date(ano, mes - 1, 1));
    setDiaSelecionado(null);
  };

  const proximoMes = () => {
    setDataAtual(new Date(ano, mes + 1, 1));
    setDiaSelecionado(null);
  };

  // Mapeia eventos que caem no mês atual
  const prefixoMes = `${ano}-${String(mes + 1).padStart(2, "0")}`;
  const eventosDoMes = eventos.filter((e) => e.data.startsWith(prefixoMes));

  // Mapeia eventos por dia
  const eventosPorDia = new Map<number, EventoCronograma[]>();
  for (const ev of eventosDoMes) {
    const diaNum = parseInt(ev.data.split("-")[2], 10);
    const lista = eventosPorDia.get(diaNum) ?? [];
    lista.push(ev);
    eventosPorDia.set(diaNum, lista);
  }

  const hoje = new Date();
  const ehMesAtual = hoje.getFullYear() === ano && hoje.getMonth() === mes;
  const diaHoje = ehMesAtual ? hoje.getDate() : -1;

  // Eventos do dia selecionado ou todos os eventos futuros do mês
  const eventosExibidos = diaSelecionado
    ? eventosDoMes.filter((e) => parseInt(e.data.split("-")[2], 10) === diaSelecionado)
    : eventosDoMes;

  return (
    <div className="space-y-6 w-full">
      {/* Cabeçalho da Página com o mesmo padrão do Painel do Aluno / Orientador */}
      <div className="border-b border-[#dfe2e8] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111a2e]">
            Cronograma e Calendário
          </h1>
          <p className="text-sm text-[#6b7385] mt-1">
            Acompanhe os prazos institucionais, entregas de etapas e defesas do TCC.
          </p>
        </div>

        {/* Navegação de Mês */}
        <div className="flex items-center gap-1.5 bg-[#f4f5f7] p-1.5 rounded-xl border border-[#dfe2e8] shrink-0 self-start sm:self-center shadow-2xs">
          <button
            type="button"
            onClick={mesAnterior}
            className="p-1.5 rounded-lg hover:bg-white text-[#111a2e] transition-colors cursor-pointer"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-[#111a2e] px-3 min-w-[140px] text-center select-none">
            {MESES[mes]} de {ano}
          </span>
          <button
            type="button"
            onClick={proximoMes}
            className="p-1.5 rounded-lg hover:bg-white text-[#111a2e] transition-colors cursor-pointer"
            aria-label="Próximo mês"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid do Calendário (Estilo visual conforme docs/prototipo.html com largura fluida) */}
      <div className="bg-white border border-[#dfe2e8] rounded-2xl p-4 sm:p-6 shadow-xs space-y-3">
        {/* Cabeçalho dos dias da semana */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-3">
          {DIAS_SEMANA.map((dia) => (
            <div
              key={dia}
              className="text-center text-xs font-semibold text-[#6b7385] py-1.5 select-none"
            >
              {dia}
            </div>
          ))}
        </div>

        {/* Células de dias */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-3">
          {/* Espaços vazios do início */}
          {Array.from({ length: primeiroDiaSemana }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[58px] sm:min-h-[72px]" />
          ))}

          {/* Dias do mês */}
          {Array.from({ length: totalDiasMes }, (_, i) => i + 1).map((dia) => {
            const evsDoDia = eventosPorDia.get(dia) ?? [];
            const temEvento = evsDoDia.length > 0;
            const temEntrega = evsDoDia.some((e) => e.tipo !== "DEFESA");
            const temDefesa = evsDoDia.some((e) => e.tipo === "DEFESA");
            const isHoje = dia === diaHoje;
            const isSelecionado = dia === diaSelecionado;

            // Determina a cor ou divisão no meio (gradiente bicolor split)
            let backgroundEstilo: React.CSSProperties | undefined = undefined;
            let bordaClasse = "border-[#dfe2e8]";

            if (temEntrega && temDefesa) {
              // Dividido no meio: 50% azul (entrega) e 50% roxo (defesa)
              backgroundEstilo = {
                background: "linear-gradient(135deg, rgba(142, 197, 255, 0.35) 50%, rgba(216, 180, 254, 0.45) 50%)",
              };
              bordaClasse = "border-[#a5b4fc]";
            } else if (temDefesa) {
              backgroundEstilo = {
                backgroundColor: "rgba(216, 180, 254, 0.30)", // roxo suave
              };
              bordaClasse = "border-[#c084fc]";
            } else if (temEntrega) {
              backgroundEstilo = {
                backgroundColor: "rgba(142, 197, 255, 0.30)", // azul suave
              };
              bordaClasse = "border-[#93c5fd]";
            }

            return (
              <button
                key={`dia-${dia}`}
                type="button"
                onClick={() => setDiaSelecionado(dia === diaSelecionado ? null : dia)}
                style={backgroundEstilo}
                className={`relative min-h-[58px] sm:min-h-[72px] p-2 sm:p-2.5 rounded-xl border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between overflow-hidden ${
                  isSelecionado
                    ? "border-[#1e78f0] ring-2 ring-blue-200 shadow-xs"
                    : temEvento
                    ? `${bordaClasse} hover:opacity-90 text-[#111a2e]`
                    : "border-[#dfe2e8] hover:border-[#1e78f0]/60 bg-white"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-xs font-bold ${
                      isHoje
                        ? "w-6 h-6 rounded-full bg-[#1e78f0] text-white flex items-center justify-center -ml-0.5 -mt-0.5 shadow-xs"
                        : "text-[#111a2e]"
                    }`}
                  >
                    {dia}
                  </span>

                  {temEvento && evsDoDia.length > 1 && (
                    <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-white/90 text-[#111a2e] border border-[#dfe2e8] shadow-2xs">
                      {evsDoDia.length}
                    </span>
                  )}
                </div>

                {temEvento && (
                  <div className="flex items-center gap-1.5 mt-auto">
                    {temEntrega && temDefesa ? (
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-[#2563eb] shrink-0" title="Entrega de Etapa" />
                        <span className="w-2 h-2 rounded-full bg-[#9333ea] shrink-0" title="Banca / Defesa" />
                        <span className="text-[10px] font-bold text-[#1e1b4b] truncate hidden sm:inline">
                          Misto
                        </span>
                      </div>
                    ) : temDefesa ? (
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-[#9333ea] shrink-0" />
                        <span className="text-[10px] font-bold text-[#6b21a8] truncate hidden sm:inline">
                          Defesa
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-[#2563eb] shrink-0" />
                        <span className="text-[10px] font-bold text-[#1e40af] truncate hidden sm:inline">
                          Entrega
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Seção Próximos Eventos / Prazos (Conforme prototipo.html) */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#111a2e] flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-[#1e78f0]" />
            {diaSelecionado
              ? `Eventos em ${String(diaSelecionado).padStart(2, "0")}/${String(mes + 1).padStart(2, "0")}/${ano}`
              : `Prazos e Eventos de ${MESES[mes]}`}
          </h2>
          {diaSelecionado && (
            <button
              type="button"
              onClick={() => setDiaSelecionado(null)}
              className="text-xs text-[#1e78f0] font-semibold hover:underline cursor-pointer"
            >
              Ver todos do mês
            </button>
          )}
        </div>

        {carregando ? (
          <div className="p-8 text-center text-xs text-[#6b7385] bg-white border border-[#dfe2e8] rounded-2xl">
            Carregando eventos...
          </div>
        ) : eventosExibidos.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#6b7385] bg-white border border-[#dfe2e8] rounded-2xl">
            Nenhum evento ou prazo registrado para este período.
          </div>
        ) : (
          <div className="divide-y divide-[#dfe2e8] bg-white border border-[#dfe2e8] rounded-2xl overflow-hidden shadow-xs">
            {eventosExibidos.map((ev) => {
              const [, m, d] = ev.data.split("-");
              return (
                <div
                  key={ev.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-4.5 gap-3 hover:bg-[#f4f5f7] transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    {/* Badge da data estilo prototipo: <b style="background:var(--y)">dd/mm</b> */}
                    <div className="px-2.5 py-1 rounded-lg bg-[#ffd84d] text-[#111a2e] font-bold text-xs shrink-0 shadow-2xs">
                      {d}/{m}
                    </div>

                    <div className="space-y-0.5">
                      <p className="text-xs sm:text-sm font-bold text-[#111a2e]">
                        {ev.titulo}
                      </p>
                      {ev.descricao && (
                        <p className="text-xs text-[#6b7385] leading-relaxed">
                          {ev.descricao}
                        </p>
                      )}
                      {ev.tccTitulo && (
                        <p className="text-[11px] font-medium text-[#1e78f0]">
                          TCC: {ev.tccTitulo}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto pl-11 sm:pl-0">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        ev.tipo === "DEFESA"
                          ? "bg-purple-100 text-purple-800 border border-purple-200"
                          : "bg-blue-50 text-blue-800 border border-blue-200"
                      }`}
                    >
                      {ev.tipo === "DEFESA" ? "Banca / Defesa" : "Entrega de Etapa"}
                    </span>
                    {ev.responsavel && (
                      <span className="text-[11px] text-[#6b7385] hidden md:inline">
                        • {ev.responsavel}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
