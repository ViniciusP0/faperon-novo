const animados = new Set<string>();

/**
 * Quem chama desenha o gráfico pela primeira vez. Devolve true só na primeira vez de cada `id`: o gráfico da
 * série ou da comparação remonta depois do skeleton a cada recorte novo, e um filtro não deve reanimar a entrada.
 */
export function consumirEntrada(id?: string): boolean {
  if (!id) return true;
  if (animados.has(id)) return false;
  animados.add(id);
  return true;
}

/** Só para testes. */
export function reiniciarEntradas(): void {
  animados.clear();
}
