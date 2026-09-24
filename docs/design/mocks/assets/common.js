(function () {
  const D = window.FAPERON;
  const L = D.produtos.leite; // IBGE publica em mil litros; os mocks exibem em litros
  if (L.unidade === "Mil litros") { L.unidade = "Litros"; L.total *= 1000; L.serie = L.serie.map(([a, v]) => [a, v * 1000]); L.top = L.top.map((m) => ({ ...m, valor: m.valor * 1000 })); }
  const nf = new Intl.NumberFormat("pt-BR");
  const F = {
    D,
    nf: (n) => nf.format(Math.round(n)),
    // 2.221.610 -> "2,2 mi"; 619.456 -> "619 mil"
    compact(n) {
      if (n >= 1e6) return (n / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " mi";
      if (n >= 1e3) return Math.round(n / 1e3).toLocaleString("pt-BR") + " mil";
      return F.nf(n);
    },
    date(iso, long) {
      const d = new Date(iso + "T12:00:00");
      return d.toLocaleDateString("pt-BR", long ? { day: "numeric", month: "long", year: "numeric" } : { day: "numeric", month: "short", year: "numeric" }).replace(".", "");
    },
    // variacao percentual entre primeiro e ultimo ponto da serie
    delta(serie) {
      const v = serie.map((p) => p[1]).filter((x) => x != null);
      if (v.length < 2 || !v[0]) return null;
      return ((v[v.length - 1] - v[0]) / v[0]) * 100;
    },
    pct(n, d = 0) { return n.toLocaleString("pt-BR", { maximumFractionDigits: d, minimumFractionDigits: d }); },
    spark(serie, { w = 160, h = 44, stroke = "#00604e", fill = "none", dot = true, area = false } = {}) {
      const vals = serie.map((p) => p[1]);
      const min = Math.min(...vals), max = Math.max(...vals), span = max - min || 1;
      const pad = 4;
      const pts = vals.map((v, i) => [pad + (i * (w - 2 * pad)) / (vals.length - 1), h - pad - ((v - min) / span) * (h - 2 * pad)]);
      const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
      const last = pts[pts.length - 1];
      const a = area ? `<path d="${d} L${last[0]} ${h} L${pts[0][0]} ${h} Z" fill="${stroke}" opacity=".12"/>` : "";
      return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="Tendência de ${serie[0][0]} a ${serie[serie.length - 1][0]}">${a}<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>${dot ? `<circle cx="${last[0]}" cy="${last[1]}" r="3.2" fill="${stroke}"/>` : ""}</svg>`;
    },
    bars(serie, { w = 420, h = 120, color = "#00604e", last = "#8bcd51" } = {}) {
      const vals = serie.map((p) => p[1]);
      const max = Math.max(...vals) || 1;
      const gap = 6, bw = (w - gap * (vals.length - 1)) / vals.length;
      return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img" aria-label="Série ${serie[0][0]} a ${serie[serie.length - 1][0]}" preserveAspectRatio="none">` +
        vals.map((v, i) => { const bh = Math.max(2, (v / max) * (h - 4)); return `<rect x="${(i * (bw + gap)).toFixed(1)}" y="${(h - bh).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="2" fill="${i === vals.length - 1 ? last : color}"/>`; }).join("") + "</svg>";
    },
    news(i) { return D.noticias[i]; },
    mockbar(n, nome) {
      const el = document.createElement("div");
      el.className = "mockbar";
      el.innerHTML = `<span>Mock ${n} · ${nome}</span><a href="index.html">Todos os mocks</a>`;
      document.body.appendChild(el);
    },
  };
  window.F = F;
})();
