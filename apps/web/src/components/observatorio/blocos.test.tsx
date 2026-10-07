import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BlocoCrescimento } from "./bloco-crescimento";
import { BlocoPanorama } from "./bloco-panorama";
import { BlocoPecuaria } from "./bloco-pecuaria";
import { BlocoTerritorio } from "./bloco-territorio";

const replace = vi.fn();
let busca = "";
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(busca),
  useRouter: () => ({ replace }),
  usePathname: () => "/central-de-inteligencia/observatorio",
}));

const opcoesGrafico: unknown[] = [];
vi.mock("./grafico-observatorio", () => ({
  GraficoObservatorio: (p: { option: unknown; descricao: string }) => {
    opcoesGrafico.push(p.option);
    return <div data-testid="grafico" aria-label={p.descricao} />;
  },
}));

const base = {
  texto: { manchete: "Manchete do bloco.", como_ler: ["a", "b"] },
  qualidade: { municipios_sigilosos: 0, ano_ref_monetario: 2024, avisos: [] },
  meta: { fontes: [], atualizado_em: null },
};

const territorio = {
  ...base,
  filtros: {
    valores: { metrica: "valor", cultura: null, ano: 2024 },
    opcoes: {
      metricas: [
        { slug: "valor", nome: "Valor da produção", unidade: "Mil Reais" },
        { slug: "area", nome: "Área colhida", unidade: "Hectares" },
        { slug: "rebanho", nome: "Rebanho bovino", unidade: "Cabeças" },
        { slug: "dominante", nome: "Cultura dominante", unidade: "" },
      ],
      culturas: [{ slug: "soja-em-grao", nome: "Soja" }],
      anos: [2023, 2024],
    },
  },
  metricas: { unidade: "Mil Reais", total: 10, top5_pct: 100, hhi: 5000, concentracao: "alta" },
  series: {
    municipios: [
      { codigo_ibge: "1100023", nome: "Ariquemes", microrregiao: "Ariquemes", valor: 10, status: "ok", categoria: null },
      { codigo_ibge: "1100031", nome: "Cabixi", microrregiao: "Colorado do Oeste", valor: null, status: "sigiloso", categoria: null },
      { codigo_ibge: "1100049", nome: "Cacoal", microrregiao: "Cacoal", valor: null, status: "sem_dado", categoria: null },
    ],
    microrregioes: [{ nome: "Ariquemes", valor: 10 }],
    dependentes: [],
    categorias: [],
  },
  texto: { manchete: "Em 2024, os cinco maiores municípios concentraram 100,0%.", como_ler: ["a", "b"] },
};

const panorama = {
  ...base,
  filtros: { valores: { ano: 2024, janela: 10, inicio: 2015 }, opcoes: { anos: [2023, 2024], janelas: [5, 10, 20] } },
  metricas: { valor_total_real: 17000000, valor_lavouras_real: 1, valor_origem_animal_real: 1, variacao_real_pct: 201.15, area_colhida_ha: null },
  series: {
    composicao: [{ slug: "soja", nome: "Soja (em grão)", valor: 5000, participacao: 27.7 }, { slug: "x", nome: "Sem valor", valor: null, participacao: null }],
    evolucao: { anos: [2023, 2024], itens: [{ slug: "soja", nome: "Soja (em grão)", valores: [1, 2] }] },
  },
};

const crescimento = {
  ...base,
  filtros: {
    valores: { cultura: "soja-em-grao", inicio: 2020, fim: 2022 },
    opcoes: { culturas: [{ slug: "soja-em-grao", nome: "Soja" }, { slug: "milho-em-grao", nome: "Milho" }], anos: [2019, 2020, 2021, 2022, 2023] },
  },
  metricas: { variacao_producao_pct: 10, parte_area_pct: 60, parte_rendimento_pct: 40, perda_media_pct: 1, perda_ultimo_ano_pct: 1 },
  series: {
    indices: { anos: [2020, 2021, 2022], area: [100, 110, 120], rendimento: [100, null, 105], producao: [100, 112, 126] },
    perda: [{ ano: 2021, valor: 0.5 }, { ano: 2022, valor: null }],
    valor_por_hectare: [{ slug: "soja", nome: "Soja", valor: 7000, participacao: null }],
  },
};

