"use client";

import { useCallback } from "react";
import { Bloco } from "./bloco";
import { useBlocoObservatorio } from "./consultas";
import { GraficoObservatorio } from "./grafico-observatorio";
import { Seletor } from "./seletor";
import { TabelaDados } from "./tabela-dados";
import { opcoesPeriodo, useFiltrosBloco } from "./use-filtros-bloco";
import type { CrescimentoResposta } from "@/lib/api-types";
import { optionBarrasHorizontais, optionDecomposicao, optionIndices, optionLinha } from "@/lib/observatorio-graficos";

function Conteudo({ d }: { d: CrescimentoResposta }) {
  const { indices, perda, valor_por_hectare: vph } = d.series;
  const { parte_area_pct: pa, parte_rendimento_pct: pr } = d.metricas;
  const decomposicao = useCallback((e: boolean) => optionDecomposicao(pa ?? 0, pr ?? 0, e), [pa, pr]);
  const indicesOpt = useCallback((e: boolean) => optionIndices(indices ?? { anos: [], area: [], rendimento: [], producao: [] }, e), [indices]);
  const perdaOpt = useCallback((e: boolean) => optionLinha(perda ?? [], "Perda de lavoura", "%", e), [perda]);
  const vphOpt = useCallback((e: boolean) => optionBarrasHorizontais((vph ?? []).slice(0, 10), "R$/ha", e), [vph]);
  return (
    <div className="space-y-8">
      {pa != null && pr != null && <GraficoObservatorio option={decomposicao} descricao={d.texto.manchete} altura={140} />}
      {(indices?.anos?.length ?? 0) > 0 && (
        <GraficoObservatorio option={indicesOpt} descricao="Área colhida, rendimento e produção em índice, início do período igual a 100" />
      )}
      <div className="grid gap-8 lg:grid-cols-2">
        {(perda?.length ?? 0) > 0 && <GraficoObservatorio option={perdaOpt} descricao="Perda de lavoura ano a ano" altura={260} />}
        {(vph?.length ?? 0) > 0 && <GraficoObservatorio option={vphOpt} descricao="Valor por hectare das culturas no ano final" altura={320} />}
      </div>
    </div>
  );
}

export function BlocoCrescimento() {
  const f = useFiltrosBloco("crescimento");
  const consulta = useBlocoObservatorio("crescimento", f.qs);
  const v = consulta.data?.filtros.valores;
  const o = consulta.data?.filtros.opcoes;
  const periodo = o && v ? opcoesPeriodo(o.anos, v.inicio, v.fim) : null;
  const filtros = v && o && periodo && (
    <>
      <Seletor rotulo="Cultura" valor={v.cultura ?? ""} onChange={(x) => f.definir("cultura", x)}
        opcoes={o.culturas.map((c) => ({ valor: c.slug, rotulo: c.nome }))} />
      <Seletor rotulo="De" valor={String(v.inicio ?? "")} onChange={(x) => f.definir("inicio", x)} opcoes={periodo.de} />
      <Seletor rotulo="Até" valor={String(v.fim ?? "")} onChange={(x) => f.definir("fim", x)} opcoes={periodo.ate} />
    </>
  );
  return (
    <Bloco id="crescimento" etiqueta="02 · Crescimento" titulo="Por que a produção cresceu" consulta={consulta} filtros={filtros} onPadrao={f.padrao}
      linkPainel={(d) => {
        const { cultura, inicio, fim } = d.filtros.valores;
        if (!cultura || inicio == null || fim == null) return null;
        return `/painel?produto=${cultura}&indicador=quantidade-produzida&inicio=${inicio}&fim=${fim}`;
      }}
      tabela={(d) => {
        const ind = d.series.indices;
        const perdaPorAno = new Map((d.series.perda ?? []).map((p) => [p.ano, p.valor]));
        return (
          <TabelaDados legenda="Índices de área, rendimento e produção (início = 100) e perda de lavoura" colunas={[
            { chave: "ano", rotulo: "Ano" }, { chave: "area", rotulo: "Área", numerico: true }, { chave: "rendimento", rotulo: "Rendimento", numerico: true },
            { chave: "producao", rotulo: "Produção", numerico: true }, { chave: "perda", rotulo: "Perda (%)", numerico: true },
          ]} linhas={(ind?.anos ?? []).map((ano, i) => ({
            ano: String(ano), area: ind?.area?.[i] ?? null, rendimento: ind?.rendimento?.[i] ?? null,
            producao: ind?.producao?.[i] ?? null, perda: perdaPorAno.get(ano) ?? null,
          }))} />
        );
      }}>
      {(d) => <Conteudo d={d} />}
    </Bloco>
  );
}
