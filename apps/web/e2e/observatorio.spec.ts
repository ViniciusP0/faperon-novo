import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

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

  await territorio.getByRole("button", { name: "Ver como tabela" }).click();
  await expect(territorio.getByRole("table")).toContainText("sigiloso");

  await semViolacoesSerias(page);

  const crescimento = page.getByRole("region", { name: "Por que a produção cresceu" });
  await crescimento.getByRole("link", { name: /Ver no Painel/ }).click();
  await expect(page).toHaveURL(/\/painel\?produto=.*indicador=quantidade-produzida/);
});

test("avisos de qualidade aparecem e sigilo nunca vira zero", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/central-de-inteligencia/observatorio");
  const panorama = page.getByRole("region", { name: "O tamanho e a composição do agro" });
  await expect(panorama.getByText(/não inclui carne bovina/)).toBeVisible();
  const territorio = page.getByRole("region", { name: "Onde a produção acontece" });
  await expect(territorio.getByText(/sigilo/i).first()).toBeVisible();
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
    await expect(page.getByRole("region", { name: "Rebanhos e leite" }).getByTestId("manchete")).toBeVisible();
    await expect(page.getByRole("region", { name: "Onde a produção acontece" }).getByTestId("manchete")).toBeVisible();
    await semViolacoesSerias(page);
  });
}
