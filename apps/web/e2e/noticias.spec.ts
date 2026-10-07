import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const cartoes = (page: import("@playwright/test").Page) => page.locator('section[aria-label="Lista de notícias"] > ul > li');

test("Início → Ver todas as notícias → lista com 12 cartões", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Ver todas as notícias" }).first().click();
  await expect(page).toHaveURL(/\/noticias$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Todas as notícias");
  await expect(cartoes(page)).toHaveCount(12);
  await expect(page.getByRole("status")).toContainText("20 notícias, página 1 de 2");
});

test("filtrar por categoria mostra só as notícias dela e reflete na URL", async ({ page }) => {
  await page.goto("/noticias");
  await page.getByRole("navigation", { name: "Filtrar por categoria" }).getByRole("link", { name: /^Geral/ }).click();
  await expect(page).toHaveURL(/categoria=geral/);
  await expect(page.getByRole("link", { name: /^Geral/ })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("status")).toContainText("em Geral");
  const etiquetas = page.getByTestId("categorias");
  const total = await cartoes(page).count();
  expect(total).toBeGreaterThan(0);
  for (const e of await etiquetas.all()) await expect(e).toContainText("Geral");
});

test("a página 2 traz o resto e Anterior volta à 1", async ({ page }) => {
  await page.goto("/noticias");
  await page.getByRole("navigation", { name: "Paginação" }).getByRole("link", { name: "Página 2" }).click();
  await expect(page).toHaveURL(/pagina=2/);
  await expect(cartoes(page)).toHaveCount(8);
  await expect(page.getByRole("status")).toContainText("página 2 de 2");
  await page.getByRole("link", { name: "Página anterior" }).click();
  await expect(page).toHaveURL(/\/noticias$/);
  await expect(cartoes(page)).toHaveCount(12);
});

test("parâmetros inválidos não quebram a página", async ({ page }) => {
  await page.goto("/noticias?categoria=nada&pagina=abc");
  await expect(cartoes(page)).toHaveCount(12);
  await page.goto("/noticias?pagina=99");
  await expect(cartoes(page)).toHaveCount(8);
  await expect(page.getByRole("status")).toContainText("página 2 de 2");
});

test("/blog (endereço do Wix) redireciona para /noticias", async ({ page }) => {
  await page.goto("/blog");
  await expect(page).toHaveURL(/\/noticias$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Todas as notícias");
});

test("cada notícia abre o texto no Wix em nova aba", async ({ page }) => {
  await page.goto("/noticias");
  const primeiro = cartoes(page).first().getByRole("link");
  await expect(primeiro).toHaveAttribute("href", /^https:\/\/www\.faperon\.com\.br\/post\//);
  await expect(primeiro).toHaveAttribute("target", "_blank");
});

test("sem violações sérias de acessibilidade (axe), em claro e escuro", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const tema of ["claro", "escuro"]) {
    await page.addInitScript((t) => localStorage.setItem("faperon-tema", t), tema);
    await page.goto("/noticias");
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const serias = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serias, JSON.stringify(serias.map((v) => ({ id: v.id, nos: v.nodes.map((n) => n.target) })))).toEqual([]);
  }
});

test("a 1024 px o cabeçalho com 6 itens cabe numa linha, sem transbordar", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/noticias");
  const itens = page.getByRole("navigation", { name: "Principal" }).getByRole("link");
  await expect(itens).toHaveCount(6);
  const caixas = await itens.evaluateAll((els) => els.map((e) => e.getBoundingClientRect()));
  expect(new Set(caixas.map((c) => Math.round(c.top))).size, "todos os itens na mesma linha").toBe(1);
  const excesso = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(excesso).toBeLessThanOrEqual(1);
  const direita = Math.max(...caixas.map((c) => c.right));
  expect(direita).toBeLessThanOrEqual(1024);
});

test("o cabeçalho não transborda nem encosta na borda entre 1024 e 1280 px", async ({ page }) => {
  await page.goto("/noticias");
  // 1024 e 1104–1120 são as larguras em que o menu de 6 itens estourava no Linux (a renderização do texto lá é um pouco mais larga).
  for (const largura of [1024, 1040, 1072, 1100, 1104, 1120, 1152, 1200, 1280]) {
    await page.setViewportSize({ width: largura, height: 768 });
    const medidas = await page.evaluate(() => {
      const visiveis = [...document.querySelectorAll("header a, header button")].map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0 && r.height > 0);
      const itens = [...document.querySelectorAll('header nav[aria-label="Principal"] a')].map((e) => Math.round(e.getBoundingClientRect().top));
      return {
        excesso: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        direita: Math.max(...visiveis.map((r) => r.right)),
        linhas: new Set(itens).size,
      };
    });
    expect(medidas.linhas, `${largura}px: todos os itens na mesma linha`).toBe(1);
    expect(medidas.excesso, `${largura}px: sem rolagem horizontal`).toBeLessThanOrEqual(1);
    // folga mínima de 8 px entre o último controle do cabeçalho e a borda da tela
    expect(medidas.direita, `${largura}px: o último controle precisa ficar a 8 px ou mais da borda`).toBeLessThanOrEqual(largura - 8);
  }
});
