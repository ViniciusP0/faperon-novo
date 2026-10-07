import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseFiltros } from "@/lib/filters";
import { Ranking } from "./ranking";

const meta = { fonte: "IBGE", tabela_sidra: 5457, url_fonte: "https://sidra.ibge.gov.br/Tabela/5457", atualizado_em: null };
const produto = { slug: "soja-em-grao", nome: "Soja (em grão)", segmento: "agricultura" };
const soma = { slug: "quantidade-produzida", nome: "Quantidade produzida", unidade: "Toneladas", agregacao: "soma" };
const media = { slug: "rendimento-medio", nome: "Rendimento médio", unidade: "Quilogramas por hectare", agregacao: "media_ponderada" };

const ok = (posicao: number, codigo: string, nome: string, valor: number, pct: number | null) => ({
  posicao,
  municipio: { codigo_ibge: codigo, nome },
  valor,
  status: "ok",
  percentual_total: pct,
});
const sigiloso = (codigo: string, nome: string) => ({
  posicao: null,
  municipio: { codigo_ibge: codigo, nome },
  valor: null,
  status: "sigiloso",
  percentual_total: null,
});

function responder(corpo: object) {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => corpo })));
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const filtros = (slug: string) =>
  parseFiltros(new URLSearchParams(`produto=soja-em-grao&indicador=${slug}&inicio=2015&fim=2024`));

afterEach(() => vi.unstubAllGlobals());

describe("Ranking: total, média e sigilosos", () => {
  it("indicador de soma mostra o Total de Rondônia e a coluna de percentual", async () => {
    responder({
      produto, indicador: soma, inicio: 2015, fim: 2024, ano_referencia: 2024, total_estadual: 1_000_000, meta,
      itens: [ok(1, "1100072", "Corumbiara", 600_000, 60), ok(2, "1100304", "Vilhena", 400_000, 40)],
    });
    render(<Ranking filtros={filtros("quantidade-produzida")} />, { wrapper });
    expect(await screen.findByText(/Total de Rondônia:/)).toBeInTheDocument();
    expect(screen.queryByText(/Média de Rondônia/)).not.toBeInTheDocument();
    expect(screen.getByText("% do total estadual")).toBeInTheDocument();
  });

  it("média ponderada vira Média de Rondônia, sem Total e sem percentual do total", async () => {
    responder({
      produto, indicador: media, inicio: 2015, fim: 2024, ano_referencia: 2024, total_estadual: 3600, meta,
      itens: [ok(1, "1100072", "Corumbiara", 4000, null), ok(2, "1100304", "Vilhena", 2000, null)],
    });
    render(<Ranking filtros={filtros("rendimento-medio")} />, { wrapper });
    expect(await screen.findByText(/Média de Rondônia:/)).toBeInTheDocument();
    expect(screen.queryByText(/Total de Rondônia/)).not.toBeInTheDocument();
    expect(screen.queryByText("% do total estadual")).not.toBeInTheDocument();
  });

  it("avisa quantos municípios sigilosos ficam fora do total (plural)", async () => {
    responder({
      produto, indicador: soma, inicio: 2015, fim: 2024, ano_referencia: 2024, total_estadual: 1_000_000, meta,
      itens: [ok(1, "1100072", "Corumbiara", 1_000_000, 100), sigiloso("1100015", "Alta Floresta"), sigiloso("1100023", "Ariquemes")],
    });
    render(<Ranking filtros={filtros("quantidade-produzida")} />, { wrapper });
    expect(await screen.findByText("2 municípios com dado sigiloso ficam fora dos totais.")).toBeInTheDocument();
  });

  it("avisa no singular com 1 sigiloso e não mostra nada sem sigilosos", async () => {
    responder({
      produto, indicador: soma, inicio: 2015, fim: 2024, ano_referencia: 2024, total_estadual: 1000, meta,
      itens: [ok(1, "1100072", "Corumbiara", 1000, 100), sigiloso("1100015", "Alta Floresta")],
    });
    const { unmount } = render(<Ranking filtros={filtros("quantidade-produzida")} />, { wrapper });
    expect(await screen.findByText("1 município com dado sigiloso fica fora dos totais.")).toBeInTheDocument();
    unmount();

    responder({
      produto, indicador: soma, inicio: 2015, fim: 2024, ano_referencia: 2024, total_estadual: 1000, meta,
      itens: [ok(1, "1100072", "Corumbiara", 1000, 100)],
    });
    render(<Ranking filtros={filtros("quantidade-produzida")} />, { wrapper });
    await screen.findByText(/Total de Rondônia:/);
    expect(screen.queryByText(/sigiloso fica|sigiloso ficam/)).not.toBeInTheDocument();
  });
});
