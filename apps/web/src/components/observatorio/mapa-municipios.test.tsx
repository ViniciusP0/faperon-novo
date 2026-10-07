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
