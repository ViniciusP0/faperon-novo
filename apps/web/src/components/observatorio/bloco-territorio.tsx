"use client";

import { useCallback, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Bloco } from "./bloco";
import { useBlocoObservatorio, useFiltrosLembrados } from "./consultas";
import { GraficoObservatorio } from "./grafico-observatorio";
import { MapaMunicipios } from "./mapa-municipios";
import { Seletor } from "./seletor";
import { GrupoTabela, TabelaDados } from "./tabela-dados";
import { opcoesAnos, useFiltrosBloco } from "./use-filtros-bloco";
import type { TerritorioResposta } from "@/lib/api-types";
import { formatNumero } from "@/lib/format";
import { optionBarrasHorizontais } from "@/lib/observatorio-graficos";

const STATUS = { ok: "", sigiloso: "sigiloso", sem_dado: "sem dado" } as const;

function Kpis({ d }: { d: TerritorioResposta }) {
  if (d.filtros.valores.metrica === "dominante") return null;
  return (
    <dl className="grid max-w-md grid-cols-2 gap-3 text-sm">
      <div className="rounded-md bg-surface-alt p-3"><dt className="text-ink-muted">5 maiores</dt><dd className="text-xl font-semibold">{d.metricas.top5_pct != null ? `${formatNumero(d.metricas.top5_pct)}%` : "–"}</dd></div>
      <div className="rounded-md bg-surface-alt p-3"><dt className="text-ink-muted">HHI</dt><dd className="text-xl font-semibold">{d.metricas.hhi != null ? formatNumero(d.metricas.hhi) : "–"}</dd></div>
    </dl>
  );
}

/** Quantos municípios dependentes aparecem antes do "Ver mais"; a lista real pode ter dezenas. */
export const LIMITE_DEPENDENTES = 6;

function Dependentes({ d }: { d: TerritorioResposta }) {
  const [expandida, setExpandida] = useState(false);
  const idLista = useId();
  const dependentes = d.series.dependentes ?? [];
  if (dependentes.length === 0) return null;
  const restantes = dependentes.length - LIMITE_DEPENDENTES;
  const visiveis = expandida ? dependentes : dependentes.slice(0, LIMITE_DEPENDENTES);
  return (
    <div>
      <h3 className="text-sm font-semibold">Municípios dependentes de uma cultura</h3>
      <ul id={idLista} aria-label="Municípios dependentes de uma cultura" className="mt-2 space-y-1 text-sm text-ink-muted">
        {visiveis.map((x) => (
          <li key={`${x.codigo_ibge}-${x.cultura}`}>{x.nome}: {x.cultura} ({x.participacao != null ? `${formatNumero(x.participacao)}%` : "–"})</li>
        ))}
      </ul>
      {restantes > 0 && (
        <Button variant="ghost" size="sm" className="mt-1 px-2" aria-expanded={expandida} aria-controls={idLista} onClick={() => setExpandida((v) => !v)}>
          {expandida ? "Ver menos" : `Ver mais (${restantes})`}
        </Button>
      )}
    </div>
  );
}

function Conteudo({ d }: { d: TerritorioResposta }) {
  const micro = d.series.microrregioes;
  const unidade = d.metricas.unidade ?? "";
  const microOpt = useCallback((e: boolean) => optionBarrasHorizontais(micro ?? [], unidade, e), [micro, unidade]);
  return (
    <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
      <MapaMunicipios municipios={d.series.municipios ?? []} unidade={unidade} categorias={d.series.categorias ?? []}
        descricao={`Mapa dos municípios de Rondônia: ${d.texto.manchete}`} />
      <div className="space-y-6">
        {(micro?.length ?? 0) > 0 && <GraficoObservatorio option={microOpt} descricao="Total por microrregião" altura={280} />}
        <Dependentes key={`${d.filtros.valores.metrica}|${d.filtros.valores.cultura}|${d.filtros.valores.ano}`} d={d} />
      </div>
    </div>
  );
}

