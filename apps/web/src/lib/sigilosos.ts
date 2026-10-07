/** Nota padrão: o total estadual soma só os municípios com dado publicado; os sigilosos ("X") ficam de fora. */
export function fraseSigilosos(n: number): string {
  return n === 1
    ? "1 município com dado sigiloso fica fora dos totais."
    : `${n} municípios com dado sigiloso ficam fora dos totais.`;
}
