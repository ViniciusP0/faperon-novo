import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MapaMunicipios } from "./mapa-municipios";

afterEach(() => vi.unstubAllGlobals());

describe("MapaMunicipios", () => {
  it("avisa quando o GeoJSON não carrega", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    render(<MapaMunicipios municipios={[]} unidade="Mil Reais" categorias={[]} descricao="Mapa" />);
    expect(await screen.findByText(/Não foi possível carregar o mapa/)).toBeInTheDocument();
  });
});

vi.mock("./grafico-observatorio", () => ({ GraficoObservatorio: () => <div data-testid="grafico-mock" /> }));

const m = (codigo: string, status: "ok" | "sigiloso" | "sem_dado") =>
  ({ codigo_ibge: codigo, nome: codigo, microrregiao: "", valor: status === "ok" ? 1 : null, status, categoria: null });

describe("MapaMunicipios: legenda de sem dado", () => {
  it("mostra a chave 'Sigiloso ou sem dado' só quando há município sem dado", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ type: "FeatureCollection", features: [] }) }));
    const { unmount } = render(<MapaMunicipios municipios={[m("1", "ok"), m("2", "sigiloso")]} unidade="" categorias={[]} descricao="Mapa" />);
    expect(await screen.findByTestId("grafico-mock")).toBeInTheDocument();
    expect(screen.getByText("Sigiloso ou sem dado")).toBeInTheDocument();
    unmount();
    render(<MapaMunicipios municipios={[m("1", "ok")]} unidade="" categorias={[]} descricao="Mapa" />);
    expect(await screen.findByTestId("grafico-mock")).toBeInTheDocument();
    expect(screen.queryByText("Sigiloso ou sem dado")).not.toBeInTheDocument();
  });

  it("não mostra o esqueleto quando a malha já está registrada", async () => {
    const f = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ type: "FeatureCollection", features: [] }) });
    vi.stubGlobal("fetch", f);
    render(<MapaMunicipios municipios={[m("1", "ok")]} unidade="" categorias={[]} descricao="Mapa" />);
    expect(screen.getByTestId("grafico-mock")).toBeInTheDocument();
    expect(screen.queryByText("Carregando o mapa…")).not.toBeInTheDocument();
  });
});

describe("MapaMunicipios: modo categoria", () => {
  it("mostra a chave de sem dado quando há categorias e algum município com categoria null", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ type: "FeatureCollection", features: [] }) }));
    const comCat = (codigo: string, categoria: string | null) => ({ ...m(codigo, "ok"), valor: null, categoria });
    const { unmount } = render(<MapaMunicipios municipios={[comCat("1", "soja"), comCat("2", null)]} unidade="" categorias={[{ slug: "soja", nome: "Soja" }]} descricao="Mapa" />);
    expect(await screen.findByTestId("grafico-mock")).toBeInTheDocument();
    expect(screen.getByText("Sigiloso ou sem dado")).toBeInTheDocument();
    unmount();
    render(<MapaMunicipios municipios={[comCat("1", "soja")]} unidade="" categorias={[{ slug: "soja", nome: "Soja" }]} descricao="Mapa" />);
    expect(await screen.findByTestId("grafico-mock")).toBeInTheDocument();
    expect(screen.queryByText("Sigiloso ou sem dado")).not.toBeInTheDocument();
  });
});
