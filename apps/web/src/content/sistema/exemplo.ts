import { somarDias } from "@/lib/sistema/datas";
import type { Despesa, Espaco, EstadoFrota, Evento, PedidoEspaco, Reserva } from "@/lib/sistema/tipos";

/** Dados de exemplo calculados a partir de `hoje`, para o protótipo nunca parecer velho. Tudo fictício. */

export const ESPACOS: Espaco[] = [
  { id: "auditorio", nome: "Auditório", capacidade: 150 },
  { id: "hub", nome: "Hub", capacidade: 40 },
  { id: "sala-reunioes", nome: "Sala de reuniões", capacidade: 12 },
  { id: "nucleo-tecnico", nome: "Núcleo técnico", capacidade: 20 },
  { id: "sala-presidencia", nome: "Sala da presidência", capacidade: 8 },
];

/** Próximo dia útil a partir de `hoje + dias` (pula sábado e domingo). */
function util(hoje: string, dias: number): string {
  let d = somarDias(hoje, dias);
  while ([0, 6].includes(new Date(`${d}T12:00`).getDay())) d = somarDias(d, 1);
  return d;
}

export function eventosInstitucionais(hoje: string): Evento[] {
  const e = (id: string, dias: number, titulo: string, inicio: string, fim: string, local: string, descricao: string): Evento => ({
    id: `faperon-${id}`,
    titulo,
    data: util(hoje, dias),
    inicio,
    fim,
    local,
    descricao,
    tipo: "reuniao",
    origem: "faperon",
  });
  return [
    e("diretoria", 2, "Reunião de diretoria", "09:00", "11:00", "Sala da presidência", "Pauta mensal da diretoria."),
    e("dia-campo", 6, "Dia de campo: café clonal", "07:30", "16:00", "Cacoal", "Dia de campo com produtores do Sistema FAPERON/SENAR."),
    e("assembleia", 12, "Assembleia dos sindicatos rurais", "14:00", "17:00", "Auditório", "Assembleia geral com os presidentes dos sindicatos."),
    e("curso-senar", 17, "Curso SENAR: gestão da propriedade", "08:00", "12:00", "Hub", "Turma aberta para técnicos e produtores."),
    e("feira", 24, "Feira agropecuária regional", "08:00", "18:00", "Ji-Paraná", "Estande da FAPERON na feira."),
    e("planejamento", -5, "Planejamento do trimestre", "14:00", "16:00", "Sala de reuniões", "Revisão das metas do trimestre."),
  ];
}

export function agendaDeExemplo(funcionarioId: string, hoje: string): Evento[] {
  const e = (n: number, dias: number, titulo: string, inicio: string, fim: string, local: string, tipo: Evento["tipo"]): Evento => ({
    id: `${funcionarioId}-exemplo-${n}`,
    titulo,
    data: util(hoje, dias),
    inicio,
    fim,
    local,
    descricao: "",
    tipo,
    origem: "pessoal",
  });
  const porPessoa: Record<string, Evento[]> = {
    carla: [e(1, 1, "Pauta do informativo mensal", "10:00", "11:00", "Comunicação", "reuniao"), e(2, 3, "Gravação de vídeo institucional", "14:00", "16:00", "Hub", "compromisso")],
    marcos: [e(1, 1, "Conferir notas de abastecimento", "08:30", "09:30", "Administrativo", "compromisso"), e(2, 4, "Reunião com a oficina", "15:00", "16:00", "Oficina parceira", "reuniao")],
    ana: [e(1, 2, "Visita técnica: piscicultura", "08:00", "12:00", "Ariquemes", "viagem"), e(2, 5, "Relatório do diagnóstico", "14:00", "17:00", "Núcleo técnico", "compromisso")],
    joao: [e(1, 1, "Reunião com o sindicato de Vilhena", "09:00", "10:30", "Online", "reuniao"), e(2, 8, "Visita ao sindicato de Rolim de Moura", "08:00", "17:00", "Rolim de Moura", "viagem")],
    luiza: [e(1, 2, "Despacho com a diretoria", "08:30", "09:30", "Sala da presidência", "reuniao"), e(2, 9, "Audiência na Assembleia Legislativa", "10:00", "12:00", "Porto Velho", "compromisso")],
  };
  return porPessoa[funcionarioId] ?? [];
}

