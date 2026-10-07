"use client";

import { useCallback } from "react";
import { Bloco } from "./bloco";
import { useBlocoObservatorio, useFiltrosLembrados } from "./consultas";
import { GraficoObservatorio } from "./grafico-observatorio";
import { Seletor } from "./seletor";
import { GrupoTabela, TabelaDados } from "./tabela-dados";
import { opcoesAnos, useFiltrosBloco } from "./use-filtros-bloco";
import type { PanoramaResposta } from "@/lib/api-types";
import { formatBilhoesEixo, formatMilReais, formatNumero } from "@/lib/format";
import { optionAreaEmpilhada, optionTreemap } from "@/lib/observatorio-graficos";

const FORMATO_MIL_REAIS = { eixo: formatBilhoesEixo, valor: formatMilReais };

function Kpis({ d }: { d: PanoramaResposta }) {
  const kpis: [string, string][] = [
    ["Valor da produção", d.metricas.valor_total_real != null ? formatMilReais(d.metricas.valor_total_real) : "–"],
    ["Variação real no período", d.metricas.variacao_real_pct != null ? `${formatNumero(d.metricas.variacao_real_pct)}%` : "–"],
    ["Área colhida (ha)", d.metricas.area_colhida_ha != null ? formatNumero(d.metricas.area_colhida_ha) : "–"],
  ];
  return (
    <dl className="grid gap-3 sm:grid-cols-3">
      {kpis.map(([rotulo, valor]) => (
        <div key={rotulo} className="rounded-md bg-surface-alt p-4">
          <dt className="text-sm text-ink-muted">{rotulo}</dt>
          <dd className="text-2xl font-semibold">{valor}</dd>
        </div>
      ))}
    </dl>
  );
}

function Tabelas({ d }: { d: PanoramaResposta }) {
  const composicao = d.series.composicao ?? [];
  const evolucao = d.series.evolucao;
  const itens = evolucao?.itens ?? [];
  return (
    <div className="space-y-8">
      {composicao.length > 0 && (
        <GrupoTabela titulo="Composição do valor da produção">
          <TabelaDados legenda="Composição do valor da produção" colunas={[
            { chave: "nome", rotulo: "Item" }, { chave: "valor", rotulo: "Mil R$ (reais)", numerico: true }, { chave: "participacao", rotulo: "%", numerico: true },
          ]} linhas={composicao.map((i) => ({ nome: i.nome, valor: i.valor, participacao: i.participacao }))} />
        </GrupoTabela>
      )}
      {evolucao && evolucao.anos.length > 0 && (
        <GrupoTabela titulo="Evolução do valor da produção, ano a ano">
          <TabelaDados legenda="Evolução do valor da produção, ano a ano" colunas={[
            { chave: "ano", rotulo: "Ano" }, ...itens.map((i) => ({ chave: i.slug, rotulo: i.nome, numerico: true })),
          ]} linhas={evolucao.anos.map((ano, idx) => ({
            ano: String(ano), ...Object.fromEntries(itens.map((i) => [i.slug, i.valores[idx] ?? null])),
          }))} />
        </GrupoTabela>
      )}
    </div>
  );
}

function Conteudo({ d }: { d: PanoramaResposta }) {
  const composicao = d.series.composicao;
  const evolucao = d.series.evolucao;
  const treemap = useCallback((e: boolean) => optionTreemap(composicao ?? [], "Mil Reais", e, formatMilReais), [composicao]);
  const area = useCallback((e: boolean) => optionAreaEmpilhada(evolucao ?? { anos: [], itens: [] }, "R$ bilhões", e, FORMATO_MIL_REAIS), [evolucao]);
  return (
    <div className="space-y-8">
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
      <Seletor rotulo="Ano" valor={f.exibido("ano", String(v.ano ?? ""))} onChange={(x) => f.definir("ano", x)} opcoes={opcoesAnos(o.anos)} />
      <Seletor rotulo="Janela" valor={f.exibido("janela", String(v.janela))} onChange={(x) => f.definir("janela", x)}
        opcoes={o.janelas.map((j) => ({ valor: String(j), rotulo: `${j} anos` }))} />
    </>
  );
  return (
    <Bloco id="panorama" etiqueta="01 · Panorama" titulo="O tamanho e a composição do agro" consulta={consulta} filtros={filtros} onPadrao={f.padrao}
      linkPainel={() => "/painel?segmento=agricultura"}
      kpis={(d) => <Kpis d={d} />}
      tabela={(d) => <Tabelas d={d} />}>
      {(d) => <Conteudo d={d} />}
    </Bloco>
  );
}
