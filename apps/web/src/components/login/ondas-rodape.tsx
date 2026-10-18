/** Rodapé decorativo da página de login: ondas sobrepostas nas cores da FAPERON, cada uma a 50%. */
const ONDAS = [
  { cor: "var(--brand-lime)", d: "M0 70 C 180 20 360 20 540 55 S 900 110 1080 70 S 1320 20 1440 45 V160 H0 Z" },
  { cor: "var(--brand-light)", d: "M0 95 C 200 55 400 60 600 90 S 960 135 1180 95 S 1380 60 1440 75 V160 H0 Z" },
  { cor: "var(--brand)", d: "M0 115 C 240 85 420 95 660 118 S 1020 150 1240 120 S 1400 100 1440 108 V160 H0 Z" },
  { cor: "var(--brand-dark)", d: "M0 138 C 260 118 480 126 720 140 S 1100 158 1300 140 S 1420 132 1440 136 V160 H0 Z" },
];

export function OndasRodape() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 1440 160"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full sm:h-32 lg:h-40"
    >
      {ONDAS.map((o) => (
        <path key={o.cor} d={o.d} fill={o.cor} fillOpacity={0.5} />
      ))}
    </svg>
  );
}
