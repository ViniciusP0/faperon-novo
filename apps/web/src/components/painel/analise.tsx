"use client";

import { formatNumero, formatPercentual } from "@/lib/format";
import type { Filtros } from "@/lib/filters";
import { Barras } from "./barras";
import { Carregando, ErroConsulta, Secao } from "./comuns";
import { useAnalise } from "./consultas";

function Metrica({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <dt className="text-sm text-ink-muted">{rotulo}</dt>
      <dd className="mt-1 text-3xl font-bold tabular-nums text-brand-strong">{valor}</dd>
      {detalhe && <dd className="mt-0.5 text-sm text-ink-muted">{detalhe}</dd>}
    </div>
  );
}

export function Analise({ filtros }: { filtros: Filtros }) {
  const { data, error, isPending, refetch } = useAnalise(filtros);

  if (isPending || error) {
    return (
      <Secao id="analise" etiqueta="Análise" titulo="Análise estratégica">
        {isPending ? <Carregando rotulo="análise" /> : <ErroConsulta erro={error} onRetry={() => refetch()} />}
      </Secao>
    );
  }

  const m = data.metricas;
  const [lead, ...resto] = data.paragrafos;
  return (
    <Secao id="analise" etiqueta="Análise" titulo="Análise estratégica" alternada>
      <p className="-mt-3 mb-6 text-ink-muted">{data.titulo}</p>

      <div className="grid gap-8 lg:grid-cols-[1fr_minmax(0,22rem)]">
        <div className="max-w-[65ch] space-y-3 leading-relaxed">
          {lead ? (
            <>
              <p className="text-lg font-medium text-ink">{lead}</p>
              {resto.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </>
          ) : (
            <p className="text-ink-muted">Não há dados suficientes para gerar a análise neste recorte.</p>
          )}
        </div>

        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
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
      </div>

      {m.top5.length > 0 && (
        <div className="mt-10">
          <h3 className="text-xl font-semibold text-brand-strong">Cinco maiores municípios</h3>
          {m.concentracao_top5_percentual !== null && (
            <p className="mb-4 mt-1 text-ink-muted">
              Concentração: os cinco maiores respondem por <strong className="text-ink">{formatPercentual(m.concentracao_top5_percentual)}</strong> do
              total estadual.
            </p>
          )}
          <Barras
            rotulo="Cinco maiores municípios"
            unidade=""
            itens={m.top5.map((t) => ({
              id: t.municipio.codigo_ibge,
              nome: t.municipio.nome,
              valor: t.valor,
              status: "ok",
              percentual: t.percentual,
              destacado: t.municipio.codigo_ibge === filtros.municipio,
            }))}
          />
        </div>
      )}
    </Secao>
  );
}
