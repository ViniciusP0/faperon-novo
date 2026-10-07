"use client";

import { useCallback } from "react";
import { Bloco } from "./bloco";
import { useBlocoObservatorio, useFiltrosLembrados } from "./consultas";
import { GraficoObservatorio } from "./grafico-observatorio";
import { MapaMunicipios } from "./mapa-municipios";
import { Seletor } from "./seletor";
import { TabelaDados } from "./tabela-dados";
import { opcoesAnos, useFiltrosBloco } from "./use-filtros-bloco";
import type { TerritorioResposta } from "@/lib/api-types";
import { formatNumero } from "@/lib/format";
import { optionBarrasHorizontais } from "@/lib/observatorio-graficos";

const STATUS = { ok: "", sigiloso: "sigiloso", sem_dado: "sem dado" } as const;

function Conteudo({ d }: { d: TerritorioResposta }) {
  const micro = d.series.microrregioes;
  const unidade = d.metricas.unidade ?? "";
  const microOpt = useCallback((e: boolean) => optionBarrasHorizontais(micro ?? [], unidade, e), [micro, unidade]);
  const dependentes = d.series.dependentes ?? [];
  return (
    <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
      <MapaMunicipios municipios={d.series.municipios ?? []} unidade={unidade} categorias={d.series.categorias ?? []}
        descricao={`Mapa dos municípios de Rondônia: ${d.texto.manchete}`} />
      <div className="space-y-6">
        {d.filtros.valores.metrica !== "dominante" && (
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-md bg-surface-alt p-3"><dt className="text-ink-muted">5 maiores</dt><dd className="text-xl font-semibold">{d.metricas.top5_pct != null ? `${formatNumero(d.metricas.top5_pct)}%` : "–"}</dd></div>
            <div className="rounded-md bg-surface-alt p-3"><dt className="text-ink-muted">HHI</dt><dd className="text-xl font-semibold">{d.metricas.hhi != null ? formatNumero(d.metricas.hhi) : "–"}</dd></div>
          </dl>
        )}
        {(micro?.length ?? 0) > 0 && <GraficoObservatorio option={microOpt} descricao="Total por microrregião" altura={280} />}
        {dependentes.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold">Municípios dependentes de uma cultura</h3>
            <ul className="mt-2 space-y-1 text-sm text-ink-muted">
              {dependentes.map((x) => (
                <li key={`${x.codigo_ibge}-${x.cultura}`}>{x.nome}: {x.cultura} ({x.participacao != null ? `${formatNumero(x.participacao)}%` : "–"})</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export function BlocoTerritorio() {
  const f = useFiltrosBloco("territorio");
  const consulta = useBlocoObservatorio("territorio", f.qs);
  const lembrados = useFiltrosLembrados(consulta.data?.filtros);
  const v = lembrados?.valores;
  const o = lembrados?.opcoes;
  const filtros = v && o && (
    <>
      <Seletor rotulo="Métrica" valor={v.metrica} onChange={(x) => f.definir("metrica", x, x === "valor" || x === "area" ? [] : ["cultura"])}
        opcoes={o.metricas.map((m) => ({ valor: m.slug, rotulo: m.nome }))} />
      {(v.metrica === "valor" || v.metrica === "area") && (
        <Seletor rotulo="Cultura" valor={v.cultura ?? ""} onChange={(x) => f.definir("cultura", x || null)}
          opcoes={[{ valor: "", rotulo: "Todas as culturas" }, ...o.culturas.map((c) => ({ valor: c.slug, rotulo: c.nome }))]} />
      )}
      <Seletor rotulo="Ano" valor={String(v.ano ?? "")} onChange={(x) => f.definir("ano", x)} opcoes={opcoesAnos(o.anos)} />
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
      tabela={(d) => {
        const dominante = d.filtros.valores.metrica === "dominante";
        return (
          <TabelaDados legenda="Valores por município" colunas={[
            { chave: "nome", rotulo: "Município" }, { chave: "microrregiao", rotulo: "Microrregião" },
            { chave: "valor", rotulo: d.metricas.unidade || "Cultura dominante", numerico: !dominante },
          ]} linhas={(d.series.municipios ?? []).map((m) => ({
            nome: m.nome, microrregiao: m.microrregiao,
            valor: dominante
              ? (d.series.categorias?.find((c) => c.slug === m.categoria)?.nome ?? (STATUS[m.status] || "sem dado"))
              : m.status === "ok" ? m.valor : STATUS[m.status],
          }))} />
        );
      }}>
      {(d) => <Conteudo d={d} />}
    </Bloco>
  );
}
