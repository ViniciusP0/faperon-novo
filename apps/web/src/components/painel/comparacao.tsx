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
import { Carregando, ErroConsulta, NotaMetodologica, TabelaSeries, Vazio } from "./comuns";
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
    <section aria-labelledby="comparacao-titulo">
      <h2 id="comparacao-titulo" className="text-xl font-semibold">
        Comparação
      </h2>
      <p className="mt-1 text-sm text-ink-muted">
        Compare de 2 a {MAX_COMPARACAO} itens na mesma unidade de medida. Itens com unidades diferentes são bloqueados.
      </p>

      <fieldset className="mt-4">
        <legend className="mb-2 text-sm font-medium">Comparar por</legend>
        <div className="flex gap-6">
          {(["municipios", "produtos"] as const).map((m) => (
            <label key={m} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="modo-comparacao"
                value={m}
                checked={modo === m}
                onChange={() => trocarModo(m)}
                className="h-4 w-4 accent-[#00604e]"
              />
              {m === "municipios" ? "Municípios" : "Produtos"}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,20rem)_1fr] md:items-end">
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
          <div>
            <Button variant="secondary" onClick={usarTop3} disabled={!filtros.produto || !filtros.indicador}>
              Usar os 3 maiores do ranking
            </Button>
          </div>
        )}
      </div>

      {selecionados.length > 0 && (
        <ul aria-label="Itens selecionados" className="mt-4 flex flex-wrap gap-2">
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

      <div className="mt-6">
        {!pronto && <Vazio>Selecione pelo menos 2 {modo === "municipios" ? "municípios" : "produtos"} para comparar.</Vazio>}
        {pronto && isFetching && !data && <Carregando rotulo="comparação" />}
        {pronto && error && <ErroConsulta erro={error} onRetry={() => refetch()} />}
        {pronto && !error && data && option && (
          <>
            <p className="mb-2 text-sm text-ink-muted">
              {data.indicador.nome} — {data.unidade.toLowerCase()}, {data.inicio} a {data.fim}.
            </p>
            <Grafico option={option} descricao={descreverComparacao(data.series, data.unidade)} altura={400} />
            <p className="mt-3 text-sm leading-relaxed">{descreverComparacao(data.series, data.unidade)}</p>
            <TabelaSeries
              legenda={`Comparação de ${data.indicador.nome.toLowerCase()} entre ${data.series.map((s) => s.nome).join(", ")}`}
              unidade={data.unidade}
              anos={data.anos}
              series={data.series}
            />
          </>
        )}
      </div>
      <NotaMetodologica meta={data?.meta} />
    </section>
  );
}
