export type Tema = "claro" | "escuro";

export const CHAVE_TEMA = "faperon-tema";

/**
 * O site abre no tema claro (data-theme="light" vem do servidor no <html>) e a preferência do sistema não é consultada.
 * Só a escolha explícita do visitante, feita no botão do cabeçalho, é guardada no navegador (localStorage) e reaplicada
 * nas visitas seguintes por SCRIPT_TEMA, que roda antes da primeira pintura para a página não piscar no tema errado.
 */
export function temaAtual(): Tema {
  return document.documentElement.dataset.theme === "dark" ? "escuro" : "claro";
}

export function aplicarTema(tema: Tema): void {
  document.documentElement.dataset.theme = tema === "escuro" ? "dark" : "light";
}

/** Guarda a escolha do visitante; o armazenamento pode estar bloqueado (navegação privada), então falhar é aceitável. */
export function salvarTema(tema: Tema): void {
  try {
    localStorage.setItem(CHAVE_TEMA, tema);
  } catch {
    /* sem armazenamento: o tema vale só nesta visita */
  }
}

/** Script inline do <head>: aplica o tema guardado antes da hidratação. Mantenha em sincronia com aplicarTema. */
export const SCRIPT_TEMA = `try{if(localStorage.getItem(${JSON.stringify(CHAVE_TEMA)})==="escuro")document.documentElement.dataset.theme="dark"}catch(e){}`;
