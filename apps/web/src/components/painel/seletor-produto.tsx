"use client";

import { useMemo, useState } from "react";
import { PRODUTOS_EM_DESTAQUE } from "@/content/painel";
import { Input, Label, Select } from "@/components/ui/field";
import type { ProdutoResumo } from "@/lib/api-types";
import { normalizar, type Filtros } from "@/lib/filters";
import { cn } from "@/lib/utils";

interface Props {
  filtros: Filtros;
  segmento: string;
  produtos: ProdutoResumo[];
  carregandoProdutos: boolean;
  onChange: (patch: Partial<Filtros>) => void;
}

const SEGMENTOS = [
  { valor: "agricultura", rotulo: "Agricultura" },
  { valor: "pecuaria", rotulo: "Pecuária" },
] as const;

export function SeletorProduto({ filtros, segmento, produtos, carregandoProdutos, onChange }: Props) {
  const [busca, setBusca] = useState("");

  const daSegmento = useMemo(() => produtos.filter((p) => p.segmento === segmento), [produtos, segmento]);
  const destaques = useMemo(() => {
    const slugs = PRODUTOS_EM_DESTAQUE[segmento === "pecuaria" ? "pecuaria" : "agricultura"];
    return slugs.map((s) => daSegmento.find((p) => p.slug === s)).filter((p): p is ProdutoResumo => Boolean(p));
  }, [daSegmento, segmento]);
  const visiveis = useMemo(() => {
    const termo = normalizar(busca.trim());
    const filtrados = termo ? daSegmento.filter((p) => normalizar(p.nome).includes(termo)) : daSegmento;
    const atual = daSegmento.find((p) => p.slug === filtros.produto);
    return atual && !filtrados.includes(atual) ? [atual, ...filtrados] : filtrados;
  }, [daSegmento, busca, filtros.produto]);

  return (
    <div aria-label="Escolha do produto" role="group" className="space-y-5">
      <fieldset>
        <legend className="sr-only">Segmento</legend>
        <div className="inline-flex rounded-2xl bg-white/15 p-1">
          {SEGMENTOS.map((s) => (
            <label
              key={s.valor}
              className="relative cursor-pointer rounded-xl px-5 py-2.5 text-sm font-semibold text-white has-[:checked]:bg-white has-[:checked]:text-brand-dark has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-white md:text-base"
            >
              <input
                type="radio"
                name="segmento"
                value={s.valor}
                checked={segmento === s.valor}
                onChange={() => onChange({ segmento: s.valor, produto: "", indicador: "", municipio: "", municipios: [], produtos: [] })}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
              {s.rotulo}
            </label>
          ))}
        </div>
      </fieldset>

      {destaques.length > 0 && (
        <ul aria-label="Produtos em destaque" className="flex flex-wrap gap-2.5">
          {destaques.map((p) => {
            const ativo = filtros.produto === p.slug;
            return (
              <li key={p.slug}>
                <button
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => onChange({ segmento, produto: p.slug, indicador: "", municipio: "" })}
                  className={cn(
                    "rounded-full border-2 px-5 py-2.5 text-base font-semibold transition-colors",
                    ativo
                      ? "border-brand-lime bg-brand-lime text-brand-dark"
                      : "border-white/60 bg-transparent text-white hover:border-white hover:bg-white/15",
                  )}
                >
                  {p.nome}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="grid gap-4 rounded-2xl bg-white/10 p-4 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
        <div>
          <Label htmlFor="f-busca" className="text-white">
            Buscar produto
          </Label>
          <Input
            id="f-busca"
            type="search"
            placeholder="Digite o nome (ex.: soja, leite)"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div>
          <Label htmlFor="f-produto" className="text-white">
            Produto
          </Label>
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
          <p id="f-produto-ajuda" className="mt-1 text-xs text-white/85" aria-live="polite">
            {visiveis.length} {visiveis.length === 1 ? "produto encontrado" : "produtos encontrados"}
          </p>
        </div>
      </div>
    </div>
  );
}
