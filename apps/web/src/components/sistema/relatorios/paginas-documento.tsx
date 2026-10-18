import type { ModeloDocumento } from "@/lib/sistema/documento";
import { cn } from "@/lib/utils";

/** Capa no padrão do boletim: o fundo do boletim, sem os textos dele, com os campos do modelo. */
export function Capa({ m, className }: { m: ModeloDocumento; className?: string }) {
  return (
    <section aria-label="Capa" className={cn("doc-pagina doc-capa", className)}>
      <div className="doc-capa-texto">
        <h2 className="doc-capa-titulo">{m.titulo}</h2>
        <div className="doc-capa-linha" aria-hidden="true" />
        {m.destaque && <p className="doc-capa-destaque">{m.destaque}</p>}
        {m.campos.map((c) => (
          <p key={`${c.rotulo}-${c.valor}`} className="doc-capa-campo">
            {c.rotulo && `${c.rotulo}: `}
            {c.valor}
          </p>
        ))}
      </div>
    </section>
  );
}

export function Faixa({ m, className }: { m: ModeloDocumento; className?: string }) {
  return (
    <div className={cn("doc-faixa", className)}>
      <p className="doc-faixa-titulo">{m.serie}</p>
      {m.subserie && <p className="doc-faixa-sub">{m.subserie}</p>}
    </div>
  );
}

/** Contracapa de créditos, refeita do boletim (no PDF ela é toda vetorial). */
export function Contracapa({ m, className }: { m: ModeloDocumento; className?: string }) {
  return (
    <section aria-label="Contracapa" className={cn("doc-pagina doc-contracapa", className)}>
      <Faixa m={m} />
      <div className="doc-contracapa-corpo">
        <h2 className="doc-contracapa-titulo">{m.tituloCreditos}</h2>
        <div className="doc-contracapa-sublinha" aria-hidden="true" />
        {m.creditos.map((s) => (
          <div key={s.titulo} className="doc-credito">
            <h3 className="doc-credito-titulo">{s.titulo}</h3>
            {s.linhas.map((l) => (
              <p key={l} className="doc-credito-linha">
                {l}
              </p>
            ))}
          </div>
        ))}
        {(m.nota.titulo || m.nota.texto) && (
          <div className="doc-nota">
            <h3 className="doc-nota-titulo">{m.nota.titulo}</h3>
            <p className="doc-nota-texto">{m.nota.texto}</p>
          </div>
        )}
      </div>
      <div className="doc-rodape">
        {m.rodape.map((l) => (
          <p key={l}>{l}</p>
        ))}
      </div>
    </section>
  );
}