function Tabelas({ d }: { d: TerritorioResposta }) {
  const dominante = d.filtros.valores.metrica === "dominante";
  const micro = d.series.microrregioes ?? [];
  const dependentes = d.series.dependentes ?? [];
  return (
    <div className="space-y-8">
      <GrupoTabela titulo="Valores por município (mapa)">
        <TabelaDados legenda="Valores por município" colunas={[
          { chave: "nome", rotulo: "Município" }, { chave: "microrregiao", rotulo: "Microrregião" },
          { chave: "valor", rotulo: d.metricas.unidade || "Cultura dominante", numerico: !dominante },
        ]} linhas={(d.series.municipios ?? []).map((m) => ({
          nome: m.nome, microrregiao: m.microrregiao,
          valor: dominante
            ? (d.series.categorias?.find((c) => c.slug === m.categoria)?.nome ?? (STATUS[m.status] || "sem dado"))
            : m.status === "ok" ? m.valor : STATUS[m.status],
        }))} />
      </GrupoTabela>
      {micro.length > 0 && (
        <GrupoTabela titulo="Total por microrregião">
          <TabelaDados legenda="Total por microrregião" colunas={[
            { chave: "nome", rotulo: "Microrregião" }, { chave: "valor", rotulo: d.metricas.unidade || "Total", numerico: true },
          ]} linhas={micro.map((m) => ({ nome: m.nome, valor: m.valor }))} />
        </GrupoTabela>
      )}
      {dependentes.length > 0 && (
        <GrupoTabela titulo="Municípios dependentes de uma cultura">
          <TabelaDados legenda="Municípios dependentes de uma cultura" colunas={[
            { chave: "nome", rotulo: "Município" }, { chave: "cultura", rotulo: "Cultura" }, { chave: "participacao", rotulo: "% do valor agrícola", numerico: true },
          ]} linhas={dependentes.map((x) => ({ nome: x.nome, cultura: x.cultura, participacao: x.participacao }))} />
        </GrupoTabela>
      )}
    </div>
  );
}

export function BlocoTerritorio() {
  const f = useFiltrosBloco("territorio");
  const consulta = useBlocoObservatorio("territorio", f.qs);
  const lembrados = useFiltrosLembrados(consulta.data?.filtros);
  const v = lembrados?.valores;
  const o = lembrados?.opcoes;
  const metrica = v ? f.exibido("metrica", v.metrica) : "";
  const filtros = v && o && (
    <>
      <Seletor rotulo="Métrica" valor={metrica} onChange={(x) => f.definir("metrica", x, x === "valor" || x === "area" ? [] : ["cultura"])}
        opcoes={o.metricas.map((m) => ({ valor: m.slug, rotulo: m.nome }))} />
      {(metrica === "valor" || metrica === "area") && (
        <Seletor rotulo="Cultura" valor={f.exibido("cultura", v.cultura ?? "")} onChange={(x) => f.definir("cultura", x || null)}
          opcoes={[{ valor: "", rotulo: "Todas as culturas" }, ...o.culturas.map((c) => ({ valor: c.slug, rotulo: c.nome }))]} />
      )}
      <Seletor rotulo="Ano" valor={f.exibido("ano", String(v.ano ?? ""))} onChange={(x) => f.definir("ano", x)} opcoes={opcoesAnos(o.anos)} />
    </>
  );
  return (
    <Bloco id="territorio" etiqueta="03 · Território" titulo="Onde a produção acontece" consulta={consulta} filtros={filtros} onPadrao={f.padrao}
      linkPainel={(d) => {
        const { metrica, cultura, ano } = d.filtros.valores;
        if (ano == null) return null;
        const periodo = `inicio=${ano - 9}&fim=${ano}`;
        if (metrica === "rebanho") return `/painel?produto=bovino&indicador=efetivo&${periodo}`;
        if ((metrica === "valor" || metrica === "area") && cultura) {
          return `/painel?produto=${cultura}&indicador=${metrica === "area" ? "area-colhida" : "valor-da-producao"}&${periodo}`;
        }
        return null;
      }}
      kpis={(d) => <Kpis d={d} />}
      tabela={(d) => <Tabelas d={d} />}>
      {(d) => <Conteudo d={d} />}
    </Bloco>
  );
}
