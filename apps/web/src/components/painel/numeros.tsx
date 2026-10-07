"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { Filtros } from "@/lib/filters";
import { formatPercentual } from "@/lib/format";
import { fraseSigilosos } from "@/lib/sigilosos";
import { manchetePainel, medida } from "@/lib/manchete-painel";
import { Skeleton } from "@/components/ui/feedback";
import { Secao } from "./comuns";
import { useAnalise, useRanking, useSerie } from "./consultas";

interface CartaoProps {
  rotulo: string;
  numero: string;
  unidade?: string;
  apoio?: string;
  tendencia?: "alta" | "queda";
}

function Cartao({ rotulo, numero, unidade, apoio, tendencia }: CartaoProps) {
  const Seta = tendencia === "queda" ? ArrowDownRight : ArrowUpRight;
  return (
    <li className="flex flex-col rounded-2xl bg-brand-dark p-5 text-white md:p-6" data-testid="cartao-numero">
      <p className="text-sm font-semibold uppercase tracking-wide text-brand-lime">{rotulo}</p>
      <p className={`mt-3 flex items-center gap-2 break-words font-bold leading-tight tabular-nums ${numero.length > 12 ? "text-2xl md:text-3xl" : "text-3xl md:text-4xl"}`}>
        {tendencia && (
          <Seta
            aria-hidden="true"
            className={tendencia === "queda" ? "h-8 w-8 shrink-0 text-amber-300" : "h-8 w-8 shrink-0 text-brand-lime"}
          />
        )}
        <span className="min-w-0">{numero}</span>
      </p>
      {unidade && <p className="mt-1.5 text-base text-white/90">{unidade}</p>}
      {apoio && <p className="mt-auto pt-3 text-sm leading-snug text-white/80">{apoio}</p>}
    </li>
  );
}

const sinal = (v: number) => (v >= 0 ? "+" : "−");

