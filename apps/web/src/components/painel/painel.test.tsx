import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Filtros } from "@/lib/filters";
import { parseFiltros } from "@/lib/filters";
import { ErroConsulta, NotaMetodologica } from "./comuns";
import { Ranking } from "./ranking";
import { ApiError } from "@/lib/api";

const meta = {
  fonte: "IBGE – Pesquisa Agrícola Municipal (PAM)",
  tabela_sidra: 5457,
  url_fonte: "https://sidra.ibge.gov.br/Tabela/5457",
  atualizado_em: "2026-09-24T14:00:00Z",
};

const ranking = {
  produto: { slug: "soja-em-grao", nome: "Soja (em grão)", segmento: "agricultura" },
  indicador: { slug: "quantidade-produzida", nome: "Quantidade produzida", unidade: "Toneladas", agregacao: "soma" },
  inicio: 2015,
  fim: 2024,
  ano_referencia: 2024,
  total_estadual: 1000,
  itens: [
    { posicao: 1, municipio: { codigo_ibge: "1100072", nome: "Corumbiara" }, valor: 600, status: "ok", percentual_total: 60 },
    { posicao: 2, municipio: { codigo_ibge: "1100015", nome: "Alta Floresta D'Oeste" }, valor: 400, status: "ok", percentual_total: 40 },
    { posicao: null, municipio: { codigo_ibge: "1100031", nome: "Cabixi" }, valor: null, status: "sigiloso", percentual_total: null },
  ],
  meta,
};

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const filtros: Filtros = parseFiltros(new URLSearchParams("produto=soja-em-grao&indicador=quantidade-produzida&inicio=2015&fim=2024"));

afterEach(() => vi.unstubAllGlobals());

describe("Ranking", () => {
  it("lista municípios em ordem, marca sigiloso com X e mostra a nota metodológica", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ranking }));
    render(<Ranking filtros={filtros} />, { wrapper });

    const detalhes = await screen.findByText("Ver os 3 municípios");
    expect(detalhes.closest("details")).not.toHaveAttribute("open");
    const tabela = screen.getByRole("table", { hidden: true });
    const linhas = within(tabela).getAllByRole("row", { hidden: true }).slice(1);
    expect(linhas).toHaveLength(3);
    expect(within(linhas[0]!).getByText("Corumbiara")).toBeInTheDocument();
    expect(within(linhas[2]!).getByText("X")).toBeInTheDocument();
    expect(screen.getByText("60,00%")).toBeInTheDocument();
  });

  it("mostra os maiores em barras, só os com valor, com o líder em primeiro", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ranking }));
    render(<Ranking filtros={filtros} />, { wrapper });

    const lista = await screen.findByRole("list", { name: /Dez maiores municípios/ });
    const barras = within(lista).getAllByTestId("barra-item");
    expect(barras).toHaveLength(2); // Cabixi é sigiloso: só aparece na tabela
    expect(within(barras[0]!).getByText("Corumbiara")).toBeInTheDocument();
    expect(within(barras[0]!).getByText("1º")).toBeInTheDocument();
  });

  it("mostra erro tratado quando a API falha", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }));
    render(<Ranking filtros={filtros} />, { wrapper });
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível consultar os dados");
  });
});

describe("ErroConsulta", () => {
  it("bloqueia comparação de unidades diferentes (422)", () => {
    render(<ErroConsulta erro={new ApiError(422, "Unidades diferentes não podem ser comparadas: Toneladas × Quilogramas")} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Comparação bloqueada");
    expect(screen.getByRole("alert")).toHaveTextContent("Toneladas × Quilogramas");
  });
});

describe("NotaMetodologica", () => {
  it("funciona sem meta (nenhum produto escolhido)", () => {
    render(<NotaMetodologica meta={null} />);
    expect(screen.getByText(/tabelas 3939 e 74/)).toBeInTheDocument();
  });
});
