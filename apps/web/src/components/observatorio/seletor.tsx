import { useId } from "react";

export function Seletor({ rotulo, valor, opcoes, onChange }: { rotulo: string; valor: string; opcoes: { valor: string; rotulo: string }[]; onChange: (v: string) => void }) {
  const id = useId();
  // Valor ausente ou fora das opções (ex.: padrão do servidor ainda não escolhido ou valor inválido na URL): mostra "Padrão" ou o valor cru marcado como inválido.
  const valido = opcoes.some((o) => o.valor === valor);
  const lista = valido
    ? opcoes
    : valor !== ""
      ? [{ valor, rotulo: `${valor} (valor inválido)` }, ...opcoes]
      : opcoes.some((o) => o.valor === "") ? opcoes : [{ valor: "", rotulo: "Padrão" }, ...opcoes];
  return (
    <div className="grid gap-1">
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
        {rotulo}
      </label>
      <select id={id} value={valido || valor !== "" ? valor : ""} onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-md border border-line bg-card px-3 text-sm focus-visible:outline-brand">
        {lista.map((o) => (
          <option key={o.valor} value={o.valor}>{o.rotulo}</option>
        ))}
      </select>
    </div>
  );
}