const pecuaria = {
  ...base,
  filtros: { valores: { rebanho: "bovino", inicio: 2020, fim: 2022 }, opcoes: { rebanhos: [{ slug: "bovino", nome: "Bovino" }, { slug: "ovino", nome: "Ovino" }], anos: [2019, 2020, 2021, 2022] } },
  metricas: { efetivo_final: 100, variacao_pct: 5, top5_pct: 20, leite: { volume_mil_litros: null, valor_real: 1000, produtividade_l_vaca: 2001, variacao_produtividade_pct: 1 } },
  series: {
    efetivo: [{ ano: 2021, valor: 90 }, { ano: 2022, valor: 100 }],
    municipios: [{ codigo_ibge: "1100205", nome: "Porto Velho", valor: 5000 }, { codigo_ibge: "1100338", nome: "Nova Mamoré", valor: null }],
    composicao: [{ slug: "bovino", nome: "Bovino", valor: 100, participacao: 100 }],
    leite_polos: [{ codigo_ibge: "1100205", nome: "Polo Leite", volume: 300, produtividade: null }],
  },
};

const RESPOSTAS: Record<string, unknown> = { territorio, panorama, crescimento, pecuaria };

function roteador(falhar: string[] = []) {
  return vi.fn(async (url: string) => {
    if (url.startsWith("/geo/")) return { ok: true, json: async () => ({ type: "FeatureCollection", features: [] }) };
    const bloco = url.split("/observatorio/")[1]!.split("?")[0]!;
    if (falhar.includes(bloco)) {
      return { ok: false, status: 400, json: async () => ({ erro: "Parâmetros inválidos", campos: { fim: "Ano final inválido." } }) };
    }
    return { ok: true, json: async () => RESPOSTAS[bloco] };
  });
}

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>;
}

const chamadas = (f: ReturnType<typeof roteador>) => f.mock.calls.map((c) => c[0] as string).filter((u) => u.includes("/observatorio/"));

beforeEach(() => { busca = ""; opcoesGrafico.length = 0; });
afterEach(() => { vi.unstubAllGlobals(); replace.mockReset(); });

