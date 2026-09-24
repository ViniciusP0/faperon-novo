import type { Ponto } from "@/lib/api-types";

export function Sparkline({ pontos, negativo = false }: { pontos: Ponto[]; negativo?: boolean }) {
  const validos = pontos.map((p, i) => ({ v: p.valor, i })).filter((p): p is { v: number; i: number } => p.v !== null);
  if (validos.length < 2) return null;
  const w = 130;
  const h = 36;
  const pad = 4;
  const valores = validos.map((p) => p.v);
  const min = Math.min(...valores);
  const span = Math.max(...valores) - min || 1;
  const ultimoIndice = pontos.length - 1 || 1;
  const xy = validos.map(({ v, i }) => [pad + (i * (w - 2 * pad)) / ultimoIndice, h - pad - ((v - min) / span) * (h - 2 * pad)] as const);
  const caminho = xy.map(([x, y], k) => `${k ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const [ux, uy] = xy[xy.length - 1]!;
  const cor = negativo ? "var(--danger)" : "var(--brand)";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true" className="max-w-full">
      <path d={caminho} fill="none" stroke={cor} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={ux} cy={uy} r="3.2" fill={cor} />
    </svg>
  );
}

export function BarrasAnuais({ pontos, descricao }: { pontos: Ponto[]; descricao: string }) {
  const largura = 420;
  const altura = 170;
  const folga = 6;
  const maximo = Math.max(...pontos.map((p) => p.valor ?? 0), 1);
  const larguraBarra = (largura - folga * (pontos.length - 1)) / Math.max(pontos.length, 1);
  return (
    <svg viewBox={`0 0 ${largura} ${altura}`} preserveAspectRatio="none" role="img" aria-label={descricao} className="h-[170px] w-full">
      {pontos.map((p, i) => {
        if (p.valor === null) return null;
        const h = Math.max(2, (p.valor / maximo) * (altura - 4));
        return (
          <rect
            key={p.ano}
            x={i * (larguraBarra + folga)}
            y={altura - h}
            width={larguraBarra}
            height={h}
            rx="2"
            fill={i === pontos.length - 1 ? "var(--brand-lime)" : "var(--brand)"}
          />
        );
      })}
    </svg>
  );
}
