import { expect, test } from "@playwright/test";

test("celular: menu abre, sem rolagem horizontal, painel usável", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await expect(page.getByRole("navigation", { name: "Principal (móvel)" })).toBeVisible();
  await page.getByRole("navigation", { name: "Principal (móvel)" }).getByRole("link", { name: "Painel Agro RO" }).click();
  await expect(page).toHaveURL(/\/painel/);

  await page.goto("/painel?produto=soja-em-grao&indicador=quantidade-produzida&inicio=2015&fim=2024&aba=serie");
  await expect(page.getByTestId("grafico").locator("svg")).toBeVisible();
  const larguraPagina = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(larguraPagina).toBeLessThanOrEqual(1);
});
