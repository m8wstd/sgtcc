import { describe, expect, it } from "vitest";
import { Timestamp } from "firebase-admin/firestore";
import { serializar, statusEfetivo } from "@/lib/data/queries";
import { destinoSeguro, homeDoPerfil } from "@/lib/auth/perfis";
import { PerfilEnum } from "@/types";

describe("statusEfetivo", () => {
  const passado = { dataLimite: "2020-01-01T00:00:00.000Z" };
  const futuro = { dataLimite: "2999-01-01T00:00:00.000Z" };

  it("sem entrega e prazo vencido → ATRASADA", () => {
    expect(statusEfetivo(passado, null)).toBe("ATRASADA");
  });
  it("sem entrega e prazo futuro → AGUARDANDO_ENVIO", () => {
    expect(statusEfetivo(futuro, null)).toBe("AGUARDANDO_ENVIO");
  });
  it("entrega já enviada mantém o status mesmo após o prazo", () => {
    expect(statusEfetivo(passado, { status: "EM_REVISAO" })).toBe("EM_REVISAO");
  });
});

describe("serializar", () => {
  it("converte Timestamp em ISO, inclusive aninhado", () => {
    const ts = Timestamp.fromDate(new Date("2026-11-10T12:00:00Z"));
    expect(serializar({ a: ts, b: [{ c: ts }], d: "x" })).toEqual({
      a: "2026-11-10T12:00:00.000Z",
      b: [{ c: "2026-11-10T12:00:00.000Z" }],
      d: "x",
    });
  });
});

describe("perfis", () => {
  it("cada perfil tem home dentro de /dashboard", () => {
    for (const p of Object.values(PerfilEnum)) expect(homeDoPerfil(p)).toMatch(/^\/dashboard\//);
  });
  it("direciona ADMIN ao dashboard exclusivo e preserva a home da Coordenação", () => {
    expect(homeDoPerfil(PerfilEnum.ADMIN)).toBe("/dashboard/admin");
    expect(homeDoPerfil(PerfilEnum.COORDENACAO)).toBe("/dashboard/coordenacao");
  });
  it("destinoSeguro só aceita caminhos internos do dashboard", () => {
    expect(destinoSeguro("/dashboard/tcc/abc")).toBe("/dashboard/tcc/abc");
    expect(destinoSeguro("https://evil.com")).toBeNull();
    expect(destinoSeguro("//evil.com")).toBeNull();
    expect(destinoSeguro("/outra")).toBeNull();
    expect(destinoSeguro(undefined)).toBeNull();
  });
});