describe("BlocoTerritorio", () => {
  it("consulta com os filtros do bloco e mostra sigiloso/sem dado como texto na tabela", async () => {
    busca = "ter_metrica=valor";
    const f = roteador();
    vi.stubGlobal("fetch", f);
    render(<BlocoTerritorio />, { wrapper });
    expect(await screen.findByTestId("manchete")).toHaveTextContent("concentraram 100,0%");
    expect(chamadas(f)[0]).toBe("/api/v1/observatorio/territorio?metrica=valor");
    await userEvent.click(screen.getByRole("button", { name: "Ver como tabela" }));
    const tabela = screen.getByRole("table", { name: "Valores por município" });
    expect(within(tabela).getByText("Cabixi").closest("tr")).toHaveTextContent("sigiloso");
    expect(within(tabela).getAllByText("Cacoal")[0]!.closest("tr")).toHaveTextContent("sem dado");
    expect(within(tabela).getByText("Cabixi").closest("tr")).not.toHaveTextContent("0");
  });

  it("trocar a métrica grava o filtro na URL com o prefixo do bloco", async () => {
    busca = "ter_metrica=valor";
    vi.stubGlobal("fetch", roteador());
    render(<BlocoTerritorio />, { wrapper });
    await screen.findByTestId("manchete");
    await userEvent.selectOptions(screen.getByLabelText("Métrica"), "area");
    expect(replace).toHaveBeenCalledWith(expect.stringContaining("ter_metrica=area"), { scroll: false });
  });

  it("esconde o seletor de cultura nas métricas rebanho e dominante", async () => {
    busca = "ter_metrica=rebanho";
    const rebanho = { ...territorio, filtros: { ...territorio.filtros, valores: { metrica: "rebanho", cultura: null, ano: 2024 } } };
    const f = vi.fn(async (url: string) => (url.startsWith("/geo/") ? { ok: true, json: async () => ({ type: "FeatureCollection", features: [] }) } : { ok: true, json: async () => rebanho }));
    vi.stubGlobal("fetch", f);
    render(<BlocoTerritorio />, { wrapper });
    await screen.findByTestId("manchete");
    expect(screen.queryByLabelText("Cultura")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Ano")).toBeInTheDocument();
  });

  it("modo dominante mostra o nome da cultura e 'sigiloso' sem número", async () => {
    busca = "ter_metrica=dominante";
    const dom = {
      ...territorio,
      filtros: { ...territorio.filtros, valores: { metrica: "dominante", cultura: null, ano: 2024 } },
      metricas: { unidade: "" },
      series: {
        ...territorio.series,
        categorias: [{ slug: "soja-em-grao", nome: "Soja" }],
        municipios: [
          { codigo_ibge: "1", nome: "Alfa", microrregiao: "M", valor: null, status: "ok", categoria: "soja-em-grao" },
          { codigo_ibge: "2", nome: "Beta", microrregiao: "M", valor: null, status: "sigiloso", categoria: null },
        ],
      },
    };
    vi.stubGlobal("fetch", vi.fn(async (url: string) => (url.startsWith("/geo/") ? { ok: true, json: async () => ({ type: "FeatureCollection", features: [] }) } : { ok: true, json: async () => dom })));
    render(<BlocoTerritorio />, { wrapper });
    await screen.findByTestId("manchete");
    await userEvent.click(screen.getByRole("button", { name: "Ver como tabela" }));
    expect(screen.getByText("Alfa").closest("tr")).toHaveTextContent("Soja");
    expect(screen.getByText("Beta").closest("tr")).toHaveTextContent("sigiloso");
    expect(screen.queryByRole("link", { name: /Ver no Painel/ })).not.toBeInTheDocument();
  });

  it("monta o link do Painel só com cultura (valor) ou rebanho", async () => {
    busca = "ter_metrica=valor&ter_cultura=soja-em-grao";
    const comCultura = { ...territorio, filtros: { ...territorio.filtros, valores: { metrica: "valor", cultura: "soja-em-grao", ano: 2024 } } };
    vi.stubGlobal("fetch", vi.fn(async (url: string) => (url.startsWith("/geo/") ? { ok: true, json: async () => ({ type: "FeatureCollection", features: [] }) } : { ok: true, json: async () => comCultura })));
    render(<BlocoTerritorio />, { wrapper });
    const link = await screen.findByRole("link", { name: /Ver no Painel/ });
    expect(link).toHaveAttribute("href", "/painel?produto=soja-em-grao&indicador=valor-da-producao&inicio=2015&fim=2024");
  });

  it("sem cultura escolhida não há link do Painel", async () => {
    vi.stubGlobal("fetch", roteador());
    render(<BlocoTerritorio />, { wrapper });
    await screen.findByTestId("manchete");
    expect(screen.queryByRole("link", { name: /Ver no Painel/ })).not.toBeInTheDocument();
  });
});

describe("BlocoPanorama", () => {
  it("consulta com pan_ e mostra KPI ausente como '–' e a tabela com nulos como '–'", async () => {
    busca = "pan_ano=2024&pan_janela=10&cre_fim=2020";
    const f = roteador();
    vi.stubGlobal("fetch", f);
    render(<BlocoPanorama />, { wrapper });
    await screen.findByTestId("manchete");
    expect(chamadas(f)[0]).toBe("/api/v1/observatorio/panorama?ano=2024&janela=10");
    const area = screen.getByText("Área colhida (ha)");
    expect(area.tagName).toBe("DT");
    expect(area.nextElementSibling).toHaveTextContent("–");
    expect(screen.getAllByTestId("grafico")).toHaveLength(2);
    await userEvent.click(screen.getByRole("button", { name: "Ver como tabela" }));
    expect(within(screen.getByRole("table", { name: "Composição do valor da produção" })).getByText("Sem valor").closest("tr")).toHaveTextContent("––");
  });

  it("passa funções estáveis (option) aos gráficos entre renders", async () => {
    vi.stubGlobal("fetch", roteador());
    const { rerender } = render(<BlocoPanorama />, { wrapper });
    await screen.findByTestId("manchete");
    expect(opcoesGrafico.every((o) => typeof o === "function")).toBe(true);
    const antes = [...opcoesGrafico];
    opcoesGrafico.length = 0;
    rerender(<BlocoPanorama />);
    expect(antes.length).toBeGreaterThan(0);
    expect(opcoesGrafico.slice(-antes.length)).toEqual(antes);
  });

  it("trocar a janela grava pan_janela", async () => {
    vi.stubGlobal("fetch", roteador());
    render(<BlocoPanorama />, { wrapper });
    await screen.findByTestId("manchete");
    await userEvent.selectOptions(screen.getByLabelText("Janela"), "20");
    expect(replace).toHaveBeenCalledWith(expect.stringContaining("pan_janela=20"), { scroll: false });
  });

  it("tolera séries ausentes (200 com metricas e series vazias)", async () => {
    const vazio = { ...panorama, metricas: {}, series: {}, qualidade: { ...base.qualidade, avisos: ["Sem dados para o recorte."] } };
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => vazio })));
    render(<BlocoPanorama />, { wrapper });
    await screen.findByTestId("manchete");
    expect(screen.getByText("Sem dados para o recorte.")).toBeInTheDocument();
    expect(screen.queryAllByTestId("grafico")).toHaveLength(0);
    await userEvent.click(screen.getByRole("button", { name: "Ver como tabela" }));
    expect(screen.queryAllByRole("table")).toHaveLength(0);
  });
});

