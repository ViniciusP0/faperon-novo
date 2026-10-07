"use client";

import { useCallback } from "react";
import { Bloco } from "./bloco";
import { useBlocoObservatorio, useFiltrosLembrados } from "./consultas";
import { GraficoObservatorio } from "./grafico-observatorio";
import { Seletor } from "./seletor";
import { TabelaDados } from "./tabela-dados";
import { opcoesPeriodo, useFiltrosBloco } from "./use-filtros-bloco";
import type { PecuariaResposta } from "@/lib/api-types";
import { formatCompacto, formatNumero } from "@/lib/format";
import { optionBarrasHorizontais, optionLinha, optionTreemap } from "@/lib/observatorio-graficos";

function TabelaPolos({ d }: { d: PecuariaResposta }) {
  return (
    <TabelaDados legenda="Polos de leite" colunas={[{ chave: "nome", rotulo: "Município" }, { chave: "volume", rotulo: "Mil litros", numerico: true }, { chave: "produtividade", rotulo: "L/vaca/ano", numerico: true }]}
      linhas={(d.series.leite_polos ?? []).map((p) => ({ nome: p.nome, volume: p.volume, produtividade: p.produtividade }))} />
  );
}

function Conteudo({ d }: { d: PecuariaResposta }) {
  const { efetivo, municipios, composicao, leite_polos: polos } = d.series;
  const efetivoOpt = useCallback((e: boolean) => optionLinha(efetivo ?? [], "Efetivo", "Cabeças", e), [efetivo]);
  const munOpt = useCallback((e: boolean) => optionBarrasHorizontais((municipios ?? []).slice(0, 10), "Cabeças", e), [municipios]);
  const compOpt = useCallback((e: boolean) => optionTreemap(composicao ?? [], "Cabeças", e), [composicao]);
  const leite = d.metricas.leite;
  return (
    <div className="space-y-8">
      {(efetivo?.length ?? 0) > 0 && <GraficoObservatorio option={efetivoOpt} descricao={d.texto.manchete} altura={300} />}
      <div className="grid gap-8 lg:grid-cols-2">
        {(municipios?.length ?? 0) > 0 && <GraficoObservatorio option={munOpt} descricao="Dez maiores municípios em efetivo" altura={320} />}
        {(composicao?.length ?? 0) > 0 && <GraficoObservatorio option={compOpt} descricao="Composição dos rebanhos no ano final" altura={320} />}
      </div>
      {leite && (
        <div className="rounded-md border border-line p-5">
          <h3 className="text-lg font-semibold">Leite</h3>
          <dl className="mt-3 grid gap-3 sm:grid-cols-3">
            <div><dt className="text-sm text-ink-muted">Volume (mil litros)</dt><dd className="text-xl font-semibold">{leite.volume_mil_litros != null ? formatCompacto(leite.volume_mil_litros) : "–"}</dd></div>
            <div><dt className="text-sm text-ink-muted">Litros por vaca/ano</dt><dd className="text-xl font-semibold">{leite.produtividade_l_vaca != null ? formatNumero(leite.produtividade_l_vaca) : "–"}</dd></div>
            <div><dt className="text-sm text-ink-muted">Valor (mil R$, reais)</dt><dd className="text-xl font-semibold">{leite.valor_real != null ? formatCompacto(leite.valor_real) : "–"}</dd></div>
          </dl>
          {(polos?.length ?? 0) > 0 && <div className="mt-4"><TabelaPolos d={d} /></div>}
        </div>
      )}
    </div>
  );
}

export function BlocoPecuaria() {
  const f = useFiltrosBloco("pecuaria");
  const consulta = useBlocoObservatorio("pecuaria", f.qs);
  const lembrados = useFiltrosLembrados(consulta.data?.filtros);
  const v = lembrados?.valores;
  const o = lembrados?.opcoes;
  const periodo = o && v ? opcoesPeriodo(o.anos, v.inicio, v.fim) : null;
  const filtros = v && o && periodo && (
    <>
      <Seletor rotulo="Rebanho" valor={v.rebanho} onChange={(x) => f.definir("rebanho", x)} opcoes={o.rebanhos.map((r) => ({ valor: r.slug, rotulo: r.nome }))} />
      <Seletor rotulo="De" valor={String(v.inicio ?? "")} onChange={(x) => f.definir("inicio", x)} opcoes={periodo.de} />
      <Seletor rotulo="Até" valor={String(v.fim ?? "")} onChange={(x) => f.definir("fim", x)} opcoes={periodo.ate} />
    </>
  );
  return (
    <Bloco id="pecuaria" etiqueta="04 · Pecuária" titulo="Rebanhos e leite" consulta={consulta} filtros={filtros} onPadrao={f.padrao}
      linkPainel={(d) => {
        const { rebanho, inicio, fim } = d.filtros.valores;
        if (!rebanho || inicio == null || fim == null) return null;
        return `/painel?produto=${rebanho}&indicador=efetivo&inicio=${inicio}&fim=${fim}`;
      }}
      tabela={(d) => (
        <div className="space-y-6">
          <TabelaDados legenda="Efetivo por município no ano final" colunas={[{ chave: "nome", rotulo: "Município" }, { chave: "valor", rotulo: "Cabeças", numerico: true }]}
            linhas={(d.series.municipios ?? []).map((m) => ({ nome: m.nome, valor: m.valor }))} />
          {(d.series.leite_polos?.length ?? 0) > 0 && <TabelaPolos d={d} />}
        </div>
      )}>
      {(d) => <Conteudo d={d} />}
    </Bloco>
  );
}
