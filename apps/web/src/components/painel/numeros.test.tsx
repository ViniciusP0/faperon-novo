import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseFiltros } from "@/lib/filters";
import { Barras } from "./barras";
import { Numeros } from "./numeros";

const meta = { fonte: "IBGE", tabela_sidra: 5457, url_fonte: "https://sidra.ibge.gov.br/Tabela/5457", atualizado_em: null };
const produto = { slug: "soja-em-grao", nome: "Soja (em grão)", segmento: "agricultura" };
const indicador = { slug: "quantidade-produzida", nome: "Quantidade produzida", unidade: "Toneladas", agregacao: "soma" };

const itens = [
  { posicao: 1, municipio: { codigo_ibge: "1100072", nome: "Corumbiara" }, valor: 600_000, status: "ok", percentual_total: 60 },
  { posicao: 2, municipio: { codigo_ibge: "1100304", nome: "Vilhena" }, valor: 400_000, status: "ok", percentual_total: 40 },
];
const ranking = { produto, indicador, inicio: 2015, fim: 2024, ano_referencia: 2024, total_estadual: 1_000_000, itens, meta };
const pontos = [
  { ano: 2023, valor: 300_000, status: "ok" },
  { ano: 2024, valor: 400_000, status: "ok" },
];
const analise = {
  titulo: "t",
  paragrafos: [],
  meta,
  metricas: {
    variacao_absoluta: 200_000,
    variacao_percentual: 33.3,
    cagr_percentual: 3,
    maior_ano: null,
    menor_ano: null,
    top5: [],
    concentracao_top5_percentual: 100,
  },
};

function responder(extra: { serie?: object } = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const corpo = url.includes("/ranking")
        ? ranking
        : url.includes("/serie")
          ? (extra.serie ?? { produto, indicador, municipio: null, inicio: 2015, fim: 2024, pontos, meta })
          : analise;
      return { ok: true, json: async () => corpo };
    }),
  );
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const base = "produto=soja-em-grao&indicador=quantidade-produzida&inicio=2015&fim=2024";

afterEach(() => vi.unstubAllGlobals());

describe("Numeros", () => {
  it("mostra a manchete e os quatro números de Rondônia", async () => {
    responder();
    render(<Numeros filtros={parseFiltros(new URLSearchParams(base))} />, { wrapper });

    const cartoes = await screen.findAllByTestId("cartao-numero");
    expect(cartoes).toHaveLength(4);
    expect(within(cartoes[0]!).getByText("Total de Rondônia")).toBeInTheDocument();
    expect(cartoes[0]).toHaveTextContent("1 milhão");
    expect(cartoes[1]).toHaveTextContent("+33,3%");
    expect(cartoes[2]).toHaveTextContent("Corumbiara");
    expect(cartoes[2]).toHaveTextContent("60,0% do total de Rondônia");
    expect(cartoes[3]).toHaveTextContent("100,0%");
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(/Em 2024, Rondônia produziu 1.milhão de toneladas de soja/);
  });

  it("com município, mostra o valor dele e a posição no ranking", async () => {
    responder({ serie: { produto, indicador, municipio: { codigo_ibge: "1100304", nome: "Vilhena" }, inicio: 2015, fim: 2024, pontos, meta } });
    render(<Numeros filtros={parseFiltros(new URLSearchParams(`${base}&municipio=1100304`))} />, { wrapper });

    const cartoes = await screen.findAllByTestId("cartao-numero");
    expect(within(cartoes[0]!).getByText("Vilhena")).toBeInTheDocument();
    expect(cartoes[0]).toHaveTextContent("400 mil");
    expect(cartoes[2]).toHaveTextContent("2º");
    expect(cartoes[3]).toHaveTextContent("40,0%");
  });

  it("mostra X, nunca zero, quando o valor do município é sigiloso", async () => {
    responder({
      serie: { produto, indicador, municipio: { codigo_ibge: "1100304", nome: "Vilhena" }, inicio: 2015, fim: 2024, pontos: [{ ano: 2024, valor: null, status: "sigiloso" }], meta },
    });
    render(<Numeros filtros={parseFiltros(new URLSearchParams(`${base}&municipio=1100304`))} />, { wrapper });

    const cartoes = await screen.findAllByTestId("cartao-numero");
    expect(within(cartoes[0]!).getByText("X")).toBeInTheDocument();
    expect(cartoes[0]).not.toHaveTextContent(/\b0\b/);
  });
});

describe("Barras", () => {
  it("destaca o item escolhido e dimensiona pelo maior valor", () => {
    render(
      <Barras
        rotulo="Teste"
        unidade="Toneladas"
        itens={[
          { id: "a", nome: "A", valor: 100, status: "ok", percentual: 50 },
          { id: "b", nome: "B", valor: 50, status: "ok", percentual: 25, destacado: true },
        ]}
      />,
    );
    const itensDom = screen.getAllByTestId("barra-item");
    expect(itensDom[1]).toHaveClass("bg-brand-soft");
    const preenchimentos = itensDom.map((li) => li.querySelector<HTMLElement>("[aria-hidden] > span")!.style.width);
    expect(preenchimentos).toEqual(["100%", "50%"]);
  });
});
