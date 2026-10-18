import { describe, expect, it } from "vitest";
import { SINDICATOS } from "@/content/sindicatos";
import { filtrarSindicatos, telefoneHref } from "./sindicatos";

describe("filtrarSindicatos", () => {
  it("devolve todos sem busca e filtra por município sem diferenciar acento", () => {
    expect(filtrarSindicatos(SINDICATOS, "  ")).toHaveLength(SINDICATOS.length);
    expect(filtrarSindicatos(SINDICATOS, "ji-parana").map((s) => s.nome)).toEqual(["Ji-Paraná"]);
  });

  it("filtra também pelo presidente", () => {
    expect(filtrarSindicatos(SINDICATOS, "damasceno").map((s) => s.nome)).toEqual(["Alta Floresta D'Oeste"]);
  });

  it("devolve vazio quando nada combina", () => {
    expect(filtrarSindicatos(SINDICATOS, "xyz")).toEqual([]);
  });
});

describe("telefoneHref", () => {
  it("monta o tel: com o DDI do Brasil", () => {
    expect(telefoneHref("(69) 98431-1001")).toBe("tel:+5569984311001");
  });
});

describe("cadastro de sindicatos no mapa", () => {
  it("tem coordenadas dentro de Rondônia e foto existente no formato esperado", () => {
    for (const s of SINDICATOS) {
      expect(s.lat, s.nome).toBeGreaterThan(-13.8);
      expect(s.lat, s.nome).toBeLessThan(-7.9);
      expect(s.lng, s.nome).toBeGreaterThan(-66.9);
      expect(s.lng, s.nome).toBeLessThan(-59.7);
      if (s.foto) expect(s.foto, s.nome).toMatch(/^\/sindicatos\/[a-z0-9-]+\.webp$/);
    }
  });
});
