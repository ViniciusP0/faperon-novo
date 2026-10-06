"use client";

import { Check, FileDown, Link2, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/field";
import type { Indicador, MetaGeral, Municipio } from "@/lib/api-types";
import type { Filtros } from "@/lib/filters";
import { relatorioUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Props {
  filtros: Filtros;
  indicadores: Indicador[];
  municipios: Municipio[];
  anos: MetaGeral["anos"] | undefined;
  paramsPdf: string;
  onChange: (patch: Partial<Filtros>) => void;
}

export function BarraRecorte({ filtros, indicadores, municipios, anos, paramsPdf, onChange }: Props) {
  const [aberta, setAberta] = useState(false);

  const listaAnos = useMemo(() => {
    if (!anos) return [];
    return Array.from({ length: anos.max - anos.min + 1 }, (_, i) => anos.max - i);
  }, [anos]);

  return (
    <div className="container py-3">
      <div className="flex items-center justify-between gap-3 lg:hidden">
        <button
          type="button"
          aria-expanded={aberta}
          aria-controls="recorte-campos"
          onClick={() => setAberta((v) => !v)}
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-field bg-surface px-4 text-sm font-semibold text-ink"
        >
          <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
          Filtros do recorte
        </button>
        <Acoes paramsPdf={paramsPdf} />
      </div>

      <form
        id="recorte-campos"
        aria-label="Filtros do painel"
        onSubmit={(e) => e.preventDefault()}
        className={cn("mt-3 grid gap-3 sm:grid-cols-2 lg:mt-0 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,1fr)_auto] lg:items-end", !aberta && "hidden lg:grid")}
      >
        <div>
          <Label htmlFor="f-indicador">Indicador</Label>
          <Select
            id="f-indicador"
            value={filtros.indicador}
            disabled={!filtros.produto || indicadores.length === 0}
            onChange={(e) => onChange({ indicador: e.target.value })}
          >
            {indicadores.length === 0 && <option value="">Escolha um produto</option>}
            {indicadores.map((i) => (
              <option key={i.slug} value={i.slug}>
                {i.nome} ({i.unidade.toLowerCase()})
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="f-inicio">Ano inicial</Label>
          <Select
            id="f-inicio"
            value={filtros.inicio ?? ""}
            disabled={listaAnos.length === 0}
            onChange={(e) => {
              const inicio = Number(e.target.value);
              onChange({ inicio, fim: filtros.fim !== null && filtros.fim < inicio ? inicio : filtros.fim });
            }}
          >
            {filtros.inicio === null && <option value="">–</option>}
            {listaAnos.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="f-fim">Ano final</Label>
          <Select
            id="f-fim"
            value={filtros.fim ?? ""}
            disabled={listaAnos.length === 0}
            onChange={(e) => {
              const fim = Number(e.target.value);
              onChange({ fim, inicio: filtros.inicio !== null && filtros.inicio > fim ? fim : filtros.inicio });
            }}
          >
            {filtros.fim === null && <option value="">–</option>}
            {listaAnos.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="f-territorio">Território</Label>
          <Select id="f-territorio" value={filtros.municipio} onChange={(e) => onChange({ municipio: e.target.value })}>
            <option value="">Total de Rondônia</option>
            {municipios.map((m) => (
              <option key={m.codigo_ibge} value={m.codigo_ibge}>
                {m.nome}
              </option>
            ))}
          </Select>
        </div>

        <div className="hidden lg:block">
          <Acoes paramsPdf={paramsPdf} />
        </div>
      </form>
    </div>
  );
}

function Acoes({ paramsPdf }: { paramsPdf: string }) {
  const [copiado, setCopiado] = useState(false);
  // Sem permissão de área de transferência, mostra o endereço num campo selecionável (em vez de um modal bloqueante).
  const [manual, setManual] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(window.location.href);
            setManual(null);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2500);
          } catch {
            setManual(window.location.href);
          }
        }}
      >
        {copiado ? <Check aria-hidden="true" className="h-4 w-4" /> : <Link2 aria-hidden="true" className="h-4 w-4" />}
        Copiar link
      </Button>
      <a href={relatorioUrl(paramsPdf)} className={cn(buttonVariants({ variant: "primary", size: "md" }))} download>
        <FileDown aria-hidden="true" className="h-4 w-4" />
        Gerar PDF
      </a>
      {manual && (
        <input
          readOnly
          value={manual}
          aria-label="Link da consulta: selecione e copie"
          onFocus={(e) => e.currentTarget.select()}
          className="h-11 w-64 rounded-xl border border-field bg-card px-3 text-sm text-ink"
        />
      )}
      <span role="status" className="sr-only">
        {copiado ? "Link copiado" : ""}
      </span>
    </div>
  );
}
