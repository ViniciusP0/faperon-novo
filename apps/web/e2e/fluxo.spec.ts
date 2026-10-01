import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function semViolacoesSerias(page: Page) {
  const resultado = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const serias = resultado.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serias, JSON.stringify(serias.map((v) => ({ id: v.id, nos: v.nodes.map((n) => n.target) })), null, 2)).toEqual([]);
}

test("jornada Início → Central → Painel → filtros → ranking → série → PDF", async ({ page }) => {
  // Início
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("FAPERON");

  // Carrossel: 1 FAPERON, 2 números (conteúdo anterior do hero), 3 SENAR
  const carrossel = page.getByRole("region", { name: "Destaques da FAPERON" });
  await expect(carrossel.getByRole("heading", { level: 2, name: "A voz do produtor rural de Rondônia" })).toBeVisible();
  await expect(carrossel.getByRole("link", { name: /Conheça a FAPERON/ })).toHaveAttribute("href", "/sobre");
  await semViolacoesSerias(page);
  await carrossel.getByRole("button", { name: "Próximo slide" }).click();
  await expect(page.getByRole("heading", { level: 2 }).filter({ hasText: /Rondônia colheu .*toneladas de soja/ })).toBeVisible();
  await expect(carrossel.getByRole("link", { name: /Abrir o Painel Agro Analítico/ })).toBeVisible();
  await semViolacoesSerias(page);
  await carrossel.getByRole("button", { name: /Ir para o slide 3/ }).click();
  await expect(carrossel.getByRole("heading", { level: 2, name: /Capacitação e assistência técnica/ })).toBeVisible();
  await expect(carrossel.getByRole("link", { name: /Conheça o Sistema FAPERON\/SENAR/ })).toHaveAttribute("href", "https://sistemafaperon.org.br/");
  await semViolacoesSerias(page);
  await carrossel.getByRole("button", { name: /Ir para o slide 2/ }).click();

  const abas = page.getByRole("tab");
  await expect(abas).toHaveCount(6);
  await expect(page.getByRole("tab", { selected: true })).toContainText("Soja");
  await page.getByRole("tab", { name: /Leite/ }).click();
  await expect(page.getByRole("tabpanel")).toContainText("Leite: produção de origem animal");
  await expect(page.getByRole("tabpanel")).toContainText("litros");
  await page.getByRole("tab", { name: /Leite/ }).press("ArrowRight");
  await expect(page.getByRole("tab", { selected: true })).toContainText("Soja");
  await expect(page.getByRole("tabpanel").getByRole("link", { name: /Ver os 52 municípios no painel/ })).toHaveAttribute("href", /\/painel\?segmento=agricultura&produto=soja-em-grao/);
  await expect(page.getByRole("heading", { name: "Notícias recentes" })).toBeVisible();

  // Bloco SENAR fica acima das notícias e cada banner leva ao Sistema FAPERON/SENAR
  const tituloSenar = page.getByRole("heading", { level: 2, name: "Sistema FAPERON/SENAR", exact: true });
  await expect(tituloSenar).toBeVisible();
  const yNoticias = (await page.getByRole("heading", { name: "Notícias recentes" }).boundingBox())!.y;
  expect((await tituloSenar.boundingBox())!.y).toBeLessThan(yNoticias);
  const banners = page.getByRole("region", { name: "Banners do Sistema FAPERON/SENAR" });
  await expect(banners.getByRole("link", { name: /Transformando o campo/ })).toHaveAttribute("href", "https://sistemafaperon.org.br/");
  await banners.getByRole("button", { name: "Próximo banner" }).click();
  await expect(banners.getByRole("link", { name: /Processo Seletivo Senar e-Tec/ })).toBeVisible();
  await expect(page.locator("main a[href*=\"faperon.com.br/post/\"]")).toHaveCount(3);
  await expect(page.getByRole("main").locator("img[src^=\"/noticias/\"]").first()).toBeVisible();
  const cna = page.getByRole("link", { name: /Confira os preços na CNA/ });
  await expect(cna).toHaveAttribute("href", /cnabrasil\.org\.br\/servicos\/precos-commodities/);
  await expect(page.getByRole("heading", { name: "Nosso Agro", level: 2, exact: true })).toBeVisible();
  await semViolacoesSerias(page);

  // Central
  await page.getByRole("link", { name: "Conheça a Central de Inteligência" }).click();
  await expect(page).toHaveURL(/central-de-inteligencia/);
  await expect(page.getByRole("heading", { level: 1, name: "Central de Inteligência" })).toBeVisible();
  await semViolacoesSerias(page);

  // Painel
  await page.getByRole("link", { name: /Abrir o Painel Agro Analítico/ }).first().click();
  await expect(page).toHaveURL(/\/painel/);
  await expect(page.getByText("Escolha um segmento e um produto")).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Nota metodológica" })).toContainText("SIDRA");

  // Filtros: busca de produto por nome sem acento
  await page.getByLabel("Buscar produto").fill("cafe");
  await expect(page.getByLabel("Produto", { exact: true }).locator("option")).toHaveCount(2); // placeholder + 1
  await page.getByLabel("Buscar produto").fill("soja");
  await page.getByLabel("Produto", { exact: true }).selectOption({ label: "Soja (em grão)" });

  // Ranking com 52 municípios e filtros na URL
  const tabela = page.getByRole("table").first();
  await expect(tabela.getByRole("row")).toHaveCount(53); // cabeçalho + 52
  await expect(page).toHaveURL(/produto=soja-em-grao/);
  await expect(page).toHaveURL(/indicador=/);
  await expect(page).toHaveURL(/inicio=\d{4}/);
  await expect(page.getByRole("complementary", { name: "Nota metodológica" })).toContainText("Tabela SIDRA 5457");
  await expect(tabela.getByRole("cell", { name: /^X/ }).first()).toBeVisible(); // sigiloso
  await semViolacoesSerias(page);

  // Série histórica
  await page.getByRole("tab", { name: "Série histórica" }).click();
  await expect(page).toHaveURL(/aba=serie/);
  await expect(page.getByTestId("grafico").locator("svg")).toBeVisible();
  await expect(page.getByTestId("serie-descricao")).toContainText("Rondônia (total)");
  await expect(page.getByTestId("serie-tendencia")).toContainText(/Linha de tendência .* (crescimento médio|queda média) de [+−][\d.,]+ .* por ano \(R² = \d,\d\d\)/);
  await expect(page.getByTestId("grafico")).toHaveAttribute("aria-label", /Linha de tendência/);
  await page.getByLabel("Recorte territorial").selectOption({ label: "Vilhena" });
  await expect(page.getByTestId("serie-descricao")).toContainText("Vilhena");
  await page.getByText("Ver tabela de dados do gráfico").click();
  await expect(page.getByRole("table", { name: /Série histórica/ })).toBeVisible();
  await expect(page.getByRole("table", { name: /Série histórica/ }).getByRole("columnheader", { name: "Tendência linear" })).toBeVisible();
  await semViolacoesSerias(page);

  // PDF: link com os filtros
  const pdf = page.getByRole("link", { name: "Gerar PDF" });
  await expect(pdf).toHaveAttribute("href", /\/api\/v1\/relatorio\.pdf\?.*produto=soja-em-grao.*municipio=1100304/);
  const resposta = await page.request.get((await pdf.getAttribute("href"))!);
  expect(resposta.status()).toBe(200);
  expect(resposta.headers()["content-type"]).toContain("application/pdf");
});