export function frotaDeExemplo(hoje: string): EstadoFrota {
  const veiculos = [
    { id: "v1", placa: "QRB2F41", modelo: "Toyota Hilux CD", ano: 2022, km: 61_200 },
    { id: "v2", placa: "NDE-4821", modelo: "Mitsubishi L200", ano: 2019, km: 118_400 },
    { id: "v3", placa: "RSA7C10", modelo: "Fiat Strada", ano: 2023, km: 24_900 },
    { id: "v4", placa: "OHV-1937", modelo: "Volkswagen Gol", ano: 2018, km: 97_300 },
    { id: "v5", placa: "SBC3A55", modelo: "Chevrolet Spin", ano: 2021, km: 52_100 },
    { id: "v6", placa: "QTX9H02", modelo: "Renault Duster", ano: 2020, km: 79_650 },
  ];
  const reservas: Reserva[] = [];
  const quem = ["carla", "ana", "joao", "marcos", "luiza"];
  const destinos = ["Ji-Paraná", "Cacoal", "Ariquemes", "Vilhena", "Rolim de Moura", "Jaru"];
  // três meses de viagens concluídas, uma por veículo a cada ~3 semanas
  let n = 0;
  for (const [i, v] of veiculos.entries()) {
    for (let k = 0; k < 4; k++) {
      const dia = util(hoje, -85 + k * 21 + i * 2);
      const km = 380 + ((i * 97 + k * 53) % 420);
      const kmFinal = v.km - (3 - k) * 500;
      reservas.push({
        id: `r-ex-${n++}`,
        veiculoId: v.id,
        funcionarioId: quem[(i + k) % quem.length]!,
        saida: `${dia}T07:30`,
        retorno: `${dia}T18:00`,
        destino: destinos[(i + k) % destinos.length]!,
        motivo: "Atendimento a sindicatos e produtores",
        kmInicial: kmFinal - km,
        kmFinal,
        situacao: "concluida",
      });
    }
  }
  const proxima = util(hoje, 3);
  reservas.push(
    { id: "r-ex-carla", veiculoId: "v3", funcionarioId: "carla", saida: `${proxima}T08:00`, retorno: `${proxima}T17:00`, destino: "Cacoal", motivo: "Cobertura do dia de campo", kmInicial: null, kmFinal: null, situacao: "agendada" },
    { id: "r-ex-joao", veiculoId: "v1", funcionarioId: "joao", saida: `${util(hoje, 8)}T07:00`, retorno: `${util(hoje, 8)}T19:00`, destino: "Rolim de Moura", motivo: "Visita ao sindicato", kmInicial: null, kmFinal: null, situacao: "agendada" },
  );
  const abastecimentos = veiculos.flatMap((v, i) =>
    [-80, -50, -20].map((dias, k) => ({
      id: `a-ex-${v.id}-${k}`,
      veiculoId: v.id,
      funcionarioId: quem[(i + k) % quem.length]!,
      data: somarDias(hoje, dias + i),
      litros: 38 + ((i * 7 + k * 5) % 22),
      valor: Math.round((38 + ((i * 7 + k * 5) % 22)) * 6.29 * 100) / 100,
      km: v.km - (2 - k) * 900,
    })),
  );
  const manutencoes = [
    // v2: revisão vencida por km; v4: em manutenção agora; v6: revisão perto de vencer
    { id: "m-ex-1", veiculoId: "v1", data: somarDias(hoje, -60), tipo: "revisao" as const, valor: 1280, km: 58_000, concluida: true },
    { id: "m-ex-2", veiculoId: "v2", data: somarDias(hoje, -200), tipo: "revisao" as const, valor: 1490, km: 106_900, concluida: true },
    { id: "m-ex-3", veiculoId: "v3", data: somarDias(hoje, -30), tipo: "revisao" as const, valor: 690, km: 20_000, concluida: true },
    { id: "m-ex-4", veiculoId: "v4", data: somarDias(hoje, -2), tipo: "freios" as const, valor: 840, km: 97_300, concluida: false },
    { id: "m-ex-5", veiculoId: "v4", data: somarDias(hoje, -150), tipo: "revisao" as const, valor: 610, km: 90_000, concluida: true },
    { id: "m-ex-6", veiculoId: "v5", data: somarDias(hoje, -90), tipo: "revisao" as const, valor: 980, km: 48_000, concluida: true },
    { id: "m-ex-7", veiculoId: "v5", data: somarDias(hoje, -40), tipo: "pneus" as const, valor: 2360, km: 51_000, concluida: true },
    { id: "m-ex-8", veiculoId: "v6", data: somarDias(hoje, -340), tipo: "revisao" as const, valor: 1150, km: 70_100, concluida: true },
  ];
  return { veiculos, reservas, abastecimentos, manutencoes };
}

