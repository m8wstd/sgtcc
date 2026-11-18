/**
 * Utilitários para gestão e formatação de semestres acadêmicos.
 * Padrão canônico de formatação: "YYYY.S" (ex: "2026.2", "2026.1", "2025.2")
 * Também suporta leitura de "YYYY/S".
 */

export function semestreAtual(data: Date = new Date()): string {
  const ano = data.getFullYear();
  const mes = data.getMonth() + 1; // 1 a 12
  const periodo = mes <= 6 ? 1 : 2;
  return `${ano}.${periodo}`;
}

export function normalizarSemestre(s?: string | null): string {
  if (!s) return "";
  return s.trim().replace("/", ".");
}

export function formatarSemestre(s: string): string {
  const norm = normalizarSemestre(s);
  if (!norm) return "";
  // Retorna formato visual amigável: "2026.2" ou "2026/2"
  return norm;
}

export function compararSemestres(a: string, b: string): number {
  const normA = normalizarSemestre(a);
  const normB = normalizarSemestre(b);
  return normB.localeCompare(normA, undefined, { numeric: true });
}

/**
 * Tenta derivar o semestre a partir de uma data ou de campos do TCC se não estiver explícito.
 */
export function derivarSemestreTcc(tcc: { semestre?: string; defesaEm?: Date | string; criadoEm?: Date | string }): string {
  if (tcc.semestre) return normalizarSemestre(tcc.semestre);
  if (tcc.defesaEm) {
    return semestreAtual(new Date(tcc.defesaEm));
  }
  if (tcc.criadoEm) {
    return semestreAtual(new Date(tcc.criadoEm));
  }
  return semestreAtual();
}
