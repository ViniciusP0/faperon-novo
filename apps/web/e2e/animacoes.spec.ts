import { expect, test } from "@playwright/test";

test("seções abaixo da dobra são reveladas ao rolar", async ({ page }) => {
  await page.goto("/sobre");
  const secao = page.locator("#diretoria");
  await expect(secao).toHaveClass(/revelar/);
  await secao.scrollIntoViewIfNeeded();
  await expect(secao).toHaveClass(/revelar-visivel/);
  await expect(secao).toHaveCSS("opacity", "1");
});

test("com movimento reduzido tudo aparece sem rolar", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/sobre");
  await expect(page.locator("#estatuto")).toHaveCSS("opacity", "1");
});

test("link direto para uma âncora revela a seção de destino", async ({ page }) => {
  await page.goto("/sobre#estatuto");
  await expect(page.locator("#estatuto")).toHaveClass(/revelar-visivel/);
  await expect(page.locator("#estatuto")).toHaveCSS("opacity", "1");
});

test.describe("sem JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("o conteúdo continua visível", async ({ page }) => {
    await page.goto("/sobre");
    await expect(page.locator("#estatuto")).toHaveCSS("opacity", "1");
    await expect(page.locator("#diretoria")).toHaveCSS("opacity", "1");
  });
});
