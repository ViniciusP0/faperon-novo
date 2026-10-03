"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { recorteParams, type Filtros } from "@/lib/filters";
import { formatNumero, formatPercentual } from "@/lib/format";
import { Carregando, ErroConsulta, NotaMetodologica } from "./comuns";

function Metrica({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe?: string }) {
  return (
    <div className="rounded-xl border border-line p-4">
      <dt className="text-sm text-ink-muted">{rotulo}</dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums text-brand-strong">{valor}</dd>
      {detalhe && <dd className="text-xs text-ink-muted">{detalhe}</dd>}
    </div>
  );
}

export function Analise({ filtros }: { filtros: Filtros }) {
  const params = recorteParams(filtros);
  if (filtros.municipio) params.set("municipio", filtros.municipio);
  const qs = params.toString();
  const { data, error, isPending, refetch } = useQuery({ queryKey: ["analise", qs], queryFn: () => api.analise(qs) });

  if (isPending) return <Carregando rotulo="análise" />;
  if (error) return <ErroConsulta erro={error} onRetry={() => refetch()} />;

  const m = data.metricas;
  return (
    <section aria-labelledby="analise-titulo">
      <h2 id="analise-titulo" className="text-xl font-semibold">
        Análise estratégica
      </h2>
      <p className="mt-1 text-sm text-ink-muted">{data.titulo}</p>

      <div className="mt-4 space-y-3 leading-relaxed">
        {data.paragrafos.length > 0 ? (
          data.paragrafos.map((p, i) => <p key={i}>{p}</p>)
        ) : (
          <p className="text-ink-muted">Não há dados suficientes para gerar a análise neste recorte.</p>
        )}
      </div>

      <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metrica
          rotulo="Variação no período"
          valor={m.variacao_percentual === null ? "–" : `${m.variacao_percentual >= 0 ? "+" : ""}${formatPercentual(m.variacao_percentual)}`}
          detalhe={m.variacao_absoluta === null ? undefined : `${m.variacao_absoluta >= 0 ? "+" : ""}${formatNumero(m.variacao_absoluta)} em valor absoluto`}
        />
        <Metrica rotulo="Crescimento médio anual (CAGR)" valor={formatPercentual(m.cagr_percentual)} />
        <Metrica
          rotulo="Maior ano"
          valor={m.maior_ano ? String(m.maior_ano.ano) : "–"}
          detalhe={m.maior_ano ? formatNumero(m.maior_ano.valor) : undefined}
        />
        <Metrica
          rotulo="Menor ano"
          valor={m.menor_ano ? String(m.menor_ano.ano) : "–"}
          detalhe={m.menor_ano ? formatNumero(m.menor_ano.valor) : undefined}
        />
      </dl>

      {m.top5.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold">Cinco maiores municípios</h3>
          {m.concentracao_top5_percentual !== null && (
            <p className="mt-1 text-sm text-ink-muted">
              Concentração: os cinco maiores respondem por <strong className="text-ink">{formatPercentual(m.concentracao_top5_percentual)}</strong> do
              total estadual.
            </p>
          )}
          <ol className="mt-3 divide-y divide-line rounded-xl border border-line">
            {m.top5.map((t, i) => (
              <li key={t.municipio.codigo_ibge} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span>
                  <span className="mr-2 inline-block w-5 text-ink-muted">{i + 1}.</span>
                  <span className="font-medium">{t.municipio.nome}</span>
                </span>
                <span className="tabular-nums">
                  {formatNumero(t.valor)}
                  {t.percentual !== null && <span className="ml-2 text-ink-muted">({formatPercentual(t.percentual)})</span>}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
      <NotaMetodologica meta={data.meta} />
    </section>
  );
}
