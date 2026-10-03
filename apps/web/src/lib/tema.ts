export type Tema = "claro" | "escuro";

/**
 * O site sempre abre no tema claro (data-theme="light" vem do servidor no <html>). O visitante pode alternar,
 * mas a escolha vale só enquanto a página está aberta: nada é salvo e a preferência do sistema não é consultada.
 */
export function temaAtual(): Tema {
  return document.documentElement.dataset.theme === "dark" ? "escuro" : "claro";
}

export function aplicarTema(tema: Tema): void {
  document.documentElement.dataset.theme = tema === "escuro" ? "dark" : "light";
}