test("o link da consulta reproduz os mesmos filtros", async ({ page }) => {
  await page.goto("/painel?segmento=pecuaria&produto=leite&indicador=valor-da-producao&inicio=2018&fim=2022&aba=analise");
  await expect(page.getByLabel("Produto", { exact: true })).toHaveValue("leite");
  await expect(page.getByLabel("Ano inicial")).toHaveValue("2018");
  await expect(page.getByLabel("Ano final")).toHaveValue("2022");
  await expect(page.getByRole("tab", { name: "Análise estratégica" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "Análise estratégica" })).toBeVisible();
  await expect(page.getByText(/Leite — Valor da produção, 2018–2022/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cinco maiores municípios" })).toBeVisible();
  await semViolacoesSerias(page);
});

test("comparação: municípios, produtos e bloqueio de unidades diferentes", async ({ page }) => {
  await page.goto("/painel?segmento=agricultura&produto=soja-em-grao&indicador=quantidade-produzida&inicio=2015&fim=2024&aba=comparacao");
  await expect(page.getByText("Selecione pelo menos 2 municípios")).toBeVisible();

  await page.getByRole("button", { name: "Usar os 3 maiores do ranking" }).click();
  await expect(page.getByTestId("grafico").locator("svg")).toBeVisible();
  await expect(page.getByRole("list", { name: "Itens selecionados" }).getByRole("listitem")).toHaveCount(3);

  // limite de 5
  await page.getByLabel(/Adicionar município/).selectOption({ index: 1 });
  await page.getByLabel(/Adicionar município/).selectOption({ index: 1 });
  await expect(page.getByLabel(/Adicionar município/)).toBeDisabled();

  // produtos com unidades diferentes (Toneladas × Quilogramas) → 422
  await page.getByLabel("Produtos", { exact: true }).click();
  await expect(page.getByLabel("Produtos", { exact: true })).toBeChecked();
  await page.getByLabel(/Adicionar produto/).selectOption({ label: "Cacau (em amêndoa)" });
  await expect(page.getByRole("alert").filter({ hasText: "Comparação bloqueada" })).toBeVisible();
  await expect(page.getByTestId("grafico")).toHaveCount(0);

  // produtos com a mesma unidade → gráfico
  await page.getByRole("button", { name: "Remover Cacau (em amêndoa)" }).click();
  await expect(page.getByRole("button", { name: "Remover Cacau (em amêndoa)" })).toHaveCount(0);
  await page.getByLabel(/Adicionar produto/).selectOption({ label: "Milho (em grão)" });
  await expect(page.getByTestId("grafico").locator("svg")).toBeVisible();
  await semViolacoesSerias(page);
});

test("teclado: abas do painel navegam com setas", async ({ page }) => {
  await page.goto("/painel?produto=soja-em-grao&indicador=area-plantada&inicio=2015&fim=2024");
  const primeira = page.getByRole("tab", { name: "Ranking" });
  await primeira.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Série histórica" })).toBeFocused();
  await expect(page).toHaveURL(/aba=serie/);
});

test("navegação e páginas auxiliares", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  const sobre = page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: /^Sobre/ });
  await expect(sobre).toHaveAttribute("href", "/sobre");
  expect((await request.get("/robots.txt")).status()).toBe(200);
  const sitemapXml = await (await request.get("/sitemap.xml")).text();
  expect(sitemapXml).toContain("/painel");
  expect(sitemapXml).toContain("/sobre");
  const r404 = await page.goto("/nao-existe");
  expect(r404?.status()).toBe(404);
});

