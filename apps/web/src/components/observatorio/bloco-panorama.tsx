"use client";

import { useCallback } from "react";
import { Bloco } from "./bloco";
import { useBlocoObservatorio, useFiltrosLembrados } from "./consultas";
import { GraficoObservatorio } from "./grafico-observatorio";
import { Seletor } from "./seletor";
import { TabelaDados } from "./tabela-dados";
import { opcoesAnos, useFiltrosBloco } from "./use-filtros-bloco";
import type { PanoramaResposta } from "@/lib/api-types";
import { formatCompacto, formatNumero } from "@/lib/format";
import { optionAreaEmpilhada, optionTreemap } from "@/lib/observatorio-graficos";

function Conteudo({ d }: { d: PanoramaResposta }) {
  const composicao = d.series.composicao;
  const evolucao = d.series.evolucao;
  const treemap = useCallback((e: boolean) => optionTreemap(composicao ?? [], "Mil Reais", e), [composicao]);
  const area = useCallback((e: boolean) => optionAreaEmpilhada(evolucao ?? { anos: [], itens: [] }, "Mil R$", e), [evolucao]);
  const kpis: [string, string][] = [
    ["Valor da produção (mil R$)", d.metricas.valor_total_real != null ? formatCompacto(d.metricas.valor_total_real) : "–"],
    ["Variação real no período", d.metricas.variacao_real_pct != null ? `${formatNumero(d.metricas.variacao_real_pct)}%` : "–"],
    ["Área colhida (ha)", d.metricas.area_colhida_ha != null ? formatCompacto(d.metricas.area_colhida_ha) : "–"],
  ];
  return (
    <div className="space-y-8">
      <dl className="grid gap-3 sm:grid-cols-3">
        {kpis.map(([rotulo, valor]) => (
          <div key={rotulo} className="rounded-md bg-surface-alt p-4">
            <dt className="text-sm text-ink-muted">{rotulo}</dt>
            <dd className="text-2xl font-semibold">{valor}</dd>
          </div>
        ))}
      </dl>
      {(composicao?.length ?? 0) > 0 && (
        <GraficoObservatorio option={treemap} descricao={`Composição do valor da produção: ${d.texto.manchete}`} altura={340} />
      )}
      {(evolucao?.anos?.length ?? 0) > 0 && (
        <GraficoObservatorio option={area} descricao="Evolução da composição do valor da produção, ano a ano" />
      )}
    </div>
  );
}

export function BlocoPanorama() {
  const f = useFiltrosBloco("panorama");
  const consulta = useBlocoObservatorio("panorama", f.qs);
  const lembrados = useFiltrosLembrados(consulta.data?.filtros);
  const v = lembrados?.valores;
  const o = lembrados?.opcoes;
  const filtros = v && o && (
    <>
      <Seletor rotulo="Ano" valor={String(v.ano ?? "")} onChange={(x) => f.definir("ano", x)} opcoes={opcoesAnos(o.anos)} />
      <Seletor rotulo="Janela" valor={String(v.janela)} onChange={(x) => f.definir("janela", x)}
        opcoes={o.janelas.map((j) => ({ valor: String(j), rotulo: `${j} anos` }))} />
    </>
  );
  return (
    <Bloco id="panorama" etiqueta="01 · Panorama" titulo="O tamanho e a composição do agro" consulta={consulta} filtros={filtros} onPadrao={f.padrao}
      linkPainel={() => "/painel?segmento=agricultura"}
      tabela={(d) => (
        <TabelaDados legenda="Composição do valor da produção" colunas={[
          { chave: "nome", rotulo: "Item" }, { chave: "valor", rotulo: "Mil R$ (reais)", numerico: true }, { chave: "participacao", rotulo: "%", numerico: true },
        ]} linhas={(d.series.composicao ?? []).map((i) => ({ nome: i.nome, valor: i.valor, participacao: i.participacao }))} />
      )}>
      {(d) => <Conteudo d={d} />}
    </Bloco>
  );
}
