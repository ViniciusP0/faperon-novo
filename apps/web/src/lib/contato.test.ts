import { describe, expect, it } from "vitest";
import { linkWhatsApp, montarMensagem, type DadosContato } from "./contato";

const dados: DadosContato = {
  primeiroNome: "José",
  ultimoNome: "Ávila",
  email: "jose@exemplo.com",
  telefone: "(69) 99999-0000",
  mensagem: "Olá & tudo? Preciso de ajuda.\nSegunda linha.",
};

describe("contato via WhatsApp", () => {
  it("gera um link para o número oficial com a mensagem codificada", () => {
    const url = linkWhatsApp("556932247620", dados);
    expect(url).toMatch(/^https:\/\/wa\.me\/556932247620\?text=/);
  });

  it("preserva nome, e-mail, telefone e mensagem com acentos, & , ? e quebras de linha", () => {
    const url = linkWhatsApp("556932247620", dados);
    const texto = decodeURIComponent(url.split("?text=")[1]!);
    expect(texto).toContain("Nome: José Ávila");
    expect(texto).toContain("E-mail: jose@exemplo.com");
    expect(texto).toContain("Telefone: (69) 99999-0000");
    expect(texto).toContain("Olá & tudo? Preciso de ajuda.\nSegunda linha.");
  });

  it("sem último nome, não deixa espaço solto no fim do nome", () => {
    const texto = montarMensagem({ ...dados, ultimoNome: "" });
    expect(texto).toContain("Nome: José");
    expect(texto).not.toContain("Nome: José \n");
  });
});
