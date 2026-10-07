import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Painel } from "./painel";

let busca = "";
const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/painel",
  useSearchParams: () => new URLSearchParams(busca),
}));

const resposta = (status: number, corpo: unknown) => ({ ok: status < 400, status, json: async () => corpo });

function api(rotas: Record<string, ReturnType<typeof resposta>>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const chave = Object.keys(rotas).find((k) => url.includes(k));
      return chave ? rotas[chave] : resposta(200, []);
    }),
  );
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => replace.mockClear());
afterEach(() => vi.unstubAllGlobals());

describe("Painel: estados de erro do recorte", () => {
  it("produto inexistente (404 em /indicadores) mostra o erro e volta ao padrão, sem ficar carregando", async () => {
    busca = "produto=cafe-arabica";
    api({
      "/indicadores": resposta(404, { erro: "Produto 'cafe-arabica' não existe", campos: {} }),
      "/meta": resposta(200, { ultima_carga: null, cargas: [], anos: { min: 2000, max: 2024 } }),
    });
    render(<Painel />, { wrapper });

    expect(await screen.findByText("Produto 'cafe-arabica' não existe")).toBeInTheDocument();
    expect(screen.queryByText("Carregando os indicadores do produto…")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Voltar ao padrão" }));
    expect(replace).toHaveBeenCalledWith("/painel", { scroll: false });
  });

  it("recorte sem dados (404 do ranking padrão) mostra o erro em vez de carregar para sempre", async () => {
    busca = "produto=soja-em-grao&indicador=quantidade-produzida";
    api({
      "/indicadores": resposta(200, [{ slug: "quantidade-produzida", nome: "Quantidade produzida", unidade: "Toneladas", agregacao: "soma" }]),
      "/ranking": resposta(404, { erro: "Não há dados publicados para este produto e indicador", campos: {} }),
      "/meta": resposta(200, { ultima_carga: null, cargas: [], anos: { min: 2000, max: 2024 } }),
    });
    render(<Painel />, { wrapper });

    expect(await screen.findByText("Não há dados publicados para este produto e indicador")).toBeInTheDocument();
    expect(screen.queryByText("Carregando os indicadores do produto…")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Voltar ao padrão" })).toBeInTheDocument();
  });

  it("enquanto os indicadores carregam, segue mostrando a mensagem de carregamento", async () => {
    busca = "produto=soja-em-grao";
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    render(<Painel />, { wrapper });
    expect(await screen.findByText("Carregando os indicadores do produto…")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Voltar ao padrão" })).not.toBeInTheDocument();
  });
});
