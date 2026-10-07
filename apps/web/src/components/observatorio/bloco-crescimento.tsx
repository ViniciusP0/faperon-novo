"use client";

import { useCallback } from "react";
import { Bloco } from "./bloco";
import { useBlocoObservatorio, useFiltrosLembrados } from "./consultas";
import { GraficoObservatorio } from "./grafico-observatorio";
import { Seletor } from "./seletor";
import { GrupoTabela, TabelaDados } from "./tabela-dados";
import { anoValido, opcoesPeriodo, useFiltrosBloco } from "./use-filtros-bloco";
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

function Tabelas({ d }: { d: CrescimentoResposta }) {
  const ind = d.series.indices;
  const { parte_area_pct: pa, parte_rendimento_pct: pr, variacao_producao_pct: vp } = d.metricas;
  const perdaPorAno = new Map((d.series.perda ?? []).map((p) => [p.ano, p.valor]));
  const vph = d.series.valor_por_hectare ?? [];
  return (
    <div className="space-y-8">
      {pa != null && pr != null && (
        <GrupoTabela titulo="Decomposição da variação da produção">
          <TabelaDados legenda="Decomposição da variação da produção" colunas={[
            { chave: "componente", rotulo: "Componente" }, { chave: "valor", rotulo: "%", numerico: true },
          ]} linhas={[
            { componente: "Variação da produção", valor: vp ?? null },
            { componente: "Expansão de área", valor: pa },
            { componente: "Ganho de produtividade", valor: pr },
          ]} />
        </GrupoTabela>
      )}
      {(ind?.anos?.length ?? 0) > 0 && (
        <GrupoTabela titulo="Índices e perda de lavoura">
          <TabelaDados legenda="Índices de área, rendimento e produção (início = 100) e perda de lavoura" colunas={[
            { chave: "ano", rotulo: "Ano" }, { chave: "area", rotulo: "Área", numerico: true }, { chave: "rendimento", rotulo: "Rendimento", numerico: true },
            { chave: "producao", rotulo: "Produção", numerico: true }, { chave: "perda", rotulo: "Perda (%)", numerico: true },
          ]} linhas={(ind?.anos ?? []).map((ano, i) => ({
            ano: String(ano), area: ind?.area?.[i] ?? null, rendimento: ind?.rendimento?.[i] ?? null,
            producao: ind?.producao?.[i] ?? null, perda: perdaPorAno.get(ano) ?? null,
          }))} />
        </GrupoTabela>
      )}
      {vph.length > 0 && (
        <GrupoTabela titulo="Valor por hectare das culturas no ano final">
          <TabelaDados legenda="Valor por hectare das culturas no ano final" colunas={[
            { chave: "nome", rotulo: "Cultura" }, { chave: "valor", rotulo: "R$/ha", numerico: true },
          ]} linhas={vph.map((i) => ({ nome: i.nome, valor: i.valor }))} />
        </GrupoTabela>
      )}
    </div>
  );
}

export function BlocoCrescimento() {
  const f = useFiltrosBloco("crescimento");
  const consulta = useBlocoObservatorio("crescimento", f.qs);
  const lembrados = useFiltrosLembrados(consulta.data?.filtros);
  const v = lembrados?.valores;
  const o = lembrados?.opcoes;
  const inicio = o && v ? anoValido(f.exibido("inicio", String(v.inicio ?? "")), o.anos, v.inicio) : null;
  const fim = o && v ? anoValido(f.exibido("fim", String(v.fim ?? "")), o.anos, v.fim) : null;
  const periodo = o ? opcoesPeriodo(o.anos, inicio, fim) : null;
  const filtros = v && o && periodo && (
    <>
      <Seletor rotulo="Cultura" valor={f.exibido("cultura", v.cultura ?? "")} onChange={(x) => f.definir("cultura", x, ["inicio", "fim"])}
        opcoes={o.culturas.map((c) => ({ valor: c.slug, rotulo: c.nome }))} />
      <Seletor rotulo="De" valor={f.exibido("inicio", String(v.inicio ?? ""))} onChange={(x) => f.definir("inicio", x)} opcoes={periodo.de} />
      <Seletor rotulo="Até" valor={f.exibido("fim", String(v.fim ?? ""))} onChange={(x) => f.definir("fim", x)} opcoes={periodo.ate} />
    </>
  );
  return (
    <Bloco id="crescimento" etiqueta="02 · Crescimento" titulo="Por que a produção cresceu" consulta={consulta} filtros={filtros} onPadrao={f.padrao}
      linkPainel={(d) => {
        const { cultura, inicio, fim } = d.filtros.valores;
        if (!cultura || inicio == null || fim == null) return null;
        return `/painel?produto=${cultura}&indicador=quantidade-produzida&inicio=${inicio}&fim=${fim}`;
      }}
      tabela={(d) => <Tabelas d={d} />}>
      {(d) => <Conteudo d={d} />}
    </Bloco>
  );
}