describe("BlocoCrescimento", () => {
  it("consulta com cre_ e limita De/Até para não cruzar o período", async () => {
    busca = "cre_cultura=soja-em-grao&cre_inicio=2020&cre_fim=2022";
    const f = roteador();
    vi.stubGlobal("fetch", f);
    render(<BlocoCrescimento />, { wrapper });
    await screen.findByTestId("manchete");
    expect(chamadas(f)[0]).toBe("/api/v1/observatorio/crescimento?cultura=soja-em-grao&inicio=2020&fim=2022");
    const de = within(screen.getByLabelText("De")).getAllByRole("option").map((o) => o.textContent);
    const ate = within(screen.getByLabelText("Até")).getAllByRole("option").map((o) => o.textContent);
    expect(de).toEqual(["2022", "2021", "2020", "2019"]);
    expect(ate).toEqual(["2023", "2022", "2021", "2020"]);
  });

  it("tabela alinha a perda por ano e mostra '–' para nulos", async () => {
    vi.stubGlobal("fetch", roteador());
    render(<BlocoCrescimento />, { wrapper });
    await screen.findByTestId("manchete");
    await userEvent.click(screen.getByRole("button", { name: "Ver como tabela" }));
    const linhas = within(screen.getByRole("table", { name: /Índices de área/ })).getAllByRole("row");
    expect(linhas[1]).toHaveTextContent("2020");
    expect(linhas[1]).toHaveTextContent("–"); // perda de 2020 ausente
    expect(linhas[2]).toHaveTextContent("0,5");
    expect(linhas[2]).toHaveTextContent("2021110–1120,5");
  });

  it("link do Painel usa slug da cultura e indicador existente", async () => {
    vi.stubGlobal("fetch", roteador());
    render(<BlocoCrescimento />, { wrapper });
    const link = await screen.findByRole("link", { name: /Ver no Painel/ });
    expect(link).toHaveAttribute("href", "/painel?produto=soja-em-grao&indicador=quantidade-produzida&inicio=2020&fim=2022");
  });
});

describe("BlocoPecuaria", () => {
  it("consulta com pec_, mostra leite com '–' para nulo e tabela com polos", async () => {
    busca = "pec_rebanho=bovino";
    const f = roteador();
    vi.stubGlobal("fetch", f);
    render(<BlocoPecuaria />, { wrapper });
    await screen.findByTestId("manchete");
    expect(chamadas(f)[0]).toBe("/api/v1/observatorio/pecuaria?rebanho=bovino");
    expect(screen.getByRole("heading", { level: 3, name: "Leite" })).toBeInTheDocument();
    expect(screen.getByText("Volume de leite").nextElementSibling).toHaveTextContent("–");
    await userEvent.click(screen.getByRole("button", { name: "Ver como tabela" }));
    const municipios = screen.getByRole("table", { name: "Efetivo por município no ano final" });
    expect(within(municipios).getByText("Nova Mamoré").closest("tr")).toHaveTextContent("Nova Mamoré–");
    expect(within(screen.getByRole("table", { name: "Polos de leite" })).getByText("Polo Leite").closest("tr")).toHaveTextContent("300");
  });

  it("trocar o rebanho grava pec_rebanho e o link vai ao Painel com efetivo", async () => {
    vi.stubGlobal("fetch", roteador());
    render(<BlocoPecuaria />, { wrapper });
    const link = await screen.findByRole("link", { name: /Ver no Painel/ });
    expect(link).toHaveAttribute("href", "/painel?produto=bovino&indicador=efetivo&inicio=2020&fim=2022");
    await userEvent.selectOptions(screen.getByLabelText("Rebanho"), "ovino");
    expect(replace).toHaveBeenCalledWith(expect.stringContaining("pec_rebanho=ovino"), { scroll: false });
  });
});

