import { describe, expect, it } from "vitest";
import { credenciaisValidas } from "./acesso";

describe("login do protótipo", () => {
  it("aceita user@faperon.br com Senha@123 (e-mail sem diferença de caixa)", async () => {
    expect(await credenciaisValidas("user@faperon.br", "Senha@123")).toBe(true);
    expect(await credenciaisValidas(" USER@faperon.br ", "Senha@123")).toBe(true);
  });

  it("recusa senha ou e-mail errados", async () => {
    expect(await credenciaisValidas("user@faperon.br", "senha@123")).toBe(false);
    expect(await credenciaisValidas("outro@faperon.br", "Senha@123")).toBe(false);
    expect(await credenciaisValidas("", "")).toBe(false);
  });
});
