import type { Page } from "@playwright/test";

/** O Zétele (225x360 no canto inferior direito) cobre controles que o Playwright rola só até a borda
 *  da tela. Testes que não são do Zétele tiram a área de clique dele do caminho. */
export async function semAreaDoZetele(page: Page) {
  await page.addInitScript(() => {
    addEventListener("DOMContentLoaded", () => {
      const estilo = document.createElement("style");
      estilo.textContent = '[data-testid="zetele-area-clique"]{display:none}';
      document.head.appendChild(estilo);
    });
  });
}