describe("isolamento de erro", () => {
  it("um bloco com 400 mostra 'Voltar ao padrão' sem derrubar o outro", async () => {
    busca = "cre_fim=1900&pan_ano=2024";
    vi.stubGlobal("fetch", roteador(["crescimento"]));
    render(<><BlocoPanorama /><BlocoCrescimento /></>, { wrapper });
    expect(await screen.findByRole("button", { name: "Voltar ao padrão" })).toBeInTheDocument();
    expect(await screen.findByTestId("manchete")).toHaveTextContent("Manchete do bloco.");
    expect(screen.getByLabelText("Janela")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Voltar ao padrão" }));
    expect(replace).toHaveBeenCalledWith(expect.not.stringContaining("cre_"), { scroll: false });
    expect(replace.mock.calls[0]![0]).toContain("pan_ano=2024");
  });
});

describe("troca de filtro mantém a tela", () => {
  function clienteEstavel() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    function Estavel({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    }
    return Estavel;
  }
  function adiado() {
    let resolver!: (v: unknown) => void;
    const promessa = new Promise((r) => { resolver = r; });
    return { promessa, resolver };
  }
  const ok = (corpo: unknown) => ({ ok: true, json: async () => corpo });

  it("mantém manchete e todos os seletores (aria-busy) enquanto a nova consulta carrega e depois troca", async () => {
    busca = "pec_rebanho=bovino";
    const segunda = adiado();
    const f = vi.fn().mockResolvedValueOnce(ok(pecuaria)).mockReturnValueOnce(segunda.promessa);
    vi.stubGlobal("fetch", f);
    const W = clienteEstavel();
    const { rerender } = render(<BlocoPecuaria />, { wrapper: W });
    expect(await screen.findByTestId("manchete")).toHaveTextContent("Manchete do bloco.");
    expect(screen.getByTestId("conteudo-bloco")).not.toHaveAttribute("aria-busy");

    busca = "pec_rebanho=ovino";
    rerender(<BlocoPecuaria />);
    await vi.waitFor(() => expect(f).toHaveBeenCalledTimes(2));
    expect(f.mock.calls[1]![0]).toBe("/api/v1/observatorio/pecuaria?rebanho=ovino");
    expect(screen.getByTestId("manchete")).toHaveTextContent("Manchete do bloco.");
    for (const r of ["Rebanho", "De", "Até"]) expect(screen.getByLabelText(r)).toBeEnabled();
    expect(screen.getByTestId("conteudo-bloco")).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByText(/Carregando/)).not.toBeInTheDocument();

    segunda.resolver(ok({ ...pecuaria, texto: { ...pecuaria.texto, manchete: "Nova manchete." } }));
    expect(await screen.findByText("Nova manchete.")).toBeInTheDocument();
    expect(screen.getByTestId("conteudo-bloco")).not.toHaveAttribute("aria-busy");
  });

  it("erro 400 após a troca mantém os seletores e oferece 'Voltar ao padrão'", async () => {
    busca = "pec_rebanho=bovino";
    const f = vi.fn().mockResolvedValueOnce(ok(pecuaria)).mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ erro: "Parâmetros inválidos", campos: { fim: "Ano final inválido." } }) });
    vi.stubGlobal("fetch", f);
    const W = clienteEstavel();
    const { rerender } = render(<BlocoPecuaria />, { wrapper: W });
    await screen.findByTestId("manchete");
    busca = "pec_rebanho=ovino&pec_fim=1900";
    rerender(<BlocoPecuaria />);
    expect(await screen.findByRole("button", { name: "Voltar ao padrão" })).toBeInTheDocument();
    expect(screen.queryByTestId("manchete")).not.toBeInTheDocument();
    for (const r of ["Rebanho", "De", "Até"]) expect(screen.getByLabelText(r)).toBeEnabled();
    await userEvent.click(screen.getByRole("button", { name: "Voltar ao padrão" }));
    expect(replace).toHaveBeenCalledWith("/central-de-inteligencia/observatorio", { scroll: false });
  });
});

