import type { Funcionario } from "@/lib/sistema/tipos";

/** Funcionários FICTÍCIOS do protótipo: nomes inventados, sem relação com pessoas reais. */
export const FUNCIONARIOS: Funcionario[] = [
  { id: "carla", nome: "Carla Mendes", area: "Comunicação", gestorFrota: false, gestorEspacos: false, gestorContas: false },
  { id: "marcos", nome: "Marcos Oliveira", area: "Administrativo", gestorFrota: true, gestorEspacos: true, gestorContas: true },
  { id: "ana", nome: "Ana Ribeiro", area: "Técnica", gestorFrota: false, gestorEspacos: false, gestorContas: false },
  { id: "joao", nome: "João Pereira", area: "Sindical", gestorFrota: false, gestorEspacos: false, gestorContas: false },
  { id: "luiza", nome: "Luíza Santos", area: "Presidência", gestorFrota: false, gestorEspacos: false, gestorContas: false },
];

export function funcionarioPorId(id: string | null): Funcionario | null {
  return FUNCIONARIOS.find((f) => f.id === id) ?? null;
}

export const PROTOTIPO = {
  faixa: "Protótipo: dados fictícios, salvos só neste navegador.",
  restaurar: "Restaurar dados de exemplo",
} as const;
