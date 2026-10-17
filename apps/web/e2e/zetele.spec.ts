import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // a saudação automática não interessa aqui
  await page.addInitScript(() => window.sessionStorage.setItem("zetele-saudou", "1"));
});

test("no Painel, a pergunta de soja responde com fonte e abre o Painel filtrado", async ({ page }) => {
  await page.goto("/painel");
  await page.getByRole("button", { name: "Falar com o Zétele, assistente do site" }).click();
  const dialogo = page.getByRole("dialog", { name: "Zétele" });
  await expect(dialogo).toBeVisible();
  await dialogo.getByRole("button", { name: "Qual município mais produz soja em Rondônia?" }).click();
  await expect(dialogo.getByText(/Ariquemes/)).toBeVisible();

  const r = await new AxeBuilder({ page }).include("#zetele-painel").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(r.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);

  await dialogo.getByRole("link", { name: "Ver no site" }).click();
  await expect(page).toHaveURL(/produto=soja-em-grao/);
});

test("o Zétele não aparece em Sobre", async ({ page }) => {
  await page.goto("/sobre");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: "Falar com o Zétele, assistente do site" })).toHaveCount(0);
});

test("fica no canto inferior direito, com o balão, e acompanha a rolagem", async ({ browser }) => {
  const contexto = await browser.newContext();
  const page = await contexto.newPage();
  await page.goto("/");
  const botao = page.getByRole("button", { name: "Falar com o Zétele, assistente do site" });
  await expect(page.getByRole("button", { name: "Oi! Posso ajudar?" })).toBeVisible();
  const caixa = (await botao.boundingBox())!;
  const tela = page.viewportSize()!;
  expect(caixa.x).toBeGreaterThan(tela.width / 2);
  expect(caixa.y + caixa.height).toBeGreaterThan(tela.height - 200);
  await page.mouse.wheel(0, 4000);
  await expect(botao).toBeInViewport();
  await contexto.close();
});

test("o balão fechado no X não volta na mesma visita", async ({ browser }) => {
  const contexto = await browser.newContext();
  const page = await contexto.newPage();
  await page.goto("/");
  await page.getByRole("button", { name: "Fechar saudação" }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Falar com o Zétele, assistente do site" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Oi! Posso ajudar?" })).toHaveCount(0);
  await contexto.close();
});
