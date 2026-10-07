import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UseQueryResult } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import type { PanoramaResposta } from "@/lib/api-types";
import { Bloco } from "./bloco";
import { TabelaDados } from "./tabela-dados";

const dados = {
  filtros: { valores: { ano: 2024, janela: 10, inicio: 2015 }, opcoes: { anos: [2024], janelas: [5, 10, 20] } },
  metricas: {},
  series: {},
  texto: { manchete: "Em 2024, Soja respondeu por 70,0%.", como_ler: ["Primeira explicação.", "Segunda."] },
  qualidade: { municipios_sigilosos: 2, ano_ref_monetario: 2024, avisos: ["Sem carne bovina."] },
  meta: { fontes: [{ fonte: "IBGE – PAM", tabela_sidra: 5457, url_fonte: "https://sidra.ibge.gov.br/Tabela/5457" }], atualizado_em: "2026-10-01T12:00:00Z" },
} satisfies PanoramaResposta;

const consulta = (parcial: Partial<UseQueryResult<PanoramaResposta>>) =>
  ({ isPending: false, isError: false, data: dados, error: null, refetch: vi.fn(), ...parcial }) as unknown as UseQueryResult<PanoramaResposta>;

const comSigilosos = (n: number, avisos: string[] = []) =>
  consulta({ data: { ...dados, qualidade: { ...dados.qualidade, municipios_sigilosos: n, avisos } } });

function renderizar(c: UseQueryResult<PanoramaResposta>) {
  return render(
    <Bloco id="panorama" etiqueta="01" titulo="Panorama" consulta={c} filtros={null} onPadrao={vi.fn()} tabela={() => null}>
      {() => null}
    </Bloco>,
  );
}

describe("Bloco do Observatório", () => {
  it("mostra manchete, como ler, avisos, fonte e alterna gráfico e tabela", async () => {
    render(
      <Bloco id="panorama" etiqueta="01" titulo="Panorama" consulta={consulta({})} filtros={null} onPadrao={vi.fn()}
        tabela={() => <table aria-label="dados"><tbody><tr><td>x</td></tr></tbody></table>}
        linkPainel={() => "/painel?segmento=agricultura"}>
        {() => <div data-testid="grafico-falso" />}
      </Bloco>,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Panorama" })).toBeInTheDocument();
    expect(screen.getByTestId("manchete")).toHaveTextContent("Soja respondeu por 70,0%");
    expect(screen.getByText("Primeira explicação.")).toBeInTheDocument();
    expect(screen.getByText("Sem carne bovina.")).toBeInTheDocument();
    expect(screen.getByText(/2 municípios com dado sigiloso/)).toBeInTheDocument();
    const fonte = screen.getByRole("link", { name: /IBGE – PAM/ });
    expect(fonte).toHaveAttribute("href", "https://sidra.ibge.gov.br/Tabela/5457");
    expect(fonte).toHaveAttribute("target", "_blank");
    expect(fonte.getAttribute("rel")).toContain("noopener");
    expect(screen.getByRole("link", { name: /Ver no Painel/ })).toHaveAttribute("href", "/painel?segmento=agricultura");
    expect(screen.getByTestId("grafico-falso")).toBeInTheDocument();
    const alternar = screen.getByRole("button", { name: "Ver como tabela" });
    expect(alternar).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(alternar);
    expect(screen.getByRole("table", { name: "dados" })).toBeInTheDocument();
    expect(screen.queryByTestId("grafico-falso")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver como gráfico" })).toHaveAttribute("aria-pressed", "true");
  });

  it("expõe nomes acessíveis para a lista Como ler e para o aside de qualidade", () => {
    renderizar(consulta({}));
    expect(screen.getByRole("list", { name: "Como ler" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Fonte e qualidade do dado" })).toBeInTheDocument();
  });

  it("exibe todos os avisos de qualidade", () => {
    renderizar(comSigilosos(0, ["Aviso A.", "Aviso B.", "Aviso C."]));
    for (const a of ["Aviso A.", "Aviso B.", "Aviso C."]) expect(screen.getByText(a)).toBeInTheDocument();
    expect(screen.queryByText(/dado sigiloso/)).not.toBeInTheDocument();
  });

  it("usa o singular com 1 município sigiloso", () => {
    renderizar(comSigilosos(1));
    expect(screen.getByText("1 município com dado sigiloso fica fora dos totais.")).toBeInTheDocument();
  });

  it("usa o plural com 2 municípios sigilosos", () => {
    renderizar(comSigilosos(2));
    expect(screen.getByText("2 municípios com dado sigiloso ficam fora dos totais.")).toBeInTheDocument();
  });

  it("erro 400 oferece voltar ao padrão", async () => {
    const onPadrao = vi.fn();
    render(
      <Bloco id="panorama" etiqueta="01" titulo="Panorama" onPadrao={onPadrao} filtros={null} tabela={() => null}
        consulta={consulta({ isError: true, data: undefined, error: new ApiError(400, "Parâmetros inválidos") })}>
        {() => null}
      </Bloco>,
    );
    expect(screen.getByText("Parâmetros inválidos")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Voltar ao padrão" }));
    expect(onPadrao).toHaveBeenCalled();
  });

  it("erro 500 usa ErroConsulta com tentar novamente", async () => {
    const refetch = vi.fn();
    renderizar(consulta({ isError: true, data: undefined, error: new ApiError(500, "x"), refetch }));
    await userEvent.click(screen.getByRole("button", { name: /Tentar novamente/ }));
    expect(refetch).toHaveBeenCalled();
  });

  it("carregando mostra o estado de espera", () => {
    render(
      <Bloco id="panorama" etiqueta="01" titulo="Panorama" onPadrao={vi.fn()} filtros={null} tabela={() => null}
        consulta={consulta({ isPending: true, data: undefined })}>
        {() => null}
      </Bloco>,
    );
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});

describe("TabelaDados", () => {
  it("exibe – para null e nunca 0 no lugar de dado ausente", () => {
    render(
      <TabelaDados legenda="Teste" colunas={[{ chave: "m", rotulo: "Município" }, { chave: "v", rotulo: "Valor", numerico: true }]}
        linhas={[{ m: "A", v: null }, { m: "B", v: 1500 }]} />,
    );
    expect(screen.getByRole("table", { name: "Teste" })).toBeInTheDocument();
    expect(screen.getByText("–")).toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });
});
