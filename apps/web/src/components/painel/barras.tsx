import type { StatusValor } from "@/lib/api-types";
import { formatPercentual, formatValor } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface ItemBarra {
  id: string;
  nome: string;
  valor: number | null;
  status: StatusValor;
  /** Participação no total (0–100), quando existe. */
  percentual: number | null;
  destacado?: boolean;
}

interface Props {
  itens: ItemBarra[];
  unidade: string;
  rotulo: string;
}

/** Lista de barras horizontais: o maior valor ocupa toda a largura; o primeiro e o item destacado ganham cor de realce. */
export function Barras({ itens, unidade, rotulo }: Props) {
  const maximo = Math.max(...itens.map((i) => i.valor ?? 0), 1);
  return (
    <ol aria-label={rotulo} className="space-y-3">
      {itens.map((item, i) => {
        const largura = item.valor === null ? 0 : Math.max((item.valor / maximo) * 100, 1.5);
        const lider = i === 0 && item.valor !== null;
        return (
          <li
            key={item.id}
            data-testid="barra-item"
            className={cn(
              "grid grid-cols-[1.75rem_1fr] items-center gap-x-3 gap-y-1 rounded-xl px-3 py-2 sm:grid-cols-[1.75rem_12rem_1fr_auto]",
              item.destacado && "bg-brand-soft ring-2 ring-brand-fg/40",
            )}
          >
            <span className={cn("text-sm font-bold tabular-nums", lider ? "text-brand-fg" : "text-ink-muted")}>{i + 1}º</span>
            <span className="font-medium leading-tight text-ink">{item.nome}</span>
            <span className="col-span-2 flex items-center gap-3 sm:col-span-1">
              <span aria-hidden="true" className="h-3.5 flex-1 overflow-hidden rounded-full bg-surface-alt">
                <span className={cn("block h-full rounded-full", lider ? "bg-brand-lime" : "bg-brand")} style={{ width: `${largura}%` }} />
              </span>
            </span>
            <span className="col-span-2 text-right text-sm tabular-nums text-ink sm:col-span-1 sm:min-w-32">
              <strong className="font-semibold">{formatValor(item.valor, item.status)}</strong>
              {item.status === "sigiloso" && <span className="sr-only"> (sigiloso)</span>}
              {item.status === "inexistente" && <span className="sr-only"> (sem valor publicado)</span>}
              {item.valor !== null && <span className="sr-only"> {unidade.toLowerCase()}</span>}
              {item.percentual !== null && <span className="ml-2 text-ink-muted">{formatPercentual(item.percentual)}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
