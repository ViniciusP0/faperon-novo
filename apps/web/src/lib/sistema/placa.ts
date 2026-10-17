/** Placa no formato antigo (AAA9999, aceita AAA-9999) ou Mercosul (AAA9A99). */
const PLACA = /^[A-Z]{3}\d[A-Z\d]\d{2}$/;

export function normalizarPlaca(placa: string): string {
  return placa.trim().toUpperCase().replace("-", "");
}

export function placaValida(placa: string): boolean {
  return PLACA.test(normalizarPlaca(placa));
}

export function formatarPlaca(placa: string): string {
  const p = normalizarPlaca(placa);
  // antiga leva hífen na exibição; Mercosul não
  return /^[A-Z]{3}\d{4}$/.test(p) ? `${p.slice(0, 3)}-${p.slice(3)}` : p;
}
