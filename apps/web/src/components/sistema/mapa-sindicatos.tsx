"use client";

import "leaflet/dist/leaflet.css";
import type { LatLngBounds, Map as LeafletMap, Marker } from "leaflet";
import { MapPin, Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import contornoRO from "@/content/rondonia.json";
import type { Sindicato } from "@/content/sindicatos";
import { filtrarSindicatos, telefoneHref } from "@/lib/sindicatos";

/** Contorno de Rondônia (malha do IBGE) em [lat, lng], que é a ordem do Leaflet. */
const ANEL_RO = (contornoRO.coordinates[0] as number[][]).map(([lng, lat]) => [lat!, lng!] as [number, number]);
/** Retângulo cobrindo o mundo, usado com o contorno de Rondônia como "buraco" para esmaecer tudo que é de fora do estado. */
const MUNDO: [number, number][] = [
  [-85, -180],
  [-85, 180],
  [85, 180],
  [85, -180],
];

const PIN = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 42" width="32" height="42" aria-hidden="true"><path d="M16 1C8 1 2 7 2 15c0 10 14 26 14 26s14-16 14-26C30 7 24 1 16 1z" fill="#00604e" stroke="#fff" stroke-width="2"/><circle cx="16" cy="15" r="5.5" fill="#8bcd51"/></svg>`;

const AVISO_PRECISAO = {
  endereco: "",
  rua: "Localização aproximada, pela rua do endereço.",
  cidade: "Localização aproximada, no centro do município.",
} as const;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, classe: string, texto?: string, atributos: Record<string, string> = {}) {
  const e = document.createElement(tag);
  e.className = classe;
  if (texto) e.textContent = texto;
  for (const [k, v] of Object.entries(atributos)) e.setAttribute(k, v);
  return e;
}

/** Monta o conteúdo do popup com textContent, sem interpretar HTML do cadastro. */
function montarPopup(s: Sindicato): HTMLElement {
  const raiz = el("article", "text-sm");
  if (s.foto) {
    raiz.append(el("img", "block h-28 w-full object-cover", undefined, { src: s.foto, alt: `Fachada do Sindicato Rural de ${s.nome}`, loading: "lazy" }));
  } else {
    raiz.append(el("div", "flex h-14 items-center justify-center bg-brand-soft text-xs text-ink-muted", "Foto da sede não disponível"));
  }
  const corpo = el("div", "grid gap-1.5 p-3.5");
  corpo.append(el("h3", "text-base font-bold leading-snug text-brand-strong", s.nome));
  const presidente = el("p", "text-ink-muted");
  presidente.append(el("span", "font-semibold text-ink", "Presidente: "), document.createTextNode(s.presidente));
  corpo.append(presidente);
  if (s.endereco) corpo.append(el("p", "leading-snug text-ink-muted", s.endereco));
  const aviso = s.endereco ? AVISO_PRECISAO[s.precisao] : "Endereço não informado no cadastro. Localização no centro do município.";
  if (aviso) corpo.append(el("p", "text-xs italic text-ink-muted", aviso));
  const contatos = el("div", "flex flex-wrap gap-2 pt-1");
  for (const t of s.telefones) {
    contatos.append(el("a", "rounded-full bg-brand px-3 py-1.5 font-semibold !text-white no-underline", t, { href: telefoneHref(t) }));
  }
  corpo.append(contatos);
  corpo.append(el("a", "break-words font-medium text-brand-fg underline", s.email, { href: `mailto:${s.email}` }));
  corpo.append(
    el("a", "font-medium text-brand-fg underline", "Como chegar", {
      href: `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`,
      target: "_blank",
      rel: "noopener noreferrer",
    }),
  );
  raiz.append(corpo);
  return raiz;
}

