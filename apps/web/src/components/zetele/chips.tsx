"use client";

import { useState } from "react";
import { ZETELE, type PerguntaPronta } from "@/content/zetele";

interface Props {
  visiveis: PerguntaPronta[];
  demais: PerguntaPronta[];
  soEstaticas: boolean;
  onEscolher: (p: PerguntaPronta) => void;
}

export function Chips({ visiveis, demais, soEstaticas, onEscolher }: Props) {
  const [todas, setTodas] = useState(false);
  const filtrar = (lista: PerguntaPronta[]) => lista.filter((p) => !soEstaticas || p.tipo === "estatica");
  // sem o modelo, as estáticas "escondidas" sobem para não deixar o visitante sem opção
  const lista = todas || soEstaticas ? filtrar([...visiveis, ...demais]) : filtrar(visiveis);
  const restantes = !todas && !soEstaticas && filtrar(demais).length > 0;
  return (
    <div>
      <ul aria-label={ZETELE.rotuloSugestoes} className="flex flex-wrap gap-2">
        {lista.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onEscolher(p)}
              className="rounded-full border border-line bg-surface-alt px-3 py-1.5 text-left text-xs font-medium text-ink hover:border-brand-fg hover:text-brand-fg"
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
