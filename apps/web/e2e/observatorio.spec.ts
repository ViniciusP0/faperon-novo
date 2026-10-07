import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const BLOCOS = ["O tamanho e a composição do agro", "Por que a produção cresceu", "Onde a produção acontece", "Rebanhos e leite"];

// Os quatro blocos com manchete e o mapa desenhado (svg com caminhos): só então a página está estável.
async function aguardarPaginaCompleta(page: Page) {
  for (const nome of BLOCOS) await expect(page.getByRole("region", { name: nome }).getByTestId("manchete")).toBeVisible();
  await expect(page.getByRole("region", { name: "Onde a produção acontece" }).locator("svg path").first()).toBeAttached();
}

async function semViolacoesSerias(page: Page) {
  const resultado = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const serias = resultado.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serias, JSON.stringify(serias.map((v) => ({ id: v.id, nos: v.nodes.map((n) => n.target) })), null, 2)).toEqual([]);
}

test("Central → Observatório → filtro na URL → link reproduz → Painel", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/central-de-inteligencia");
  await page.getByRole("link", { name: /Abrir o Observatório/ }).click();
  await expect(page).toHaveURL(/\/central-de-inteligencia\/observatorio$/);

  const territorio = page.getByRole("region", { name: "Onde a produção acontece" });
  await expect(territorio.getByTestId("manchete")).toBeVisible();
  await territorio.getByLabel("Métrica").selectOption("area");
  await expect(page).toHaveURL(/ter_metrica=area/);

  await page.reload();
  await expect(page.getByRole("region", { name: "Onde a produção acontece" }).getByLabel("Métrica")).toHaveValue("area");

  await aguardarPaginaCompleta(page); // mapa desenhado antes de trocá-lo pela tabela
  await territorio.getByRole("button", { name: "Ver como tabela" }).click();
  await expect(territorio.getByRole("table")).toContainText("sigiloso");
  for (const nome of BLOCOS) await expect(page.getByRole("region", { name: nome }).getByTestId("manchete")).toBeVisible();
  await semViolacoesSerias(page);

  const crescimento = page.getByRole("region", { name: "Por que a produção cresceu" });
  await crescimento.getByRole("link", { name: /Ver no Painel/ }).click();
  await expect(page).toHaveURL(/\/painel\?produto=.*indicador=quantidade-produzida/);
});

test("avisos de qualidade são exibidos", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/central-de-inteligencia/observatorio");
  await expect(page.getByRole("region", { name: "O tamanho e a composição do agro" }).getByText(/não inclui carne bovina/)).toBeVisible();
  await expect(page.getByRole("region", { name: "Onde a produção acontece" }).getByText(/1 município com dado sigiloso para alguma cultura fica sem cultura dominante/)).toBeVisible();
  await expect(page.getByRole("region", { name: "Rebanhos e leite" }).getByText(/calculada sobre os 50 municípios/)).toBeVisible();
});

test("município sigiloso aparece como 'sigiloso' na tabela, nunca como zero", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/central-de-inteligencia/observatorio");
  const territorio = page.getByRole("region", { name: "Onde a produção acontece" });
  await territorio.getByRole("button", { name: "Ver como tabela" }).click();
  const linha = territorio.getByRole("row").filter({ hasText: "Alta Floresta D'Oeste" });
  await expect(linha).toHaveCount(1);
  await expect(linha.getByRole("cell").nth(2)).toHaveText("sigiloso");
  await expect(linha.getByRole("cell").filter({ hasText: /^0$/ })).toHaveCount(0);
});

test("parâmetro inválido em um bloco não derruba os outros", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/central-de-inteligencia/observatorio?pan_janela=7");
  const panorama = page.getByRole("region", { name: "O tamanho e a composição do agro" });
  await expect(panorama.getByRole("button", { name: "Voltar ao padrão" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Rebanhos e leite" }).getByTestId("manchete")).toBeVisible();
  await expect(page.getByRole("region", { name: "Onde a produção acontece" }).getByTestId("manchete")).toBeVisible();
  await panorama.getByRole("button", { name: "Voltar ao padrão" }).click();
  await expect(page).not.toHaveURL(/pan_janela/);
  await expect(panorama.getByTestId("manchete")).toBeVisible();
});

for (const tema of ["claro", "escuro"]) {
  test(`Observatório sem violações sérias de acessibilidade (axe), tema ${tema}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript((t) => localStorage.setItem("faperon-tema", t), tema);
    await page.goto("/central-de-inteligencia/observatorio");
    await expect(page.locator("html")).toHaveAttribute("data-theme", tema === "escuro" ? "dark" : "light");
    await aguardarPaginaCompleta(page);
    await semViolacoesSerias(page);
  });
}
