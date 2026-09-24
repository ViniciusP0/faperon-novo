import { describe, expect, it } from "vitest";
import type { Destaque } from "./api-types";
import { descreverDestaque, linkPainel, manchete, normalizarDestaque, textoVariacao } from "./destaques";

const meta = { fonte: "IBGE", tabela_sidra: 5457, url_fonte: "https://sidra.ibge.gov.br/Tabela/5457", atualizado_em: "2026-09-24T14:00:00Z" };

function item(parcial: Partial<Destaque> & Pick<Destaque, "chave">): Destaque {
  return {
    rotulo: parcial.chave,
    produto: { slug: parcial.chave, nome: parcial.chave, segmento: "agricultura" },
    indicador: { slug: "quantidade-produzida", nome: "Quantidade produzida", unidade: "Toneladas", agregacao: "soma" },
    ano_referencia: 2025,
    total: 2592885,
    serie: [
      { ano: 2024, valor: 100, status: "ok" },
      { ano: 2025, valor: 150, status: "ok" },
    ],
    variacao_percentual: 50,
    top: [],
    meta,
    ...parcial,
  };
}

describe("normalizarDestaque", () => {
  it("converte mil litros em litros sem alterar as outras unidades", () => {
    const leite = normalizarDestaque(
      item({
        chave: "leite",
        total: 619456,
        indicador: { slug: "producao-de-origem-animal", nome: "Produção", unidade: "Mil litros", agregacao: "soma" },
        serie: [{ ano: 2024, valor: 2, status: "ok" }, { ano: 2025, valor: null, status: "sigiloso" }],
        top: [{ municipio: { codigo_ibge: "1", nome: "A" }, valor: 3, percentual_total: 1 }],
      }),
    );
    expect(leite.indicador.unidade).toBe("Litros");
    expect(leite.total).toBe(619456000);
    expect(leite.serie.map((p) => p.valor)).toEqual([2000, null]);
    expect(leite.top[0]?.valor).toBe(3000);

    const soja = item({ chave: "soja" });
    expect(normalizarDestaque(soja)).toEqual(soja);
  });
});

describe("manchete", () => {
  const soja = item({ chave: "soja", total: 2592885 });
  const leite = normalizarDestaque(
    item({ chave: "leite", ano_referencia: 2024, total: 619456, indicador: { slug: "p", nome: "P", unidade: "Mil litros", agregacao: "soma" } }),
  );
  const bovino = item({ chave: "bovino", ano_referencia: 2024, total: 18221984, indicador: { slug: "efetivo", nome: "Efetivo", unidade: "Cabeças", agregacao: "soma" } });

  it("monta a frase com os três números e marca o ano quando difere do primeiro", () => {
    const partes = manchete([soja, leite, bovino]);
    expect(partes).not.toBeNull();
    const texto = partes!.map((p) => p.texto).join("").replaceAll(" ", " ");
    expect(texto).toBe(
      "Em 2025, Rondônia colheu 2,6 mi de toneladas de soja, produziu 619,5 mi de litros de leite (2024) e chegou a 18,2 mi de cabeças de gado (2024).",
    );
    expect(partes!.filter((p) => p.destaque).map((p) => p.texto.replaceAll(" ", " "))).toEqual([
      "2,6 mi de toneladas de soja",
      "619,5 mi de litros de leite",
      "18,2 mi de cabeças de gado",
    ]);
  });

  it("devolve null quando falta algum dos indicadores da frase", () => {
    expect(manchete([soja, leite])).toBeNull();
    expect(manchete([])).toBeNull();
  });
});

describe("textoVariacao", () => {
  it("usa sinal e vírgula decimal e cobre o caso sem variação", () => {
    expect(textoVariacao(item({ chave: "soja", variacao_percentual: 197.4 }))).toBe("+197% desde 2024");
    expect(textoVariacao(item({ chave: "leite", variacao_percentual: -24.2 }))).toBe("−24% desde 2024");
    expect(textoVariacao(item({ chave: "cacau", variacao_percentual: null }))).toBe("Sem série para comparar");
  });
});

describe("linkPainel", () => {
  it("abre o painel no recorte do destaque", () => {
    const soja = item({ chave: "soja", produto: { slug: "soja-em-grao", nome: "Soja", segmento: "agricultura" } });
    expect(linkPainel(soja)).toBe("/painel?segmento=agricultura&produto=soja-em-grao&indicador=quantidade-produzida");
  });
});

describe("descreverDestaque", () => {
  it("resume a série em texto para leitores de tela", () => {
    const texto = descreverDestaque(item({ chave: "soja", rotulo: "Soja" }));
    expect(texto).toContain("Soja");
    expect(texto).toContain("2024");
    expect(texto).toContain("2025");
  });
});
