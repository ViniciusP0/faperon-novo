import { CONTATO } from "@/content/contato";
import { formatarDataBR } from "./datas";
import type { TipoRelatorio } from "./relatorios";
import type { Funcionario } from "./tipos";

/** Linha "Rótulo: valor" da capa. */
export interface CampoCapa {
  rotulo: string;
  valor: string;
}

/** Bloco de créditos da contracapa (ex.: PRESIDÊNCIA, com uma pessoa por linha). */
export interface SecaoCreditos {
  titulo: string;
  linhas: string[];
}

/**
 * Modelo de documento no padrão do boletim da FAPERON: capa (fundo do boletim, sem os textos) e
 * contracapa de créditos. Tudo editável por tipo de relatório; {periodo}, {emissao}, {responsavel}
 * e {area} são trocados na hora de gerar, para o modelo salvo valer para qualquer período.
 */
export interface ModeloDocumento {
  incluirCapa: boolean;
  incluirContracapa: boolean;
  /** Faixa verde do alto das páginas internas e da contracapa. */
  serie: string;
  subserie: string;
  titulo: string;
  destaque: string;
  campos: CampoCapa[];
  tituloCreditos: string;
  creditos: SecaoCreditos[];
  nota: { titulo: string; texto: string };
  rodape: string[];
}

export const MARCADORES = ["{periodo}", "{emissao}", "{responsavel}", "{area}"] as const;

const TITULOS: Record<TipoRelatorio, { titulo: string; destaque: string; nota: string }> = {
  frota: {
    titulo: "Relatório de Gestão da Frota",
    destaque: "Uso e custos dos veículos",
    nota: "Viagens, quilometragem, abastecimentos e manutenções registrados no sistema de gestão de frotas. O km rodado considera só as viagens concluídas, com saída e retorno registrados.",
  },
  espacos: {
    titulo: "Relatório de Ocupação dos Espaços",
    destaque: "Auditório, hub e salas",
    nota: "Pedidos de uso dos espaços registrados no sistema, por status. As horas aprovadas somam só os pedidos aprovados; pendentes em conflito são os que chocam com outro pedido no mesmo espaço e horário.",
  },
  agenda: {
    titulo: "Relatório de Agenda",
    destaque: "Compromissos do período",
    nota: "Eventos da agenda individual, eventos institucionais da FAPERON, viagens com veículo da frota e espaços aprovados no período.",
  },
  contas: {
    titulo: "Relatório de Prestação de Contas",
    destaque: "Despesas por centro de custo",
    nota: "Despesas lançadas no sistema de prestação de contas. O total considera as despesas enviadas para aprovação e as aprovadas; rascunhos e devolvidas aparecem só no detalhamento.",
  },
  atividades: {
    titulo: "Relatório de Atividades",
    destaque: "Atividades realizadas",
    nota: "Atividades registradas pelos próprios funcionários, com horário, município e público atendido. As horas são calculadas pelo início e fim informados.",
  },
};

export function modeloPadrao(tipo: TipoRelatorio): ModeloDocumento {
  const t = TITULOS[tipo];
  return {
    incluirCapa: true,
    incluirContracapa: true,
    serie: t.titulo.toUpperCase(),
    subserie: "SISTEMA INTERNO • FAPERON / SENAR",
    titulo: t.titulo,
    destaque: t.destaque,
    campos: [
      { rotulo: "Localidade", valor: "Rondônia" },
      { rotulo: "Período de análise", valor: "{periodo}" },
      { rotulo: "Fonte", valor: "Sistema interno da FAPERON" },
      { rotulo: "Data de emissão", valor: "{emissao}" },
    ],
    tituloCreditos: "Créditos institucionais",
    creditos: [
      { titulo: "Presidência", linhas: ["Hélio Dias de Souza - Presidente do Sistema FAPERON/SENAR"] },
      { titulo: "Elaboração", linhas: ["{responsavel} - {area}"] },
    ],
    nota: { titulo: "Nota metodológica", texto: t.nota },
    rodape: [
      "Federação da Agricultura e Pecuária do Estado de Rondônia - FAPERON",
      `Endereço: ${CONTATO.endereco.linhas.join(", ")}`,
      `Telefone: ${CONTATO.telefone.texto} | E-mail: faperon@faperon.org.br`,
    ],
  };
}

export interface ContextoDocumento {
  de: string;
  ate: string;
  hoje: string;
  funcionario: Funcionario;
}

function trocar(texto: string, c: ContextoDocumento): string {
  return texto
    .replaceAll("{periodo}", `${formatarDataBR(c.de)} a ${formatarDataBR(c.ate)}`)
    .replaceAll("{emissao}", formatarDataBR(c.hoje))
    .replaceAll("{responsavel}", c.funcionario.nome)
    .replaceAll("{area}", c.funcionario.area);
}

/** Modelo pronto para imprimir: marcadores trocados e campos e linhas vazios fora. */
export function preencher(m: ModeloDocumento, c: ContextoDocumento): ModeloDocumento {
  const t = (s: string) => trocar(s, c);
  return {
    ...m,
    serie: t(m.serie),
    subserie: t(m.subserie),
    titulo: t(m.titulo),
    destaque: t(m.destaque),
    campos: m.campos.filter((x) => x.rotulo.trim() || x.valor.trim()).map((x) => ({ rotulo: t(x.rotulo), valor: t(x.valor) })),
    tituloCreditos: t(m.tituloCreditos),
    creditos: m.creditos
      .map((s) => ({ titulo: t(s.titulo), linhas: s.linhas.map(t).filter((l) => l.trim()) }))
      .filter((s) => s.titulo.trim() || s.linhas.length),
    nota: { titulo: t(m.nota.titulo), texto: t(m.nota.texto) },
    rodape: m.rodape.map(t).filter((l) => l.trim()),
  };
}

/** Lê um modelo salvo de versões antigas sem quebrar: o que faltar vem do padrão. */
export function completar(salvo: Partial<ModeloDocumento> | null, tipo: TipoRelatorio): ModeloDocumento {
  const padrao = modeloPadrao(tipo);
  if (!salvo || typeof salvo !== "object") return padrao;
  return { ...padrao, ...salvo, nota: { ...padrao.nota, ...(salvo.nota ?? {}) } };
}
