import { formatNumero } from "@/lib/format";

export interface ColunaTabela {
  chave: string;
  rotulo: string;
  numerico?: boolean;
}

export function TabelaDados({ legenda, colunas, linhas }: { legenda: string; colunas: ColunaTabela[]; linhas: Record<string, string | number | null>[] }) {
  return (
    <div role="region" tabIndex={0} aria-label={`Tabela: ${legenda}`} className="max-h-[420px] overflow-auto rounded-md border border-line focus-visible:outline-brand">
      <table className="w-full text-sm" aria-label={legenda}>
        <caption className="sr-only">{legenda}</caption>
        <thead className="sticky top-0 bg-surface-alt">
          <tr>
            {colunas.map((c) => (
              <th key={c.chave} scope="col" className={c.numerico ? "px-3 py-2 text-right" : "px-3 py-2 text-left"}>
                {c.rotulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => (
            <tr key={i} className="border-t border-line">
              {colunas.map((c) => {
                const v = l[c.chave];
                const texto = v === null || v === undefined ? "–" : typeof v === "number" ? formatNumero(v) : v;
                return (
                  <td key={c.chave} className={c.numerico ? "px-3 py-1.5 text-right tabular-nums" : "px-3 py-1.5"}>
                    {texto}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Um bloco da visão em tabela: título (h3) e a tabela equivalente de um gráfico ou mapa. */
export function GrupoTabela({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section aria-label={titulo}>
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-ink-muted">{titulo}</h3>
      {children}
    </section>
  );
}
