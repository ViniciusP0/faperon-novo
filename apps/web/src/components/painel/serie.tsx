"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Label, Select } from "@/components/ui/field";
import { api } from "@/lib/api";
import type { Municipio } from "@/lib/api-types";
import { NOME_TENDENCIA, opcaoSerie } from "@/lib/chart-options";
import { descreverSerie } from "@/lib/descricao";
import { descreverTendencia, pontosDaTendencia, tendenciaLinear } from "@/lib/tendencia";
import { recorteParams, type Filtros } from "@/lib/filters";
import { Carregando, ErroConsulta, NotaMetodologica, TabelaSeries } from "./comuns";
import { Grafico } from "./grafico";

interface Props {
  filtros: Filtros;
  municipios: Municipio[];
  onMunicipio: (codigo: string) => void;
}

export function Serie({ filtros, municipios, onMunicipio }: Props) {
  const params = recorteParams(filtros);
  if (filtros.municipio) params.set("municipio", filtros.municipio);
  const qs = params.toString();
  const { data, error, isPending, refetch } = useQuery({ queryKey: ["serie", qs], queryFn: () => api.serie(qs) });

  const nome = data ? (data.municipio ? data.municipio.nome : "Rondônia (total)") : "";
  const option = useMemo(() => (data ? opcaoSerie(nome, data.pontos, data.indicador.unidade) : null), [data, nome]);
  const tendencia = useMemo(() => (data ? tendenciaLinear(data.pontos) : null), [data]);

  return (
    <section aria-labelledby="serie-titulo">
      <h2 id="serie-titulo" className="text-xl font-semibold">
        Série histórica{data ? ` — ${data.produto.nome}, ${data.indicador.nome.toLowerCase()}` : ""}
      </h2>

      <div className="mt-3 max-w-sm">
        <Label htmlFor="serie-municipio">Recorte territorial</Label>
        <Select id="serie-municipio" value={filtros.municipio} onChange={(e) => onMunicipio(e.target.value)}>
          <option value="">Total de Rondônia</option>
          {municipios.map((m) => (
            <option key={m.codigo_ibge} value={m.codigo_ibge}>
              {m.nome}
            </option>
          ))}
        </Select>
      </div>

      <div className="mt-5">
        {isPending && <Carregando rotulo="série histórica" />}
        {error && <ErroConsulta erro={error} onRetry={() => refetch()} />}
        {data && option && (
          <>
            <p className="mb-2 text-sm text-ink-muted">
              {nome} — {data.indicador.unidade.toLowerCase()}, {data.inicio} a {data.fim}.
            </p>
            <Grafico
              option={option}
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
          </>
        )}
      </div>
      <NotaMetodologica meta={data?.meta} />
    </section>
  );
}