describe("filtros dependentes e seletores coerentes", () => {
  it("Território: trocar a métrica para rebanho remove ter_cultura; para área mantém", async () => {
    busca = "ter_metrica=valor&ter_cultura=soja-em-grao";
    vi.stubGlobal("fetch", roteador());
    render(<BlocoTerritorio />, { wrapper });
    await screen.findByTestId("manchete");
    await userEvent.selectOptions(screen.getByLabelText("Métrica"), "rebanho");
    expect(replace).toHaveBeenLastCalledWith("/central-de-inteligencia/observatorio?ter_metrica=rebanho", { scroll: false });
    await userEvent.selectOptions(screen.getByLabelText("Métrica"), "area");
    expect(replace).toHaveBeenLastCalledWith("/central-de-inteligencia/observatorio?ter_metrica=area&ter_cultura=soja-em-grao", { scroll: false });
  });

  it("Crescimento: trocar a cultura remove cre_inicio e cre_fim", async () => {
    busca = "cre_cultura=soja-em-grao&cre_inicio=2020&cre_fim=2022";
    vi.stubGlobal("fetch", roteador());
    render(<BlocoCrescimento />, { wrapper });
    await screen.findByTestId("manchete");
    await userEvent.selectOptions(screen.getByLabelText("Cultura"), "milho-em-grao");
    expect(replace).toHaveBeenLastCalledWith("/central-de-inteligencia/observatorio?cre_cultura=milho-em-grao", { scroll: false });
  });

  it("seletor com valor nulo mostra a opção 'Padrão' em vez de divergir do estado", async () => {
    const semCultura = { ...crescimento, filtros: { ...crescimento.filtros, valores: { cultura: null, inicio: null, fim: null } } };
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => semCultura })));
    render(<BlocoCrescimento />, { wrapper });
    await screen.findByTestId("manchete");
    const cultura = screen.getByLabelText("Cultura") as HTMLSelectElement;
    expect(cultura.value).toBe("");
    expect(cultura.selectedOptions[0]).toHaveTextContent("Padrão");
    expect((screen.getByLabelText("De") as HTMLSelectElement).selectedOptions[0]).toHaveTextContent("Padrão");
  });
});

describe("valor exibido nos seletores vem da URL", () => {
  function clienteEstavel() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    function Estavel({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    }
    return Estavel;
  }
  const ok = (corpo: unknown) => ({ ok: true, json: async () => corpo });
  const erro400 = { ok: false, status: 400, json: async () => ({ erro: "Parâmetros inválidos", campos: { fim: "Ano final inválido." } }) };
  const valor = (rotulo: string) => (screen.getByLabelText(rotulo) as HTMLSelectElement).value;
  const texto = (rotulo: string) => (screen.getByLabelText(rotulo) as HTMLSelectElement).selectedOptions[0]!.textContent;

  it("(d) URL sem parâmetros mostra os padrões resolvidos pelo backend", async () => {
    busca = "";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ok(pecuaria)));
    render(<BlocoPecuaria />, { wrapper: clienteEstavel() });
    await screen.findByTestId("manchete");
    expect([valor("Rebanho"), valor("De"), valor("Até")]).toEqual(["bovino", "2020", "2022"]);
  });

  it("(a)(b) a escolha do usuário permanece no seletor enquanto carrega e depois da resposta", async () => {
    busca = "";
    let resolver!: (v: unknown) => void;
    const segunda = new Promise((r) => { resolver = r; });
    const f = vi.fn().mockResolvedValueOnce(ok(pecuaria)).mockReturnValueOnce(segunda);
    vi.stubGlobal("fetch", f);
    const { rerender } = render(<BlocoPecuaria />, { wrapper: clienteEstavel() });
    await screen.findByTestId("manchete");
    await userEvent.selectOptions(screen.getByLabelText("Até"), "2021");
    busca = "pec_fim=2021";
    rerender(<BlocoPecuaria />);
    await vi.waitFor(() => expect(f).toHaveBeenCalledTimes(2));
    expect(f.mock.calls[1]![0]).toBe("/api/v1/observatorio/pecuaria?fim=2021");
    expect(screen.getByTestId("conteudo-bloco")).toHaveAttribute("aria-busy", "true");
    expect(valor("Até")).toBe("2021");
    expect(screen.getByLabelText("Até")).toBeEnabled();
    resolver(ok({ ...pecuaria, filtros: { ...pecuaria.filtros, valores: { rebanho: "bovino", inicio: 2020, fim: 2021 } } }));
    await vi.waitFor(() => expect(screen.getByTestId("conteudo-bloco")).not.toHaveAttribute("aria-busy"));
    expect(valor("Até")).toBe("2021");
  });

  it("(c) valor inválido na URL: após o 400 o seletor mostra o valor cru marcado como inválido e 'Voltar ao padrão' restaura os padrões", async () => {
    busca = "";
    const padroes = { ...pecuaria, filtros: { ...pecuaria.filtros, valores: { rebanho: "bovino", inicio: 2019, fim: 2022 } } };
    const f = vi.fn().mockResolvedValueOnce(ok(pecuaria)).mockResolvedValueOnce(erro400).mockResolvedValueOnce(ok(padroes));
    vi.stubGlobal("fetch", f);
    const { rerender } = render(<BlocoPecuaria />, { wrapper: clienteEstavel() });
    await screen.findByTestId("manchete");
    busca = "pec_fim=1900";
    rerender(<BlocoPecuaria />);
    await userEvent.click(await screen.findByRole("button", { name: "Voltar ao padrão" }));
    expect(valor("Até")).toBe("1900");
    expect(texto("Até")).toBe("1900 (valor inválido)");
    expect(valor("De")).toBe("2020");
    busca = "";
    rerender(<BlocoPecuaria />);
    await vi.waitFor(() => expect([valor("Rebanho"), valor("De"), valor("Até")]).toEqual(["bovino", "2019", "2022"]));
    expect(f.mock.calls[2]![0]).toBe("/api/v1/observatorio/pecuaria");
  });

  it("(c) Panorama com janela inválida na URL", async () => {
    busca = "";
    const f = vi.fn().mockResolvedValueOnce(ok(panorama)).mockResolvedValueOnce(erro400);
    vi.stubGlobal("fetch", f);
    const { rerender } = render(<BlocoPanorama />, { wrapper: clienteEstavel() });
    await screen.findByTestId("manchete");
    expect(valor("Janela")).toBe("10");
    busca = "pan_janela=7";
    rerender(<BlocoPanorama />);
    await screen.findByRole("button", { name: "Voltar ao padrão" });
    expect(valor("Janela")).toBe("7");
    expect(texto("Janela")).toBe("7 (valor inválido)");
  });

  it("a manchete fica dentro da região marcada como ocupada", async () => {
    busca = "";
    let resolver!: (v: unknown) => void;
    const f = vi.fn().mockResolvedValueOnce(ok(pecuaria)).mockReturnValueOnce(new Promise((r) => { resolver = r; }));
    vi.stubGlobal("fetch", f);
    const { rerender } = render(<BlocoPecuaria />, { wrapper: clienteEstavel() });
    await screen.findByTestId("manchete");
    busca = "pec_rebanho=ovino";
    rerender(<BlocoPecuaria />);
    await vi.waitFor(() => expect(screen.getByTestId("conteudo-bloco")).toHaveAttribute("aria-busy", "true"));
    expect(screen.getByTestId("conteudo-bloco")).toContainElement(screen.getByTestId("manchete"));
    expect(screen.getByTestId("conteudo-bloco")).toContainElement(screen.getByRole("link", { name: /Ver no Painel/ }));
    resolver(ok(pecuaria));
  });
});

