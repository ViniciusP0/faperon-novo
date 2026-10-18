import type { Atividade, Funcionario, ModuloHistorico, RegistroHistorico, TipoAtividade } from "./tipos";

export const ROTULO_TIPO_ATIVIDADE: Record<TipoAtividade, string> = {
  visita_tecnica: "Visita técnica",
  atendimento: "Atendimento ao produtor",
  reuniao: "Reunião",
  capacitacao: "Capacitação ou curso",
  evento: "Evento",
  viagem: "Viagem",
  administrativo: "Administrativo",
  outro: "Outro",
};

export const ROTULO_MODULO: Record<ModuloHistorico, string> = {
  acesso: "Acesso",
  agenda: "Agenda",
  frota: "Frota",
  espacos: "Espaços",
  contas: "Contas",
  atividades: "Atividades",
  tags: "Tags",
};

/** O histórico guarda as ações mais recentes; o protótipo vive no localStorage, que é pequeno. */
export const LIMITE_HISTORICO = 500;

const minutos = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

export function horasDaAtividade(a: Pick<Atividade, "inicio" | "fim">): number {
  return Math.round(((minutos(a.fim) - minutos(a.inicio)) / 60) * 100) / 100;
}

export function validarAtividade(a: Pick<Atividade, "titulo" | "data" | "inicio" | "fim" | "publico">): string | null {
  if (!a.titulo.trim()) return "Diga qual foi a atividade.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a.data)) return "Informe a data da atividade.";
  if (!/^\d{2}:\d{2}$/.test(a.inicio) || !/^\d{2}:\d{2}$/.test(a.fim)) return "Informe o horário de início e de fim.";
  if (a.fim <= a.inicio) return "O fim precisa ser depois do início.";
  if (!Number.isInteger(a.publico) || a.publico < 0) return "O público atendido precisa ser um número inteiro (0 se não houver).";
  return null;
}

/** Atividades que a pessoa pode ver: o coordenador vê as de todos; os demais, só as próprias. */
export function atividadesVisiveis(atividades: Atividade[], funcionario: Funcionario): Atividade[] {
  return funcionario.coordenador ? atividades : atividades.filter((a) => a.funcionarioId === funcionario.id);
}

export interface ResumoDoFuncionario {
  funcionarioId: string;
  atividades: number;
  horas: number;
  publico: number;
}

export function resumoPorFuncionario(atividades: Atividade[], de: string, ate: string): ResumoDoFuncionario[] {
  const mapa = new Map<string, ResumoDoFuncionario>();
  for (const a of atividades) {
    if (a.data < de || a.data > ate) continue;
    const r = mapa.get(a.funcionarioId) ?? { funcionarioId: a.funcionarioId, atividades: 0, horas: 0, publico: 0 };
    r.atividades += 1;
    r.horas = Math.round((r.horas + horasDaAtividade(a)) * 100) / 100;
    r.publico += a.publico;
    mapa.set(a.funcionarioId, r);
  }
  return [...mapa.values()].sort((a, b) => b.horas - a.horas || a.funcionarioId.localeCompare(b.funcionarioId));
}

export function historicoVisivel(historico: RegistroHistorico[], funcionario: Funcionario): RegistroHistorico[] {
  const lista = funcionario.coordenador ? historico : historico.filter((r) => r.funcionarioId === funcionario.id);
  return [...lista].sort((a, b) => b.quando.localeCompare(a.quando));
}

/** Acrescenta no topo e corta no limite. */
export function anotar(historico: RegistroHistorico[], registro: RegistroHistorico): RegistroHistorico[] {
  return [registro, ...historico].slice(0, LIMITE_HISTORICO);
}
