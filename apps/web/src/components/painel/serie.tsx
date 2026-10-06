"use client";

import { useMemo } from "react";
import { NOME_TENDENCIA, opcaoSerie } from "@/lib/chart-options";
import { descreverSerie } from "@/lib/descricao";
import type { Filtros } from "@/lib/filters";
import { descreverTendencia, pontosDaTendencia, tendenciaLinear } from "@/lib/tendencia";
import { Carregando, ErroConsulta, Secao, TabelaSeries } from "./comuns";
import { useSerie } from "./consultas";
import { Grafico } from "./grafico";

export function Serie({ filtros }: { filtros: Filtros }) {
  const { data, error, isPending, refetch } = useSerie(filtros);

  const nome = data ? (data.municipio ? data.municipio.nome : "Rondônia (total)") : "";
  const option = useMemo(() => (data ? opcaoSerie(nome, data.pontos, data.indicador.unidade) : null), [data, nome]);
  const tendencia = useMemo(() => (data ? tendenciaLinear(data.pontos) : null), [data]);

  return (
    <Secao
      id="evolucao"
      etiqueta="Evolução"
      titulo={`Série histórica${data ? ` — ${data.produto.nome}, ${data.indicador.nome.toLowerCase()}` : ""}`}
      alternada
    >
      {isPending && <Carregando rotulo="série histórica" />}
      {error && <ErroConsulta erro={error} onRetry={() => refetch()} />}
      {data && option && (
        <div className="rounded-2xl border border-line bg-card p-4 md:p-6">
          <p className="mb-2 text-sm text-ink-muted">
            {nome} — {data.indicador.unidade.toLowerCase()}, {data.inicio} a {data.fim}.
          </p>
          <Grafico
            option={option}
            altura={420}
            alturaMovel={300}
            descricao={`${descreverSerie(nome, data.pontos, data.indicador.unidade)}${tendencia ? ` ${descreverTendencia(tendencia, data.indicador.unidade)}` : ""}`}
          />
          <p className="mt-3 text-sm leading-relaxed" data-testid="serie-descricao">
            {descreverSerie(nome, data.pontos, data.indicador.unidade)}
          </p>
          {tendencia && (
            <p className="mt-1.5 text-sm leading-relaxed text-ink-muted" data-testid="serie-tendencia">
              {descreverTendencia(tendencia, data.indicador.unidade)}
            </p>
          )}
          <TabelaSeries
            legenda={`Série histórica de ${data.produto.nome}, ${data.indicador.nome.toLowerCase()}, ${nome}`}
            unidade={data.indicador.unidade}
            anos={data.pontos.map((p) => p.ano)}
            series={[
              { id: "serie", nome, pontos: data.pontos },
              ...(tendencia ? [{ id: "tendencia", nome: NOME_TENDENCIA, pontos: pontosDaTendencia(data.pontos, tendencia) }] : []),
            ]}
          />
        </div>
      )}
    </Secao>
  );
}
