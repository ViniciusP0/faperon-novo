"use client";

import { useCallback } from "react";
import { Bloco } from "./bloco";
import { useBlocoObservatorio, useFiltrosLembrados } from "./consultas";
import { GraficoObservatorio } from "./grafico-observatorio";
import { Seletor } from "./seletor";
import { GrupoTabela, TabelaDados } from "./tabela-dados";
import { anoValido, opcoesPeriodo, useFiltrosBloco } from "./use-filtros-bloco";
import type { PecuariaResposta } from "@/lib/api-types";
import { formatMilLitros, formatMilReais, formatNumero } from "@/lib/format";
import { optionBarrasHorizontais, optionLinha, optionTreemap } from "@/lib/observatorio-graficos";

function TabelaPolos({ d }: { d: PecuariaResposta }) {
  return (
    <TabelaDados legenda="Polos de leite" colunas={[{ chave: "nome", rotulo: "Município" }, { chave: "volume", rotulo: "Mil litros", numerico: true }, { chave: "produtividade", rotulo: "L/vaca/ano", numerico: true }]}
      linhas={(d.series.leite_polos ?? []).map((p) => ({ nome: p.nome, volume: p.volume, produtividade: p.produtividade }))} />
  );
}

function Kpis({ d }: { d: PecuariaResposta }) {
  const leite = d.metricas.leite;
  if (!leite) return null;
  return (
    <div className="rounded-md border border-line p-5">
      <h3 className="text-lg font-semibold">Leite</h3>
      <dl className="mt-3 grid gap-3 sm:grid-cols-3">
        <div><dt className="text-sm text-ink-muted">Volume de leite</dt><dd className="text-xl font-semibold">{leite.volume_mil_litros != null ? formatMilLitros(leite.volume_mil_litros) : "–"}</dd></div>
        <div><dt className="text-sm text-ink-muted">Litros por vaca/ano</dt><dd className="text-xl font-semibold">{leite.produtividade_l_vaca != null ? formatNumero(leite.produtividade_l_vaca) : "–"}</dd></div>
        <div><dt className="text-sm text-ink-muted">Valor do leite (preços reais)</dt><dd className="text-xl font-semibold">{leite.valor_real != null ? formatMilReais(leite.valor_real) : "–"}</dd></div>
      </dl>
    </div>
  );
}

function Conteudo({ d }: { d: PecuariaResposta }) {
  const { efetivo, municipios, composicao, leite_polos: polos } = d.series;
  const efetivoOpt = useCallback((e: boolean) => optionLinha(efetivo ?? [], "Efetivo", "Cabeças", e), [efetivo]);
  const munOpt = useCallback((e: boolean) => optionBarrasHorizontais((municipios ?? []).slice(0, 10), "Cabeças", e), [municipios]);
  const compOpt = useCallback((e: boolean) => optionTreemap(composicao ?? [], "Cabeças", e), [composicao]);
  return (
    <div className="space-y-8">
      {(efetivo?.length ?? 0) > 0 && <GraficoObservatorio option={efetivoOpt} descricao={d.texto.manchete} altura={300} />}
      <div className="grid gap-8 lg:grid-cols-2">
        {(municipios?.length ?? 0) > 0 && <GraficoObservatorio option={munOpt} descricao="Dez maiores municípios em efetivo" altura={320} />}
        {(composicao?.length ?? 0) > 0 && <GraficoObservatorio option={compOpt} descricao="Composição dos rebanhos no ano final" altura={320} />}
      </div>
      {(polos?.length ?? 0) > 0 && <GrupoTabela titulo="Principais polos de leite"><TabelaPolos d={d} /></GrupoTabela>}
    </div>
  );
}

function Tabelas({ d }: { d: PecuariaResposta }) {
  const efetivo = d.series.efetivo ?? [];
  const composicao = d.series.composicao ?? [];
  const municipios = d.series.municipios ?? [];
  return (
    <div className="space-y-8">
      {efetivo.length > 0 && (
        <GrupoTabela titulo="Efetivo ao longo dos anos">
          <TabelaDados legenda="Efetivo ao longo dos anos" colunas={[{ chave: "ano", rotulo: "Ano" }, { chave: "valor", rotulo: "Cabeças", numerico: true }]}
            linhas={efetivo.map((p) => ({ ano: String(p.ano), valor: p.valor }))} />
        </GrupoTabela>
      )}
      {municipios.length > 0 && (
        <GrupoTabela titulo="Efetivo por município">
          <TabelaDados legenda="Efetivo por município no ano final" colunas={[{ chave: "nome", rotulo: "Município" }, { chave: "valor", rotulo: "Cabeças", numerico: true }]}
            linhas={municipios.map((m) => ({ nome: m.nome, valor: m.valor }))} />
        </GrupoTabela>
      )}
      {composicao.length > 0 && (
        <GrupoTabela titulo="Composição dos rebanhos">
          <TabelaDados legenda="Composição dos rebanhos no ano final" colunas={[
            { chave: "nome", rotulo: "Rebanho" }, { chave: "valor", rotulo: "Cabeças", numerico: true }, { chave: "participacao", rotulo: "%", numerico: true },
          ]} linhas={composicao.map((i) => ({ nome: i.nome, valor: i.valor, participacao: i.participacao }))} />
        </GrupoTabela>
      )}
      {(d.series.leite_polos?.length ?? 0) > 0 && <GrupoTabela titulo="Principais polos de leite"><TabelaPolos d={d} /></GrupoTabela>}
    </div>
  );
}

export function BlocoPecuaria() {
  const f = useFiltrosBloco("pecuaria");
  const consulta = useBlocoObservatorio("pecuaria", f.qs);
  const lembrados = useFiltrosLembrados(consulta.data?.filtros);
  const v = lembrados?.valores;
  const o = lembrados?.opcoes;
  const inicio = o && v ? anoValido(f.exibido("inicio", String(v.inicio ?? "")), o.anos, v.inicio) : null;
  const fim = o && v ? anoValido(f.exibido("fim", String(v.fim ?? "")), o.anos, v.fim) : null;
  const periodo = o ? opcoesPeriodo(o.anos, inicio, fim) : null;
  const filtros = v && o && periodo && (
    <>
      <Seletor rotulo="Rebanho" valor={f.exibido("rebanho", v.rebanho)} onChange={(x) => f.definir("rebanho", x)} opcoes={o.rebanhos.map((r) => ({ valor: r.slug, rotulo: r.nome }))} />
      <Seletor rotulo="De" valor={f.exibido("inicio", String(v.inicio ?? ""))} onChange={(x) => f.definir("inicio", x)} opcoes={periodo.de} />
      <Seletor rotulo="Até" valor={f.exibido("fim", String(v.fim ?? ""))} onChange={(x) => f.definir("fim", x)} opcoes={periodo.ate} />
    </>
  );
  return (
    <Bloco id="pecuaria" etiqueta="04 · Pecuária" titulo="Rebanhos e leite" consulta={consulta} filtros={filtros} onPadrao={f.padrao}
      linkPainel={(d) => {
        const { rebanho, inicio, fim } = d.filtros.valores;
        if (!rebanho || inicio == null || fim == null) return null;
        return `/painel?produto=${rebanho}&indicador=efetivo&inicio=${inicio}&fim=${fim}`;
      }}
      kpis={(d) => <Kpis d={d} />}
      tabela={(d) => <Tabelas d={d} />}>
      {(d) => <Conteudo d={d} />}
    </Bloco>
  );
}
