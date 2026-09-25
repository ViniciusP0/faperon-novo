export interface Numero {
  rotulo: string;
  valor: string;
  detalhe: string;
}

/** Faixa de números da página, no estilo da faixa de indicadores do Início. */
export function FaixaNumeros({ rotulo, itens }: { rotulo: string; itens: Numero[] }) {
  return (
    <section aria-label={rotulo} className="border-y border-line border-t-2 border-t-ink">
      <dl className="container grid sm:grid-cols-3">
        {itens.map((n, i) => (
          <div
            key={n.rotulo}
            className={`py-5 ${i > 0 ? "border-t border-line sm:border-l sm:border-t-0 sm:pl-5" : ""} ${i < itens.length - 1 ? "sm:pr-5" : ""}`}
          >
            <dt className="text-xs font-semibold text-ink-muted">{n.rotulo}</dt>
            <dd className="mt-2 text-[clamp(1.7rem,3vw,2.4rem)] font-semibold leading-none tracking-tight text-brand">{n.valor}</dd>
            <dd className="mt-1 text-sm text-ink-muted">{n.detalhe}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
