import { describe, expect, it } from "vitest";
import {
  TAMANHO_MAXIMO_BYTES,
  caminhoStorage,
  conteudoCondizComExtensao,
  extensaoDe,
  nomeExibicaoDoArquivo,
  podeSubmeter,
  sanitizarNomeArquivo,
  validarMetadadosArquivo,
} from "@/lib/entregas/regras";

const DIA = 24 * 60 * 60 * 1000;
const agora = new Date("2026-11-06T12:00:00Z").getTime();

describe("validação de arquivo (US03)", () => {
  it("aceita .pdf e .docx, sem diferenciar maiúsculas", () => {
    expect(extensaoDe("Capitulo1.PDF")).toBe(".pdf");
    expect(extensaoDe("rascunho.docx")).toBe(".docx");
  });

  it("recusa outras extensões e nomes sem extensão", () => {
    for (const nome of ["a.doc", "a.exe", "a.pdf.exe", "semextensao", "a.zip"]) {
      const r = validarMetadadosArquivo(nome, 1000);
      expect(r.ok, nome).toBe(false);
    }
  });

  it("recusa arquivo vazio e acima de 10 MB (413)", () => {
    expect(validarMetadadosArquivo("a.pdf", 0).ok).toBe(false);
    const grande = validarMetadadosArquivo("a.pdf", TAMANHO_MAXIMO_BYTES + 1);
    expect(grande).toMatchObject({ ok: false, status: 413 });
    expect(validarMetadadosArquivo("a.pdf", TAMANHO_MAXIMO_BYTES).ok).toBe(true);
  });

  it("devolve content-type e nome seguro", () => {
    expect(validarMetadadosArquivo("Capítulo 1 (final).pdf", 10)).toMatchObject({
      ok: true,
      contentType: "application/pdf",
      nomeSeguro: "Capitulo_1_final.pdf",
    });
  });

  it("sanitiza caminhos, acentos e nomes vazios", () => {
    expect(sanitizarNomeArquivo("../../etc/passwd.pdf", ".pdf")).toBe("passwd.pdf");
    expect(sanitizarNomeArquivo("C:\\docs\\Monografia Ação.docx", ".docx")).toBe("Monografia_Acao.docx");
    expect(sanitizarNomeArquivo("...pdf", ".pdf")).toBe("arquivo.pdf");
    expect(sanitizarNomeArquivo(`${"a".repeat(200)}.pdf`, ".pdf").length).toBeLessThanOrEqual(84);
  });
});

describe("conteúdo do arquivo", () => {
  it("reconhece PDF e DOCX pelos bytes iniciais", () => {
    expect(conteudoCondizComExtensao(".pdf", Buffer.from("%PDF-1.7\n..."))).toBe(true);
    expect(conteudoCondizComExtensao(".docx", Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14]))).toBe(true);
  });

  it("recusa arquivo renomeado", () => {
    expect(conteudoCondizComExtensao(".pdf", Buffer.from("MZ executavel"))).toBe(false);
    expect(conteudoCondizComExtensao(".docx", Buffer.from("%PDF-1.7"))).toBe(false);
    expect(conteudoCondizComExtensao(".docx", Buffer.from([0x50, 0x4b]))).toBe(false);
  });
});

describe("caminho e nome de exibição", () => {
  it("segue o padrão do seed e volta ao nome original", () => {
    const caminho = caminhoStorage("tcc-1", "entrega-1", 3, "capitulo1.pdf");
    expect(caminho).toBe("tccs/tcc-1/entregas/entrega-1/v3_capitulo1.pdf");
    expect(nomeExibicaoDoArquivo(caminho)).toBe("capitulo1.pdf");
  });
});

describe("quem pode enviar (prazo e entrega concluída)", () => {
  const aberto = { dataLimite: new Date(agora + DIA).toISOString() };
  const vencido = { dataLimite: new Date(agora - DIA).toISOString() };

  it("aceita dentro do prazo", () => {
    expect(podeSubmeter(aberto, null, agora)).toEqual({ ok: true, emAtraso: false });
  });

  it("depois do prazo: aceita com aviso de atraso, exceto se o marco bloqueia", () => {
    expect(podeSubmeter(vencido, null, agora)).toEqual({ ok: true, emAtraso: true });
    expect(podeSubmeter({ ...vencido, bloqueioEstrito: true }, null, agora)).toMatchObject({
      ok: false,
      status: 403,
      codigo: "DEADLINE_PASSED",
    });
  });

  it("não aceita arquivo em entrega já concluída (RN02)", () => {
    expect(podeSubmeter(aberto, { status: "CONCLUIDA" }, agora)).toMatchObject({
      ok: false,
      status: 409,
      codigo: "DELIVERY_CLOSED",
    });
  });

  it("aceita nova versão quando o orientador pediu correção", () => {
    expect(podeSubmeter(aberto, { status: "SOLICITADA_CORRECAO" }, agora).ok).toBe(true);
  });
});