export function pedidosDeExemplo(hoje: string): PedidoEspaco[] {
  const p = (parcial: Partial<PedidoEspaco> & Pick<PedidoEspaco, "id" | "espacoId" | "funcionarioId" | "data" | "nome">): PedidoEspaco => ({
    periodo: "manha",
    inicio: "08:00",
    fim: "12:00",
    tipo: "reuniao",
    participantes: 10,
    coffeeBreak: false,
    observacoes: "",
    status: "pendente",
    motivoRecusa: "",
    criadoEm: `${somarDias(hoje, -1)}T10:00`,
    ...parcial,
  });
  const d1 = util(hoje, 2);
  const d2 = util(hoje, 5);
  const d3 = util(hoje, 12);
  return [
    p({ id: "e-ex-1", espacoId: "sala-presidencia", funcionarioId: "luiza", data: d1, nome: "Reunião de diretoria", periodo: "horario", inicio: "09:00", fim: "11:00", participantes: 7, status: "aprovado", coffeeBreak: true }),
    p({ id: "e-ex-2", espacoId: "hub", funcionarioId: "carla", data: d2, nome: "Oficina de redes sociais para sindicatos", tipo: "curso", periodo: "tarde", inicio: "13:00", fim: "18:00", participantes: 30, status: "aprovado", coffeeBreak: true }),
    p({ id: "e-ex-3", espacoId: "hub", funcionarioId: "ana", data: d2, nome: "Treinamento de técnicos de campo", tipo: "curso", periodo: "dia_todo", inicio: "08:00", fim: "18:00", participantes: 25, coffeeBreak: true, criadoEm: `${hoje}T09:15` }),
    p({ id: "e-ex-4", espacoId: "auditorio", funcionarioId: "joao", data: d3, nome: "Assembleia dos sindicatos rurais", tipo: "institucional", periodo: "tarde", inicio: "13:00", fim: "18:00", participantes: 120, status: "aprovado", coffeeBreak: true }),
    p({ id: "e-ex-5", espacoId: "sala-reunioes", funcionarioId: "marcos", data: d1, nome: "Alinhamento com a oficina parceira", periodo: "horario", inicio: "15:00", fim: "16:00", participantes: 4, criadoEm: `${hoje}T08:40` }),
    p({ id: "e-ex-6", espacoId: "nucleo-tecnico", funcionarioId: "ana", data: util(hoje, 1), nome: "Apresentação do diagnóstico da piscicultura", tipo: "palestra", periodo: "manha", participantes: 24, criadoEm: `${hoje}T11:05` }),
  ];
}

export function despesasDeExemplo(hoje: string): Despesa[] {
  const d = (n: number, parcial: Omit<Despesa, "id" | "comprovante" | "observacaoGestor" | "criadaEm">): Despesa => ({
    id: `despesa-ex-${n}`,
    comprovante: null,
    observacaoGestor: "",
    criadaEm: `${parcial.data}T10:00`,
    ...parcial,
  });
  return [
    d(1, { funcionarioId: "carla", data: somarDias(hoje, -20), centro: "Comunicação", categoria: "servicos", descricao: "Impressão de banners do dia de campo", fornecedor: "Gráfica Rondônia", valor: 680, status: "aprovada" }),
    d(2, { funcionarioId: "carla", data: somarDias(hoje, -6), centro: "Comunicação", categoria: "material", descricao: "Cartões de memória para a câmera", fornecedor: "Loja Foto Digital", valor: 189.9, status: "enviada" }),
    d(3, { funcionarioId: "ana", data: somarDias(hoje, -12), centro: "Técnica", categoria: "hospedagem", descricao: "Hospedagem na visita técnica a Ariquemes", fornecedor: "Hotel Vale do Jamari", valor: 340, status: "enviada" }),
    d(4, { funcionarioId: "ana", data: somarDias(hoje, -12), centro: "Técnica", categoria: "alimentacao", descricao: "Refeições da visita técnica", fornecedor: "Restaurante Sabor do Campo", valor: 96.5, status: "aprovada" }),
    d(5, { funcionarioId: "joao", data: somarDias(hoje, -3), centro: "Sindical", categoria: "transporte", descricao: "Passagem de ônibus a Vilhena", fornecedor: "Viação Rondônia", valor: 142, status: "rascunho" }),
    { ...d(6, { funcionarioId: "joao", data: somarDias(hoje, -15), centro: "Sindical", categoria: "eventos", descricao: "Lanche da reunião com o sindicato", fornecedor: "Padaria Pão Nosso", valor: 210, status: "devolvida" }), observacaoGestor: "Falta o comprovante fiscal." },
    d(7, { funcionarioId: "luiza", data: somarDias(hoje, -30), centro: "Presidência", categoria: "transporte", descricao: "Táxi para a Assembleia Legislativa", fornecedor: "Rádio Táxi PVH", valor: 58, status: "aprovada" }),
    d(8, { funcionarioId: "marcos", data: somarDias(hoje, -9), centro: "Administrativo", categoria: "material", descricao: "Toner para a impressora", fornecedor: "Info Suprimentos", valor: 415, status: "aprovada" }),
  ];
}
