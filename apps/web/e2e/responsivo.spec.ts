import { expect, test } from "@playwright/test";

test("celular: menu abre, sem rolagem horizontal, painel usável", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await expect(page.getByRole("navigation", { name: "Principal (móvel)" })).toBeVisible();
  await page.getByRole("navigation", { name: "Principal (móvel)" }).getByRole("link", { name: "Central de Inteligência" }).click();
  await expect(page).toHaveURL(/central-de-inteligencia/);

  await page.goto("/painel?produto=soja-em-grao&indicador=quantidade-produzida&inicio=2015&fim=2024&aba=serie");
  await expect(page.getByTestId("grafico").locator("svg")).toBeVisible();
  const larguraPagina = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(larguraPagina).toBeLessThanOrEqual(1);
});

for (const rota of ["/sobre", "/informativos-tecnicos", "/fale-conosco"]) {
  test(`celular: ${rota} não tem rolagem horizontal`, async ({ page }) => {
    await page.goto(rota);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const excesso = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(excesso).toBeLessThanOrEqual(1);
  });
}
