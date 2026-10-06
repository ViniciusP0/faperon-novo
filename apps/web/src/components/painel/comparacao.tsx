"use client";

import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/field";
import { api } from "@/lib/api";
import type { Municipio, ProdutoResumo } from "@/lib/api-types";
import { opcaoComparacao } from "@/lib/chart-options";
import { descreverComparacao } from "@/lib/descricao";
import { MAX_COMPARACAO, recorteParams, type Filtros, type ModoComparacao } from "@/lib/filters";
import { Carregando, ErroConsulta, Secao, TabelaSeries, Vazio } from "./comuns";
import { Grafico } from "./grafico";

interface Props {
  filtros: Filtros;
  municipios: Municipio[];
  produtos: ProdutoResumo[];
  onChange: (patch: Partial<Filtros>) => void;
}

export function Comparacao({ filtros, municipios, produtos, onChange }: Props) {
  const modo = filtros.modo;
  const selecionados = modo === "municipios" ? filtros.municipios : filtros.produtos;
  const pronto = selecionados.length >= 2;

  const params = recorteParams(filtros);
  if (modo === "municipios") {
    params.set("municipios", filtros.municipios.join(","));
  } else {
    params.delete("produto");
    params.set("produtos", filtros.produtos.join(","));
    if (filtros.municipio) params.set("municipio", filtros.municipio);
  }
  const qs = params.toString();

  const { data, error, isFetching, refetch } = useQuery({
    queryKey: ["comparacao", qs],
    queryFn: () => api.comparacao(qs),
    enabled: pronto,
    retry: false,
  });

  const option = useMemo(() => (data ? opcaoComparacao(data.anos, data.series, data.unidade) : null), [data]);

  const opcoes = modo === "municipios" ? municipios.map((m) => ({ id: m.codigo_ibge, nome: m.nome })) : produtos.map((p) => ({ id: p.slug, nome: p.nome }));
  const nomeDe = (id: string) => opcoes.find((o) => o.id === id)?.nome ?? id;
  const disponiveis = opcoes.filter((o) => !selecionados.includes(o.id));
  const cheio = selecionados.length >= MAX_COMPARACAO;

  const atualizarLista = (lista: string[]) => onChange(modo === "municipios" ? { municipios: lista } : { produtos: lista });

  const trocarModo = (novo: ModoComparacao) => {
    if (novo === "produtos" && filtros.produtos.length === 0 && filtros.produto) onChange({ modo: novo, produtos: [filtros.produto] });
    else onChange({ modo: novo });
  };

  const usarTop3 = async () => {
    const ranking = await api.ranking(recorteParams(filtros).toString());
    const top = ranking.itens.filter((i) => i.status === "ok").slice(0, 3).map((i) => i.municipio.codigo_ibge);
    onChange({ modo: "municipios", municipios: top });
  };

  return (
    <Secao id="comparacao" etiqueta="Compare" titulo="Comparação">
      <p className="-mt-3 mb-6 max-w-[62ch] text-ink-muted">
        Compare de 2 a {MAX_COMPARACAO} itens na mesma unidade de medida. Itens com unidades diferentes são bloqueados.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <div className="space-y-5">
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Comparar por</legend>
            <div className="inline-flex rounded-xl bg-surface-alt p-1">
              {(["municipios", "produtos"] as const).map((m) => (
                <label
                  key={m}
                  className="relative cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-ink has-[:checked]:bg-brand has-[:checked]:text-white has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-steel"
                >
                  <input type="radio" name="modo-comparacao" value={m} checked={modo === m} onChange={() => trocarModo(m)} className="absolute inset-0 cursor-pointer opacity-0" />
                  {m === "municipios" ? "Municípios" : "Produtos"}
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <Label htmlFor="comparacao-adicionar">
              Adicionar {modo === "municipios" ? "município" : "produto"} ({selecionados.length}/{MAX_COMPARACAO})
            </Label>
            <Select
              id="comparacao-adicionar"
              value=""
              disabled={cheio}
              onChange={(e) => e.target.value && atualizarLista([...selecionados, e.target.value])}
            >
              <option value="">{cheio ? "Limite atingido" : "Selecione…"}</option>
              {disponiveis.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
            </Select>
          </div>

          {modo === "municipios" && (
            <Button variant="secondary" onClick={usarTop3} disabled={!filtros.produto || !filtros.indicador}>
              Usar os 3 maiores do ranking
            </Button>
          )}

          {selecionados.length > 0 && (
            <ul aria-label="Itens selecionados" className="flex flex-wrap gap-2">
              {selecionados.map((id) => (
                <li key={id} className="inline-flex items-center gap-1 rounded-full bg-brand-soft py-1 pl-3 pr-1 text-sm font-medium text-brand-strong">
                  {nomeDe(id)}
                  <button
                    type="button"
                    aria-label={`Remover ${nomeDe(id)}`}
                    onClick={() => atualizarLista(selecionados.filter((s) => s !== id))}
                    className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-card"
                  >
                    <X aria-hidden="true" className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="min-w-0">
          {!pronto && <Vazio>Selecione pelo menos 2 {modo === "municipios" ? "municípios" : "produtos"} para comparar.</Vazio>}
          {pronto && isFetching && !data && <Carregando rotulo="comparação" />}
          {pronto && error && <ErroConsulta erro={error} onRetry={() => refetch()} />}
          {pronto && !error && data && option && (
            <div className="rounded-2xl border border-line bg-card p-4 md:p-6">
              <p className="mb-2 text-sm text-ink-muted">
                {data.indicador.nome} — {data.unidade.toLowerCase()}, {data.inicio} a {data.fim}.
              </p>
              <Grafico option={option} descricao={descreverComparacao(data.series, data.unidade)} altura={420} alturaMovel={320} />
              <p className="mt-3 text-sm leading-relaxed">{descreverComparacao(data.series, data.unidade)}</p>
              <TabelaSeries
                legenda={`Comparação de ${data.indicador.nome.toLowerCase()} entre ${data.series.map((s) => s.nome).join(", ")}`}
                unidade={data.unidade}
                anos={data.anos}
                series={data.series}
              />
            </div>
          )}
        </div>
      </div>
    </Secao>
  );
}
