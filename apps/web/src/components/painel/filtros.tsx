"use client";

import { useMemo, useState } from "react";
import { Input, Label, Select } from "@/components/ui/field";
import type { Indicador, MetaGeral, ProdutoResumo } from "@/lib/api-types";
import { normalizar, type Filtros } from "@/lib/filters";

interface Props {
  filtros: Filtros;
  segmento: string;
  produtos: ProdutoResumo[];
  indicadores: Indicador[];
  anos: MetaGeral["anos"] | undefined;
  carregandoProdutos: boolean;
  onChange: (patch: Partial<Filtros>) => void;
}

const SEGMENTOS = [
  { valor: "agricultura", rotulo: "Agricultura" },
  { valor: "pecuaria", rotulo: "Pecuária" },
];

export function FiltrosPainel({ filtros, segmento, produtos, indicadores, anos, carregandoProdutos, onChange }: Props) {
  const [busca, setBusca] = useState("");

  const daSegmento = useMemo(() => produtos.filter((p) => p.segmento === segmento), [produtos, segmento]);
  const visiveis = useMemo(() => {
    const termo = normalizar(busca.trim());
    const filtrados = termo ? daSegmento.filter((p) => normalizar(p.nome).includes(termo)) : daSegmento;
    const atual = daSegmento.find((p) => p.slug === filtros.produto);
    return atual && !filtrados.includes(atual) ? [atual, ...filtrados] : filtrados;
  }, [daSegmento, busca, filtros.produto]);

  const listaAnos = useMemo(() => {
    if (!anos) return [];
    return Array.from({ length: anos.max - anos.min + 1 }, (_, i) => anos.max - i);
  }, [anos]);

  return (
    <form
      aria-label="Filtros do painel"
      onSubmit={(e) => e.preventDefault()}
      className="grid gap-4 md:grid-cols-2 lg:grid-cols-6"
    >
      <div className="lg:col-span-1">
        <Label htmlFor="f-segmento">Segmento</Label>
        <Select
          id="f-segmento"
          value={segmento}
          onChange={(e) => onChange({ segmento: e.target.value, produto: "", indicador: "", municipios: [], produtos: [] })}
        >
          {SEGMENTOS.map((s) => (
            <option key={s.valor} value={s.valor}>
              {s.rotulo}
            </option>
          ))}
        </Select>
      </div>

      <div className="lg:col-span-2">
        <Label htmlFor="f-busca">Buscar produto</Label>
        <Input
          id="f-busca"
          type="search"
          placeholder="Digite o nome (ex.: soja, leite)"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          autoComplete="off"
        />
      </div>

      <div className="lg:col-span-3">
        <Label htmlFor="f-produto">Produto</Label>
        <Select
          id="f-produto"
          value={filtros.produto}
          disabled={carregandoProdutos}
          onChange={(e) => onChange({ segmento, produto: e.target.value, indicador: "", municipio: "" })}
          aria-describedby="f-produto-ajuda"
        >
          <option value="">{carregandoProdutos ? "Carregando…" : "Selecione um produto"}</option>
          {visiveis.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.nome}
            </option>
          ))}
        </Select>
        <p id="f-produto-ajuda" className="mt-1 text-xs text-ink-muted" aria-live="polite">
          {visiveis.length} {visiveis.length === 1 ? "produto encontrado" : "produtos encontrados"}
        </p>
      </div>

      <div className="lg:col-span-4">
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

      <div className="grid grid-cols-2 gap-3 lg:col-span-2">
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
      </div>
    </form>
  );
}
