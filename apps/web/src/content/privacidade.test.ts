import { describe, expect, it } from "vitest";
import { PRIVACIDADE } from "./privacidade";

const texto = [
  PRIVACIDADE.introducao,
  ...PRIVACIDADE.secoes.flatMap((s) => [s.titulo, ...(s.paragrafos ?? []), ...(s.itens ?? [])]),
].join("\n");

describe("Política de Privacidade descreve só o que o sistema faz hoje", () => {
  it("não fala de sessão, autenticação nem credenciais (o login é uma tela sem envio)", () => {
    expect(texto).not.toMatch(/sess[ãa]o|autentic|credenciais|áreas restritas|identificação de usuário/i);
  });

  it("explica que o login não coleta nem guarda nada", () => {
    expect(texto).toMatch(/login[^.]*não envia nem guarda/i);
  });

  it("informa o tratamento técnico do IP para limitar abusos, sem gravar em banco", () => {
    expect(texto).toMatch(/endereço IP/);
    expect(texto).toMatch(/limitar abusos/);
    expect(texto).toMatch(/não é gravado em banco de dados/);
  });

  it("mantém o formulário via WhatsApp, a preferência de tema e os canais de contato", () => {
    expect(texto).toMatch(/WhatsApp da FAPERON/);
    expect(texto).toMatch(/Preferência de tema/);
    expect(texto).toMatch(/\(69\) 3214-8371/);
    expect(texto).toMatch(/\(69\) 3224-7620/);
  });

  it("tem a data da revisão atual", () => {
    expect(PRIVACIDADE.atualizadoEm).toBe("2026-10-17");
  });

  it("descreve o Zétele: o que guarda, por quanto tempo, sem IP, e o envio à Anthropic", () => {
    expect(texto).toMatch(/Zétele/);
    expect(texto).toMatch(/90 dias/);
    expect(texto).toMatch(/não guardamos seu endereço IP/i);
    expect(texto).toMatch(/Anthropic/);
    expect(texto).toMatch(/art\. 33 da LGPD/);
  });

  it("nomeia o encarregado de dados", () => {
    expect(texto).toMatch(/Weslley Hariel Lima e Silva Palomeque Gonçalves/);
    expect(texto).toMatch(/weslley\.palomeque@dataro-it\.com\.br/);
  });
});
