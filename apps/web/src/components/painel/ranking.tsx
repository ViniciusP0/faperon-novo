"use client";

import { formatNumero, formatPercentual, formatValor } from "@/lib/format";
import type { Filtros } from "@/lib/filters";
import { cn } from "@/lib/utils";
import { Barras } from "./barras";
import { Carregando, ErroConsulta, Secao } from "./comuns";
import { useRanking } from "./consultas";

const TOP = 10;

export function Ranking({ filtros }: { filtros: Filtros }) {
  const { data, error, isPending, refetch } = useRanking(filtros);

  if (isPending || error) {
    return (
      <Secao id="ranking" etiqueta="Ranking" titulo="Quem lidera em Rondônia">
        {isPending ? <Carregando rotulo="ranking" /> : <ErroConsulta erro={error} onRetry={() => refetch()} />}
      </Secao>
    );
  }

  const { indicador, itens, total_estadual, ano_referencia } = data;
  const maximo = Math.max(...itens.map((i) => i.valor ?? 0), 1);
  const mostraPercentual = itens.some((i) => i.percentual_total !== null);
  const ordenados = itens.filter((i) => i.status === "ok");
  const barras = ordenados.slice(0, TOP).map((i) => ({
    id: i.municipio.codigo_ibge,
    nome: i.municipio.nome,
    valor: i.valor,
    status: i.status,
    percentual: i.percentual_total,
    destacado: i.municipio.codigo_ibge === filtros.municipio,
  }));

  return (
    <Secao
      id="ranking"
      etiqueta="Ranking"
      titulo={`Ranking dos municípios — ${data.produto.nome}, ${indicador.nome.toLowerCase()} em ${ano_referencia}`}
    >
      <p className="mb-5 max-w-[62ch] text-ink-muted">
        Os {Math.min(TOP, barras.length)} maiores municípios no ano final do período ({ano_referencia}). Unidade: {indicador.unidade.toLowerCase()}.
        {total_estadual !== null && (
          <>
            {" "}
            Total de Rondônia: <strong className="text-ink">{formatNumero(total_estadual)}</strong>.
          </>
        )}
      </p>
      <Barras itens={barras} unidade={indicador.unidade} rotulo={`Dez maiores municípios em ${indicador.nome.toLowerCase()} de ${data.produto.nome}`} />

      <details className="mt-6 rounded-xl border border-line bg-card">
        <summary className="cursor-pointer rounded-xl px-4 py-3 font-semibold text-brand-strong">
          Ver os {itens.length} municípios
        </summary>
        <div tabIndex={0} role="region" aria-label="Tabela de ranking (role horizontalmente em telas pequenas)" className="overflow-x-auto px-2 pb-3">
          <table className="w-full min-w-[520px] text-sm">
            <caption className="sr-only">
              Municípios de Rondônia ordenados por {indicador.nome.toLowerCase()} de {data.produto.nome} em {ano_referencia}
            </caption>
            <thead className="bg-surface-alt text-left">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Posição
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Município
                </th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">
                  Valor ({indicador.unidade.toLowerCase()})
                </th>
                {mostraPercentual && (
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    % do total estadual
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <tr
                  key={item.municipio.codigo_ibge}
                  className={cn(
                    "border-t border-line/70 even:bg-surface-alt/50",
                    item.municipio.codigo_ibge === filtros.municipio && "bg-brand-soft font-semibold",
                  )}
                >
                  <td className="px-4 py-2.5 tabular-nums">{item.posicao ?? "–"}</td>
                  <th scope="row" className="px-4 py-2.5 text-left font-medium">
                    {item.municipio.nome}
                  </th>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    <span className="relative inline-flex min-w-28 justify-end">
                      {item.valor !== null && (
                        <span
                          aria-hidden="true"
                          className="absolute inset-y-0 right-0 -z-0 rounded bg-brand-light/30"
                          style={{ width: `${Math.max((item.valor / maximo) * 100, 2)}%` }}
                        />
                      )}
                      <span className="relative px-1">
                        {formatValor(item.valor, item.status)}
                        {item.status === "sigiloso" && <span className="sr-only"> (sigiloso)</span>}
                        {item.status === "inexistente" && <span className="sr-only"> (sem valor publicado)</span>}
                      </span>
                    </span>
                  </td>
                  {mostraPercentual && <td className="px-4 py-2.5 text-right tabular-nums">{formatPercentual(item.percentual_total, 2)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </Secao>
  );
}