export function Numeros({ filtros }: { filtros: Filtros }) {
  const ranking = useRanking(filtros);
  const serie = useSerie(filtros);
  const analise = useAnalise(filtros);

  if (ranking.isPending || serie.isPending) {
    return (
      <Secao id="numeros" etiqueta="Números do recorte" titulo="Carregando os números…">
        <div role="status" aria-live="polite">
          <span className="sr-only">Carregando números do recorte…</span>
          <ul aria-hidden="true" className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <li key={i}>
                <Skeleton className="h-36 w-full rounded-2xl min-[480px]:h-40 xl:h-[11.4rem]" />
              </li>
            ))}
          </ul>
        </div>
      </Secao>
    );
  }
  if (ranking.isError || serie.isError) return null; // as seções abaixo mostram o erro com opção de tentar de novo

  const r = ranking.data;
  const municipioNome = serie.data.municipio?.nome;
  const mediaPonderada = r.indicador.agregacao === "media_ponderada";
  const unidadeApi = r.indicador.unidade;

  const ponto = serie.data.pontos.find((p) => p.ano === r.ano_referencia);
  const valor = municipioNome ? (ponto?.valor ?? null) : r.total_estadual;
  const statusValor = municipioNome ? (ponto?.status ?? "inexistente") : "ok";

  const lider = r.itens.find((i) => i.status === "ok" && i.posicao === 1);
  const doMunicipio = filtros.municipio ? r.itens.find((i) => i.municipio.codigo_ibge === filtros.municipio) : undefined;
  const m = analise.data?.metricas;

  const manchete = manchetePainel({
    produto: r.produto.nome,
    indicadorSlug: r.indicador.slug,
    indicadorNome: r.indicador.nome,
    unidade: unidadeApi,
    valor,
    status: statusValor,
    ano: r.ano_referencia,
    territorio: municipioNome,
  });

  const cartaoValor: CartaoProps = (() => {
    const rotulo = municipioNome ?? (mediaPonderada ? "Média de Rondônia" : "Total de Rondônia");
    if (valor === null) return { rotulo, numero: statusValor === "sigiloso" ? "X" : "–", apoio: `em ${r.ano_referencia}, valor não publicado pelo IBGE` };
    const med = medida(valor, unidadeApi);
    const sigilosos = r.itens.filter((i) => i.status === "sigiloso").length;
    const nota = !municipioNome && sigilosos > 0 ? ` · ${fraseSigilosos(sigilosos)}` : "";
    return { rotulo, numero: med.numero, unidade: med.unidade, apoio: `em ${r.ano_referencia}${nota}` };
  })();

  const cartaoVariacao: CartaoProps = (() => {
    const rotulo = "Variação no período";
    if (!m || m.variacao_percentual === null) return { rotulo, numero: "–", apoio: "sem série suficiente para comparar" };
    const pct = m.variacao_percentual;
    const abs = m.variacao_absoluta;
    return {
      rotulo,
      numero: `${sinal(pct)}${formatPercentual(Math.abs(pct))}`,
      tendencia: pct >= 0 ? "alta" : "queda",
      apoio: `${pct >= 0 ? "alta" : "queda"}${abs === null ? "" : ` de ${medida(Math.abs(abs), unidadeApi).texto}`} entre ${r.inicio} e ${r.fim}`,
    };
  })();

  const cartaoLider: CartaoProps = (() => {
    if (doMunicipio) {
      const pos = doMunicipio.posicao;
      return {
        rotulo: "Posição no estado",
        numero: pos === null ? "–" : `${pos}º`,
        apoio: pos === null ? "sem valor publicado para classificar" : `entre ${r.itens.length} municípios de Rondônia`,
      };
    }
    if (!lider) return { rotulo: "Município líder", numero: "–" };
    return {
      rotulo: "Município líder",
      numero: lider.municipio.nome,
      apoio: lider.percentual_total === null ? medida(lider.valor ?? 0, unidadeApi).texto : `${formatPercentual(lider.percentual_total)} do total de Rondônia`,
    };
  })();

  const cartaoQuarto: CartaoProps = (() => {
    if (doMunicipio) {
      if (doMunicipio.percentual_total !== null) {
        return { rotulo: "Participação no estado", numero: formatPercentual(doMunicipio.percentual_total), apoio: "do total de Rondônia" };
      }
      if (r.total_estadual === null) return { rotulo: "Média de Rondônia", numero: "–" };
      const med = medida(r.total_estadual, unidadeApi);
      return { rotulo: "Média de Rondônia", numero: med.numero, unidade: med.unidade };
    }
    if (m?.concentracao_top5_percentual != null) {
      return { rotulo: "Concentração", numero: formatPercentual(m.concentracao_top5_percentual), apoio: "do total estadual está nos cinco maiores municípios" };
    }
    if (lider && lider.valor !== null) {
      const med = medida(lider.valor, unidadeApi);
      return { rotulo: "Maior valor", numero: med.numero, unidade: med.unidade, apoio: lider.municipio.nome };
    }
    return { rotulo: "Concentração", numero: "–" };
  })();

  return (
    <Secao
      id="numeros"
      etiqueta="Números do recorte"
      titulo={
        manchete ? (
          manchete.map((p, i) =>
            p.destaque ? (
              <strong key={i} className="font-bold text-brand-fg">
                {p.texto}
              </strong>
            ) : (
              <span key={i}>{p.texto}</span>
            ),
          )
        ) : (
          `${r.indicador.nome} de ${r.produto.nome} em ${municipioNome ?? "Rondônia"}, ${r.ano_referencia}`
        )
      }
    >
      <ul aria-label="Números-chave do recorte" className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-4">
        <Cartao {...cartaoValor} />
        <Cartao {...cartaoVariacao} />
        <Cartao {...cartaoLider} />
        <Cartao {...cartaoQuarto} />
      </ul>
    </Secao>
  );
}
