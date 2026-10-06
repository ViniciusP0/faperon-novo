"use client";

import { ApiError } from "@/lib/api";
import type { Meta, Ponto, SerieComparada } from "@/lib/api-types";
import { formatDataHora, formatValor } from "@/lib/format";
import { Alert, Skeleton } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";

export function NotaMetodologica({ meta }: { meta: Meta | null | undefined }) {
  return (
    <aside aria-label="Nota metodológica" className="mt-6 rounded-xl border border-line bg-surface-alt p-4 text-sm text-ink-muted">
      <p className="font-semibold text-ink">Nota metodológica</p>
      {meta ? (
        <p className="mt-1">
          Fonte: {meta.fonte}. Tabela SIDRA{" "}
          <a href={meta.url_fonte} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-fg underline">
            {meta.tabela_sidra}
            <span className="sr-only"> (abre em nova aba)</span>
          </a>
          . Dados atualizados em {formatDataHora(meta.atualizado_em)}. Valores sigilosos do IBGE aparecem como &quot;X&quot; e valores
          inexistentes como &quot;–&quot;; nunca como zero.
        </p>
      ) : (
        <p className="mt-1">
          Fonte: IBGE – Pesquisa Agrícola Municipal (SIDRA, tabela 5457) e Pesquisa da Pecuária Municipal (SIDRA, tabelas 3939 e 74).
          Selecione um produto para ver a data da última atualização.
        </p>
      )}
    </aside>
  );
}

interface SecaoProps {
  id: string;
  /** Etiqueta pequena em caixa alta acima do título. */
  etiqueta: string;
  titulo: React.ReactNode;
  /** Intercala o fundo das seções. */
  alternada?: boolean;
  children: React.ReactNode;
}

/** Faixa da página com título no padrão da home; `id` é a âncora da navegação. */
export function Secao({ id, etiqueta, titulo, alternada = false, children }: SecaoProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-titulo`}
      className={`scroll-mt-28 border-b border-line py-10 md:py-14 ${alternada ? "bg-surface-alt" : "bg-card"}`}
    >
      <div className="container">
        <p className="text-sm font-bold uppercase tracking-wide text-brand-fg">{etiqueta}</p>
        <h2 id={`${id}-titulo`} className="mt-1 max-w-[52ch] text-2xl font-bold leading-tight tracking-tight text-brand-strong md:text-3xl">
          {titulo}
        </h2>
        <div className="mt-6">{children}</div>
      </div>
    </section>
  );
}

export function Carregando({ rotulo }: { rotulo: string }) {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <span className="sr-only">Carregando {rotulo}…</span>
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export function ErroConsulta({ erro, onRetry }: { erro: unknown; onRetry?: () => void }) {
  const api = erro instanceof ApiError ? erro : null;
  if (api?.status === 422) {
    return (
      <Alert tone="erro" title="Comparação bloqueada">
        {api.message}. Escolha itens com a mesma unidade de medida.
      </Alert>
    );
  }
  const mensagem =
    api && api.status < 500 ? api.message : "Não foi possível consultar os dados agora. Tente novamente em instantes.";
  return (
    <Alert tone="erro" title="Erro na consulta">
      <p>{mensagem}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </Alert>
  );
}

export function Vazio({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-line p-8 text-center text-ink-muted">{children}</p>;
}

interface TabelaSerieProps {
  legenda: string;
  unidade: string;
  anos: number[];
  series: (SerieComparada | { id: string; nome: string; pontos: Ponto[] })[];
}

/** Tabela alternativa ao gráfico: um ano por linha, uma coluna por série. */
export function TabelaSeries({ legenda, unidade, anos, series }: TabelaSerieProps) {
  return (
    <details className="mt-4 rounded-xl border border-line">
      <summary className="cursor-pointer rounded-xl px-4 py-3 text-sm font-medium text-brand-strong">Ver tabela de dados do gráfico</summary>
      <div tabIndex={0} role="region" aria-label={`Tabela: ${legenda}`} className="max-h-96 overflow-auto px-4 pb-4">
        <table className="w-full text-sm">
          <caption className="py-2 text-left text-ink-muted">{legenda}</caption>
          <thead className="sticky top-0 bg-surface">
            <tr className="border-b border-line text-left">
              <th scope="col" className="py-2 pr-4 font-semibold">
                Ano
              </th>
              {series.map((s) => (
                <th key={s.id} scope="col" className="py-2 pr-4 text-right font-semibold">
                  {s.nome} <span className="font-normal text-ink-muted">({unidade.toLowerCase()})</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {anos.map((ano, i) => (
              <tr key={ano} className="border-b border-line/60">
                <th scope="row" className="py-1.5 pr-4 text-left font-medium">
                  {ano}
                </th>
                {series.map((s) => {
                  const p = s.pontos[i];
                  return (
                    <td key={s.id} className="py-1.5 pr-4 text-right tabular-nums">
                      {p ? formatValor(p.valor, p.status) : "–"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