describe("Panorama: evolução em linhas empilhadas explica que a linha de cima é a soma", () => {
  it("mostra, junto do gráfico, que a linha mais alta (à direita) é a soma de todos os itens", async () => {
    vi.stubGlobal("fetch", roteador());
    render(<BlocoPanorama />, { wrapper });
    await screen.findByTestId("manchete");
    expect(screen.getByText(/As linhas estão empilhadas/)).toHaveTextContent(
      "As linhas estão empilhadas: cada uma soma o valor do seu item ao dos itens abaixo dela. A linha mais alta, na ponta direita do gráfico, é a soma de todos os itens apresentados (incluindo os demais produtos), ou seja, o valor total da produção em cada ano.",
    );
    // o gráfico é simulado neste arquivo: o que o componente entrega é o rótulo acessível
    expect(screen.getByLabelText(/linhas empilhadas.*soma de todos os itens/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Ver como tabela" }));
    expect(screen.queryByText(/As linhas estão empilhadas/)).not.toBeInTheDocument();
  });
});

describe("visão em tabela: uma tabela por gráfico e KPIs sempre visíveis (F6)", () => {
  const tabela = (nome: string | RegExp) => screen.getByRole("table", { name: nome });
  const alternar = () => userEvent.click(screen.getByRole("button", { name: "Ver como tabela" }));

  it("Panorama: KPIs com unidade por extenso, tabela da composição e da evolução", async () => {
    vi.stubGlobal("fetch", roteador());
    render(<BlocoPanorama />, { wrapper });
    await screen.findByTestId("manchete");
    const valor = () => screen.getByText("Valor da produção").nextElementSibling;
    expect(valor()).toHaveTextContent("R$ 17 bi");
    await alternar();
    expect(valor()).toHaveTextContent("R$ 17 bi");
    expect(screen.getByText("Variação real no período").nextElementSibling).toHaveTextContent("201,15%");
    expect(screen.queryAllByTestId("grafico")).toHaveLength(0);
    expect(within(tabela("Composição do valor da produção")).getByText("Soja (em grão)").closest("tr")).toHaveTextContent("5.000");
    const evolucao = tabela("Evolução do valor da produção, ano a ano");
    expect(within(evolucao).getAllByRole("row")).toHaveLength(3);
    expect(within(evolucao).getByRole("columnheader", { name: "Soja (em grão)" })).toBeInTheDocument();
    expect(within(evolucao).getByText("2024").closest("tr")).toHaveTextContent("2");
    // a coluna Soma repete, na tabela, o que a linha de cima do gráfico mostra: o total de todos os itens em cada ano
    expect(within(evolucao).getByRole("columnheader", { name: "Soma" })).toBeInTheDocument();
    expect(within(evolucao).getByText("2024").closest("tr")!.lastElementChild).toHaveTextContent("2");
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(expect.arrayContaining(["Composição do valor da produção", "Evolução do valor da produção, ano a ano"]));
  });

  it("Crescimento: decomposição, índices/perda e valor por hectare em tabelas", async () => {
    vi.stubGlobal("fetch", roteador());
    render(<BlocoCrescimento />, { wrapper });
    await screen.findByTestId("manchete");
    await alternar();
    expect(screen.queryAllByTestId("grafico")).toHaveLength(0);
    const decomposicao = tabela("Decomposição da variação da produção");
    expect(within(decomposicao).getByText("Expansão de área").closest("tr")).toHaveTextContent("60");
    expect(within(decomposicao).getByText("Ganho de produtividade").closest("tr")).toHaveTextContent("40");
    expect(within(decomposicao).getByText("Variação da produção").closest("tr")).toHaveTextContent("10");
    expect(within(tabela("Valor por hectare das culturas no ano final")).getByText("Soja").closest("tr")).toHaveTextContent("7.000");
    expect(tabela(/Índices de área/)).toBeInTheDocument();
  });

  it("Território: KPIs, mapa, microrregiões e dependentes em tabela", async () => {
    const dep = { ...territorio, series: { ...territorio.series, dependentes: [{ codigo_ibge: "1100023", nome: "Ariquemes", cultura: "Soja", participacao: 83.3 }] } };
    vi.stubGlobal("fetch", vi.fn(async (url: string) => (url.startsWith("/geo/") ? { ok: true, json: async () => ({ type: "FeatureCollection", features: [] }) } : { ok: true, json: async () => dep })));
    render(<BlocoTerritorio />, { wrapper });
    await screen.findByTestId("manchete");
    expect(screen.getByText("5 maiores").nextElementSibling).toHaveTextContent("100%");
    await alternar();
    expect(screen.getByText("5 maiores").nextElementSibling).toHaveTextContent("100%");
    expect(screen.getByText("HHI").nextElementSibling).toHaveTextContent("5.000");
    expect(within(tabela("Valores por município")).getAllByRole("row")).toHaveLength(4);
    expect(within(tabela("Total por microrregião")).getByText("Ariquemes").closest("tr")).toHaveTextContent("10");
    expect(within(tabela("Municípios dependentes de uma cultura")).getByText("Ariquemes").closest("tr")).toHaveTextContent("Soja83,3");
  });

  it("Pecuária: KPIs de leite visíveis, efetivo, municípios, composição e polos em tabelas", async () => {
    vi.stubGlobal("fetch", roteador());
    render(<BlocoPecuaria />, { wrapper });
    await screen.findByTestId("manchete");
    await alternar();
    expect(screen.getByRole("heading", { level: 3, name: "Leite" })).toBeInTheDocument();
    expect(screen.getByText("Litros por vaca/ano").nextElementSibling).toHaveTextContent("2.001");
    expect(screen.queryAllByTestId("grafico")).toHaveLength(0);
    const efetivo = tabela("Efetivo ao longo dos anos");
    expect(within(efetivo).getByText("2022").closest("tr")).toHaveTextContent("100");
    expect(within(tabela("Composição dos rebanhos no ano final")).getByText("Bovino").closest("tr")).toHaveTextContent("100");
    expect(tabela("Efetivo por município no ano final")).toBeInTheDocument();
    expect(tabela("Polos de leite")).toBeInTheDocument();
  });

  it("Pecuária: leite em unidades por extenso (milhões de litros, R$ bi/mi)", async () => {
    const leite = { ...pecuaria, metricas: { ...pecuaria.metricas, leite: { volume_mil_litros: 583715, valor_real: 1251099, produtividade_l_vaca: 2001, variacao_produtividade_pct: 1 } } };
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => leite })));
    render(<BlocoPecuaria />, { wrapper });
    await screen.findByTestId("manchete");
    expect(screen.getByText("Volume de leite").nextElementSibling).toHaveTextContent("583,7 milhões de litros");
    expect(screen.getByText(/Valor do leite/).nextElementSibling).toHaveTextContent("R$ 1,3 bi");
  });
});
