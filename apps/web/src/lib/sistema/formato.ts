const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const inteiro = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const reais = (v: number) => brl.format(v);
export const km = (v: number) => `${inteiro.format(v)} km`;
export const litros = (v: number) => `${decimal.format(v)} L`;
