import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function semViolacoesSerias(page: Page) {
  const resultado = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const serias = resultado.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serias, JSON.stringify(serias.map((v) => ({ id: v.id, nos: v.nodes.map((n) => n.target) })), null, 2)).toEqual([]);
}

async function login(page: Page) {
  await page.goto("/login");
  if (await page.getByLabel("E-mail").isVisible().catch(() => false)) {
    await page.getByLabel("E-mail").fill("user@faperon.br");
    await page.getByLabel("Senha").fill("Senha@123");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
  }
}

async function entrarComo(page: Page, nome: string) {
  await login(page);
  await page.getByRole("button", { name: `Entrar como ${nome}` }).click();
  await expect(page).toHaveURL(/\/sistema$/);
  await expect(page.getByRole("heading", { name: `Olá, ${nome.split(" ")[0]}` })).toBeVisible();
}

test("protótipo do sistema: agenda individual, reserva de veículo, frota e espaços", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/login");
  await expect(page.getByText(/Protótipo: dados fictícios/)).toBeVisible();
  await semViolacoesSerias(page);
  await page.getByLabel("E-mail").fill("user@faperon.br");
  await page.getByLabel("Senha").fill("errada");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "E-mail ou senha incorretos." })).toBeVisible();

  // Carla cria um evento e reserva um veículo; a reserva aparece na agenda dela
  await entrarComo(page, "Carla Mendes");
  await page.getByRole("link", { name: "Agenda", exact: true }).click();
  await page.getByRole("button", { name: "Novo evento", exact: true }).click();
  await page.getByLabel("Título").fill("Gravação com a TV");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByRole("button", { name: /Editar Gravação com a TV/ })).toBeVisible();
  await semViolacoesSerias(page);

  await page.goto("/sistema/frotas?aba=reservas");
  await page.getByRole("button", { name: "Nova reserva" }).click();
  await page.getByLabel("Veículo").selectOption({ label: "Mitsubishi L200 (NDE-4821)" });
  await page.getByLabel("Destino").fill("Pimenta Bueno");
  await page.getByRole("button", { name: "Reservar", exact: true }).click();
  await expect(page.getByText("Pimenta Bueno")).toBeVisible();
  await semViolacoesSerias(page);

  await page.goto("/sistema/agenda");
  await page.getByRole("button", { name: "Lista", exact: true }).click();
  await expect(page.getByRole("link", { name: /Viagem a Pimenta Bueno/ })).toBeVisible();

  // Marcos (gestor) vê outra agenda, registra manutenção e vê os custos
  await page.getByRole("button", { name: "Trocar de funcionário" }).click();
  await entrarComo(page, "Marcos Oliveira");
  await page.goto("/sistema/agenda");
  await expect(page.getByText("Gravação com a TV")).toHaveCount(0);

  await page.goto("/sistema/frotas?aba=abastecimento");
  await page.getByLabel("Veículo").nth(1).selectOption({ label: "Toyota Hilux CD (QRB2F41)" });
  await page.getByLabel("Km", { exact: true }).fill("61300");
  await page.getByLabel("Valor (R$)").fill("320");
  await page.getByRole("button", { name: "Registrar manutenção" }).click();
  await expect(page.getByText("Manutenção registrada.")).toBeVisible();
  await page.getByRole("tab", { name: "Custos" }).click();
  await expect(page.getByRole("img", { name: /Custos mensais/ })).toBeVisible();

  // Espaços: a fila mostra conflito e o gestor não aprova o pedido que choca com um aprovado
  await page.goto("/sistema/espacos?aba=fila");
  await expect(page.getByText(/Conflito com Oficina de redes sociais/)).toBeVisible();
  await page.getByRole("button", { name: "Aprovar Treinamento de técnicos de campo" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Já há um agendamento aprovado" })).toBeVisible();
  await page.getByRole("button", { name: "Aprovar Alinhamento com a oficina parceira" }).click();
  await expect(page.getByRole("button", { name: "Aprovar Alinhamento com a oficina parceira" })).toHaveCount(0);
  await semViolacoesSerias(page);
});

test("sem login, o sistema pede para entrar", async ({ page }) => {
  await page.goto("/sistema/frotas");
  await expect(page.getByRole("heading", { name: "Faça login para entrar no sistema" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ir para Acessar o sistema" })).toHaveAttribute("href", "/login");
});
