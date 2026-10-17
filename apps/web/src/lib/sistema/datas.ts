/** Datas locais como texto (`YYYY-MM-DD`, `YYYY-MM-DDTHH:mm`): sem fuso, comparáveis como string. */

const doisDigitos = (n: number) => String(n).padStart(2, "0");

export function paraISO(data: Date): string {
  return `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}`;
}

function deISO(iso: string): Date {
  const [ano, mes, dia] = iso.slice(0, 10).split("-").map(Number);
  return new Date(ano!, mes! - 1, dia!);
}

export function hojeISO(): string {
  return paraISO(new Date());
}

export function agoraISO(): string {
  const d = new Date();
  return `${paraISO(d)}T${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`;
}

export function somarDias(iso: string, dias: number): string {
  const d = deISO(iso);
  return paraISO(new Date(d.getFullYear(), d.getMonth(), d.getDate() + dias));
}

export function somarMeses(iso: string, meses: number): string {
  const d = deISO(iso);
  return paraISO(new Date(d.getFullYear(), d.getMonth() + meses, d.getDate()));
}

export function diasEntre(deIso: string, ateIso: string): number {
  return Math.round((deISO(ateIso).getTime() - deISO(deIso).getTime()) / 86_400_000);
}

/** Semanas de domingo a sábado cobrindo o mês (mes0 de 0 a 11), com dias dos meses vizinhos. */
export function gradeDoMes(ano: number, mes0: number): string[][] {
  const primeiro = new Date(ano, mes0, 1);
  const ultimo = new Date(ano, mes0 + 1, 0);
  let cursor = paraISO(new Date(ano, mes0, 1 - primeiro.getDay()));
  const fim = paraISO(new Date(ano, mes0 + 1, 6 - ultimo.getDay()));
  const semanas: string[][] = [];
  while (cursor <= fim) {
    const semana: string[] = [];
    for (let i = 0; i < 7; i++) {
      semana.push(cursor);
      cursor = somarDias(cursor, 1);
    }
    semanas.push(semana);
  }
  return semanas;
}

/** Intervalos meio abertos: um que termina quando o outro começa não se sobrepõe. */
export function sobrepoe(aIni: string, aFim: string, bIni: string, bFim: string): boolean {
  return aIni < bFim && bIni < aFim;
}

export function formatarDataBR(iso: string): string {
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

export function formatarHora(isoDataHora: string): string {
  return isoDataHora.slice(11, 16);
}

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export function nomeDoMes(mes0: number): string {
  return MESES[mes0]!;
}

export function rotuloMesCurto(mes: string): string {
  const [ano, m] = mes.split("-");
  return `${MESES[Number(m) - 1]!.slice(0, 3)}/${ano!.slice(2)}`;
}
