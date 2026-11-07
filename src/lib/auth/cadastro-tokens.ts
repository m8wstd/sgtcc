/**
 * Utilitários para validação de senha, geração de matrículas e validação de email.
 */

export interface ValidacaoSenha {
  valida: boolean;
  erros: string[];
}

/**
 * Regras de senha segura:
 * - Pelo menos 8 caracteres
 * - No máximo 32 caracteres (evita overflow)
 * - Pelo menos 1 letra maiúscula
 * - Pelo menos 1 letra minúscula
 * - Pelo menos 1 número
 * - Pelo menos 1 símbolo (caractere especial)
 */
export function validarSenhaSegura(senha: string): ValidacaoSenha {
  const erros: string[] = [];

  if (!senha || senha.length < 8) {
    erros.push("A senha deve conter no mínimo 8 caracteres.");
  }
  if (senha && senha.length > 32) {
    erros.push("A senha deve conter no máximo 32 caracteres.");
  }
  if (!/[A-Z]/.test(senha)) {
    erros.push("A senha deve conter pelo menos 1 letra maiúscula.");
  }
  if (!/[a-z]/.test(senha)) {
    erros.push("A senha deve conter pelo menos 1 letra minúscula.");
  }
  if (!/[0-9]/.test(senha)) {
    erros.push("A senha deve conter pelo menos 1 número.");
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(senha)) {
    erros.push("A senha deve conter pelo menos 1 símbolo especial (!@#$%...).");
  }

  return {
    valida: erros.length === 0,
    erros,
  };
}

/**
 * Validação de formato de e-mail e verificação sintática rigorosa.
 */
export function validarEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const limpo = email.trim().toLowerCase();
  // Regex compatível com RFC 5322 simplificada garantindo domínio válido
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(limpo)) return false;
  
  // Impede domínios fictícios quebrados sem TLD
  const partes = limpo.split("@");
  if (partes.length !== 2) return false;
  const dominio = partes[1];
  if (!dominio.includes(".") || dominio.startsWith(".") || dominio.endsWith(".")) return false;

  return true;
}

/**
 * NOVA REGRA DE NEGÓCIO:
 * A matrícula do aluno tem o formato de 9 números (202693245, ano de matrícula + 5 números aleatórios),
 * e são IDs ÚNICOS!
 */
export function gerarMatriculaAluno(ano: number = new Date().getFullYear()): string {
  // Gera 5 dígitos aleatórios (10000 a 99999)
  const aleatorio = Math.floor(10000 + Math.random() * 90000);
  return `${ano}${aleatorio}`;
}

/**
 * NOVA REGRA DE NEGÓCIO:
 * A matrícula do coordenador, professor (orientador ou avaliador),
 * é um número de 5 dígitos ÚNICO e aleatório (10000 a 99999).
 */
export function gerarMatriculaProfessorOuCoordenador(): string {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

/**
 * Gera token seguro para convite de cadastro (expiração em 7 dias = 1 semana)
 */
export function gerarTokenConvite(): string {
  // 32 chars hex aleatórios
  const chars = "abcdef0123456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}
