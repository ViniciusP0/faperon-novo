import { useId } from "react";

export function Seletor({ rotulo, valor, opcoes, onChange }: { rotulo: string; valor: string; opcoes: { valor: string; rotulo: string }[]; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <div className="grid gap-1">
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
        {rotulo}
      </label>
      <select id={id} value={valor} onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-md border border-line bg-card px-3 text-sm focus-visible:outline-brand">
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>{o.rotulo}</option>
        ))}
      </select>
    </div>
  );
}
