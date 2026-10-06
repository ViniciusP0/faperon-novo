import { expect, test } from "@playwright/test";

test("seção abaixo da dobra fica pendente e é revelada ao rolar", async ({ page }) => {
  await page.goto("/sobre");
  const secao = page.locator("#diretoria");
  await expect(secao).toHaveClass(/revelar-pendente/);
  await secao.scrollIntoViewIfNeeded();
  await expect(secao).not.toHaveClass(/revelar-pendente/);
  await expect(secao).toHaveCSS("opacity", "1");
});

test("conteúdo que já está na tela ao carregar nunca é escondido", async ({ page }) => {
  await page.goto("/sobre");
  const quemSomos = page.locator("#quem-somos"); // começa a ~556 px, dentro da janela de 720 px
  await expect(quemSomos).toBeVisible();
  await expect(quemSomos).not.toHaveClass(/revelar-pendente/);
  await expect(quemSomos).toHaveCSS("opacity", "1");
});

test("com movimento reduzido tudo aparece sem rolar", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/sobre");
  await expect(page.locator("#estatuto")).not.toHaveClass(/revelar-pendente/);
  await expect(page.locator("#estatuto")).toHaveCSS("opacity", "1");
});

test("link direto para uma âncora deixa a seção de destino visível", async ({ page }) => {
  await page.goto("/sobre#estatuto");
  await expect(page.locator("#estatuto")).not.toHaveClass(/revelar-pendente/);
  await expect(page.locator("#estatuto")).toHaveCSS("opacity", "1");
});

test("a impressão mostra as seções ainda não rolada", async ({ page }) => {
  await page.goto("/sobre");
  await expect(page.locator("#estatuto")).toHaveClass(/revelar-pendente/);
  await page.emulateMedia({ media: "print" });
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
