import { describe, it, expect } from "vitest";
import {
  validarSenhaSegura,
  validarEmail,
  gerarMatriculaAluno,
  gerarMatriculaProfessorOuCoordenador,
  gerarTokenConvite,
} from "./cadastro-tokens";

describe("Regras de Cadastro e Segurança (cadastro-tokens)", () => {
  it("valida senha segura atendendo a todos os critérios (8-32 chars, maiúscula, minúscula, número e símbolo)", () => {
    // Senha válida
    const valida = validarSenhaSegura("Sgtcc@2026");
    expect(valida.valida).toBe(true);
    expect(valida.erros).toHaveLength(0);

    // Menos de 8 caracteres
    expect(validarSenhaSegura("Sg@1").valida).toBe(false);

    // Mais de 32 caracteres (overflow)
    expect(validarSenhaSegura("Sgtcc@2026" + "a".repeat(25)).valida).toBe(false);

    // Sem maiúscula
    expect(validarSenhaSegura("sgtcc@2026").valida).toBe(false);

    // Sem minúscula
    expect(validarSenhaSegura("SGTCC@2026").valida).toBe(false);

    // Sem número
    expect(validarSenhaSegura("Sgtcc@Teste").valida).toBe(false);

    // Sem símbolo
    expect(validarSenhaSegura("Sgtcc2026a").valida).toBe(false);
  });

  it("valida emails institucionais corretamente", () => {
    expect(validarEmail("aluno@uvv.br")).toBe(true);
    expect(validarEmail("professor.orientador@instituicao.edu.br")).toBe(true);
    expect(validarEmail("invalido")).toBe(false);
    expect(validarEmail("semdominio@")).toBe(false);
    expect(validarEmail("semarroba.com")).toBe(false);
  });

  it("gera matrícula de aluno com exatamente 9 números no formato (ano + 5 dígitos)", () => {
    const anoAtual = new Date().getFullYear();
    const matricula = gerarMatriculaAluno(anoAtual);

    expect(matricula).toHaveLength(9);
    expect(matricula.startsWith(anoAtual.toString())).toBe(true);
    expect(/^\d{9}$/.test(matricula)).toBe(true);
  });

  it("gera matrícula de coordenador ou professor com exatamente 5 dígitos", () => {
    const matricula = gerarMatriculaProfessorOuCoordenador();

    expect(matricula).toHaveLength(5);
    expect(/^\d{5}$/.test(matricula)).toBe(true);
  });

  it("gera token de convite seguro com 32 caracteres", () => {
    const token = gerarTokenConvite();
    expect(token).toHaveLength(32);
    expect(/^[a-f0-9]{32}$/.test(token)).toBe(true);
  });
});