/** Mapa de Rondônia com um pin por sindicato rural; a busca filtra os pins e o clique abre foto e contatos. */
export function MapaSindicatos({ sindicatos }: { sindicatos: Sindicato[] }) {
  const id = useId();
  const [busca, setBusca] = useState("");
  const [pronto, setPronto] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const mapa = useRef<LeafletMap | null>(null);
  const pins = useRef(new Map<string, Marker>());
  const limites = useRef<LatLngBounds | null>(null);

  const visiveis = useMemo(() => filtrarSindicatos(sindicatos, busca), [busca, sindicatos]);

  useEffect(() => {
    let vivo = true;
    let m: LeafletMap | undefined;
    const registro = pins.current;
    import("leaflet").then((L) => {
      if (!vivo || !container.current) return;
      const estado = L.polygon(ANEL_RO);
      limites.current = estado.getBounds();
      m = L.map(container.current, { scrollWheelZoom: false, maxBounds: limites.current.pad(0.08), maxBoundsViscosity: 1 });
      m.fitBounds(limites.current);
      m.setMinZoom(m.getZoom());
      L.polygon([MUNDO, ANEL_RO], { stroke: false, fillColor: "#e6f2ea", fillOpacity: 0.88, interactive: false }).addTo(m);
      estado.setStyle({ color: "#00604e", weight: 2.5, fill: false, interactive: false }).addTo(m);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
      }).addTo(m);
      const icone = L.divIcon({ html: PIN, className: "", iconSize: [32, 42], iconAnchor: [16, 41], popupAnchor: [0, -38] });
      for (const s of sindicatos) {
        const pin = L.marker([s.lat, s.lng], { icon: icone, title: `Sindicato Rural de ${s.nome}`, alt: `Sindicato Rural de ${s.nome}` });
        // o cartão nunca passa da altura do painel: se precisar, rola por dentro
        const alturaMaxima = Math.max(container.current.clientHeight - 72, 200);
        pin.bindPopup(() => montarPopup(s), { maxWidth: 280, minWidth: 280, maxHeight: alturaMaxima, autoPanPadding: [16, 16] });
        registro.set(s.nome, pin);
      }
      // Com o limite do estado ativo, o mapa volta para dentro dele logo depois de rolar até o cartão
      // e o cartão de um pin perto da borda fica cortado. Enquanto há cartão aberto, o limite sai.
      const mapaAtual = m;
      const limiteDoMapa = limites.current.pad(0.08);
      mapaAtual.on("popupopen", () => mapaAtual.setMaxBounds(null as unknown as LatLngBounds));
      mapaAtual.on("popupclose", () => mapaAtual.setMaxBounds(limiteDoMapa));
      mapa.current = m;
      setPronto(true);
    });
    return () => {
      vivo = false;
      registro.clear();
      mapa.current = null;
      setPronto(false);
      m?.remove();
    };
  }, [sindicatos]);

  // Mostra só os pins da busca e reenquadra o mapa neles; com um único resultado, já abre o popup.
  useEffect(() => {
    const m = mapa.current;
    if (!pronto || !m) return;
    const nomes = new Set(visiveis.map((s) => s.nome));
    pins.current.forEach((pin, nome) => {
      if (nomes.has(nome)) pin.addTo(m);
      else pin.remove();
    });
    if (visiveis.length === 0) return;
    if (visiveis.length === sindicatos.length) {
      if (limites.current) m.fitBounds(limites.current);
    } else if (visiveis.length === 1) {
      const s = visiveis[0]!;
      m.setView([s.lat, s.lng], 13);
      pins.current.get(s.nome)?.openPopup();
    } else {
      m.fitBounds(
        visiveis.map((s) => [s.lat, s.lng] as [number, number]),
        { padding: [48, 48], maxZoom: 11 },
      );
    }
  }, [visiveis, pronto, sindicatos.length]);

  const abrir = (s: Sindicato) => {
    const m = mapa.current;
    if (!m) return;
    m.setView([s.lat, s.lng], 13);
    pins.current.get(s.nome)?.openPopup();
    container.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold">
        Buscar por município ou presidente
      </label>
      <div className="relative mt-2 max-w-xl">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" />
        <input
          id={id}
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Ex.: Vilhena"
          className="h-12 w-full rounded-xl border border-field bg-surface pl-11 pr-3 text-ink placeholder:text-ink-muted"
        />
      </div>
      <p role="status" aria-live="polite" className="mt-3 text-sm text-ink-muted">
        {visiveis.length === sindicatos.length ? `${sindicatos.length} sindicatos no mapa` : `${visiveis.length} de ${sindicatos.length} sindicatos`}
      </p>
      {visiveis.length === 0 && (
        <p className="mt-3 rounded-2xl border border-dashed border-line p-6 text-center text-ink-muted">
          Nenhum sindicato encontrado para “{busca}”. Confira a grafia ou apague a busca.
        </p>
      )}

      <div
        ref={container}
        role="region"
        aria-label="Mapa dos sindicatos rurais de Rondônia"
        className="relative z-0 mt-4 h-[28rem] w-full overflow-hidden rounded-2xl border-2 border-line bg-surface-alt md:h-[36rem]"
      />

      <details className="mt-4 rounded-2xl border border-line bg-card p-4">
        <summary className="cursor-pointer text-sm font-semibold">Ver os sindicatos em lista</summary>
        <ul className="mt-3 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
          {visiveis.map((s) => (
            <li key={s.nome}>
              <button type="button" onClick={() => abrir(s)} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-2 text-left text-sm hover:bg-brand-soft">
                <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-fg" />
                {s.nome}
              </button>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
