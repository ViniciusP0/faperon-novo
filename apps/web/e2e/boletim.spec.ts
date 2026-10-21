import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { semAreaDoZetele } from "./sem-zetele";

test.beforeEach(({ page }) => semAreaDoZetele(page));

async function semViolacoesSerias(page: Page) {
  const resultado = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const serias = resultado.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serias, JSON.stringify(serias.map((v) => ({ id: v.id, nos: v.nodes.map((n) => n.target) })), null, 2)).toEqual([]);
}

async function entrarComo(page: Page, nome: string) {
  await page.goto("/login");
  if (await page.getByLabel("E-mail").isVisible().catch(() => false)) {
    await page.getByLabel("E-mail").fill("user@faperon.br");
    await page.getByLabel("Senha", { exact: true }).fill("Senha@123");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
  }
  await page.getByRole("button", { name: `Entrar como ${nome}` }).click();
  await expect(page).toHaveURL(/\/sistema$/);
}

/** Datas relativas a hoje, no fuso do navegador: a página mostra o dia mais recente da lista. */
function iso(atras: number): string {
  const d = new Date();
  d.setDate(d.getDate() - atras);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const nota = (id: number, extra: Record<string, unknown> = {}) => ({
  id,
  origem: "uniao",
  diario: "DOU nº 198",
  orgao: "Incra",
  titulo: `Título da nota ${id}`,
  resumo: `Resumo da nota ${id}.`,
  rondonia: false,
  data: iso(0),
  url: `https://www.in.gov.br/web/dou/-/nota-${id}`,
  ...extra,
});

const fontes = { dou: { status: "ok", erro: "" }, doe: { status: "ok", erro: "" } };

/** A API do boletim é interceptada: o e2e confere a página, não a coleta. */
async function simularApi(page: Page) {
  await page.route("**/api/v1/boletim/dias", (r) =>
    r.fulfill({
      json: {
        dias: [
          { dia: iso(0), total: 3, tem_destaque: true, fontes: { dou: "ok", doe: "ok" } },
          { dia: iso(1), total: 1, tem_destaque: true, fontes: { dou: "ok", doe: "ok" } },
          { dia: iso(2), total: 0, tem_destaque: false, fontes: { dou: "sem_coleta", doe: "sem_coleta" } },
        ],
      },
    }),
  );
  await page.route("**/api/v1/boletim/dia/**", (r) => {
    const url = new URL(r.request().url());
    const dia = url.pathname.split("/").pop()!;
    const origem = url.searchParams.get("origem");
    if (dia === iso(1)) {
      return r.fulfill({ json: { dia, destaque: nota(10, { titulo: "Nota de ontem", data: dia }), notas: [], total: 1, fontes } });
    }
    const todas = [
      nota(1, { titulo: "Incra retifica o assentamento Jandaíra", rondonia: true }),
      nota(2, { titulo: "Banco Central atualiza o crédito rural", orgao: "Banco Central" }),
      nota(3, { titulo: "Sepat cria comissão de titulação", origem: "estado", diario: "DOE-RO nº 201", orgao: "Sepat", rondonia: true }),
    ];
    const lista = origem ? todas.filter((n) => n.origem === origem) : todas;
    const [destaque, ...resto] = lista;
    r.fulfill({ json: { dia, destaque: destaque ?? null, notas: resto, total: lista.length, fontes } });
  });
}

test("Marcos vê o Boletim depois de Relatórios, abre o dia e troca de dia e de origem", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await simularApi(page);
  await entrarComo(page, "Marcos Oliveira");

  const menu = page.getByRole("navigation", { name: "Seções do sistema" });
  const nomes = await menu.getByRole("link").allTextContents();
  expect(nomes.indexOf("Boletim")).toBe(nomes.indexOf("Relatórios") + 1);

  await menu.getByRole("link", { name: "Boletim", exact: true }).click();
  await expect(page).toHaveURL(/\/sistema\/boletim$/);
  await expect(page.getByRole("heading", { level: 1, name: "Boletim do Agro" })).toBeVisible();
  await expect(page.getByRole("article", { name: /Incra retifica o assentamento Jandaíra/ })).toBeVisible();
  await expect(page.getByRole("list", { name: "Notas do dia" }).getByRole("listitem")).toHaveCount(2);

  await page.getByRole("group", { name: "Origem" }).getByRole("button", { name: "Estado · DOE-RO" }).click();
  await expect(page.getByRole("article", { name: /Sepat cria comissão/ })).toBeVisible();
  await expect(page.getByRole("list", { name: "Notas do dia" })).toHaveCount(0);

  await page.getByRole("group", { name: "Origem" }).getByRole("button", { name: "Todas" }).click();
  await page.getByRole("group", { name: "Dia" }).getByRole("button", { name: /· / }).nth(1).click();
  await expect(page.getByRole("article", { name: /Nota de ontem/ })).toBeVisible();
});

test("Marcos: Boletim sem violações sérias de acessibilidade em claro e escuro, sem rolagem horizontal em 375 px", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await simularApi(page);
  await entrarComo(page, "Marcos Oliveira");
  await page.goto("/sistema/boletim");
  await expect(page.getByRole("article")).toBeVisible();
  await semViolacoesSerias(page);
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  await semViolacoesSerias(page);

  await page.setViewportSize({ width: 375, height: 800 });
  await expect(page.getByRole("article")).toBeVisible();
  const semRolagem = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  expect(semRolagem).toBe(true);
});

test("Carla não vê o item no menu e a URL direta mostra o acesso restrito", async ({ page }) => {
  await simularApi(page);
  let chamouApi = false;
  page.on("request", (req) => {
    if (req.url().includes("/api/v1/boletim/")) chamouApi = true;
  });
  await entrarComo(page, "Carla Mendes");
  await expect(page.getByRole("navigation", { name: "Seções do sistema" }).getByRole("link", { name: "Boletim" })).toHaveCount(0);

  await page.goto("/sistema/boletim");
  await expect(page.getByText("O Boletim do Agro é restrito à coordenação e à gestão.")).toBeVisible();
  await semViolacoesSerias(page);
  expect(chamouApi).toBe(false);
});