test("páginas institucionais: Sobre, Informativos Técnicos e Fale Conosco", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });

  await page.goto("/sobre");
  await expect(page.getByRole("heading", { level: 1, name: /Desde 1983, a FAPERON representa o produtor rural/ })).toBeVisible();
  await expect(page.getByText("Hélio Dias de Souza")).toBeVisible();
  await expect(page.getByRole("link", { name: /Estatuto FAPERON/ })).toHaveAttribute("href", /\.pdf$/);
  await expect(page.getByRole("heading", { level: 2, name: "Estatuto" })).toBeVisible();
  await semViolacoesSerias(page);
  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: /^Sobre/ }).click();
  await expect(page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: /^Sobre/ })).toHaveAttribute(
    "aria-current",
    "page",
  );

  await page.goto("/informativos-tecnicos");
  await expect(page.getByRole("heading", { level: 1, name: /Informativos mensais do agro de Rondônia/ })).toBeVisible();
  await expect(page.getByRole("tabpanel").getByRole("button")).toHaveCount(12);
  await page.getByRole("button", { name: /Bovinocultura de Corte, Dezembro\/2025/ }).click();
  const previa = page.getByRole("dialog", { name: /Bovinocultura de Corte – Dezembro\/2025/ });
  await expect(previa).toBeVisible();
  await expect(previa.getByRole("link", { name: /Baixar Dezembro\/2025/ })).toHaveAttribute("href", /\.pdf$/);
  await page.keyboard.press("Escape");
  await expect(previa).toBeHidden();
  await page.getByRole("tab", { name: "Bovinocultura de Leite" }).click();
  await page.getByRole("button", { name: "2024", exact: true }).click();
  await expect(page.getByRole("tabpanel").getByRole("button")).toHaveCount(1);
  await page.getByRole("button", { name: "Lista" }).click();
  await expect(page.getByRole("tabpanel").getByRole("link")).toHaveCount(1);
  await semViolacoesSerias(page);

  await page.goto("/fale-conosco");
  await expect(page.getByRole("heading", { level: 1, name: /Fale com a FAPERON pelos canais oficiais/ })).toBeVisible();
  await expect(page.getByLabel(/E-mail/)).toBeVisible();
  await semViolacoesSerias(page);
});
