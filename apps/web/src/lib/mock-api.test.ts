import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PRODUTOS_EM_DESTAQUE } from "@/content/painel";

// O mock não é importável (sobe um servidor); este teste só trava a divergência com a API real.
const fonte = readFileSync(join(process.cwd(), "scripts", "mock-api.mjs"), "utf8");

describe("mock da API acompanha o contrato real", () => {
  it("usa as unidades que a ingestão grava (Mil Reais, Quilogramas por Hectare)", () => {
    expect(fonte).toContain('unidade: "Mil Reais"');
    expect(fonte).toContain('unidade: "Quilogramas por Hectare"');
    expect(fonte).not.toContain('unidade: "Mil reais"');
    expect(fonte).not.toContain('unidade: "Quilogramas por hectare"');
  });

  it("tem no catálogo todos os atalhos de agricultura do Painel que existem na PAM", () => {
    expect(PRODUTOS_EM_DESTAQUE.agricultura).toContain("cafe-em-grao-total");
    expect(fonte).toContain('slug: "cafe-em-grao-total"');
  });

  it("usa o status de carga real (sucesso)", () => {
    expect(fonte).toContain('status: "sucesso"');
    expect(fonte).not.toContain('status: "concluida"');
  });
});
