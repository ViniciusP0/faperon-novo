"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { ZETELE, type PerguntaPronta } from "@/content/zetele";

interface Props {
  visiveis: PerguntaPronta[];
  demais: PerguntaPronta[];
  soEstaticas: boolean;
  onEscolher: (p: PerguntaPronta) => void;
  onOcultar: () => void;
}

/** Sugestões do painel: as da página primeiro, o resto em "Mais sugestões"; a lista rola dentro do painel. */
export function Chips({ visiveis, demais, soEstaticas, onEscolher, onOcultar }: Props) {
  const [todas, setTodas] = useState(false);
  const filtrar = (lista: PerguntaPronta[]) => lista.filter((p) => !soEstaticas || p.tipo === "estatica");
  const daPagina = filtrar(visiveis);
  // se nenhuma da página serve (ex.: sem o modelo), as outras estáticas sobem para não deixar a pessoa sem opção
  const lista = todas || daPagina.length === 0 ? filtrar([...visiveis, ...demais]) : daPagina;
  const restantes = lista.length < filtrar([...visiveis, ...demais]).length;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-ink-muted">{ZETELE.rotuloSugestoes}</p>
        <button
          type="button"
          onClick={onOcultar}
          aria-label={ZETELE.ocultarSugestoes}
          className="rounded-md p-1 text-ink-muted hover:bg-surface-alt hover:text-ink"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
      <ul aria-label={ZETELE.rotuloSugestoes} className="flex max-h-36 flex-wrap gap-2 overflow-y-auto overscroll-contain pr-1">
        {lista.map((p) => (
          <li key={p.id} className="max-w-full">
            <button
              type="button"
              onClick={() => onEscolher(p)}
              className="max-w-full rounded-full border border-line bg-surface-alt px-3 py-1.5 text-left text-xs font-medium text-ink hover:border-brand-fg hover:text-brand-fg"
            >
              {p.texto}
            </button>
          </li>
        ))}
      </ul>
      {restantes && (
        <button type="button" onClick={() => setTodas(true)} className="mt-2 text-xs font-medium text-brand-fg underline">
          {ZETELE.maisSugestoes}
        </button>
      )}
    </div>
  );
}
