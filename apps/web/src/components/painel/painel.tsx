"use client";

import { useIsFetching, useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { SECOES } from "@/content/painel";
import { api } from "@/lib/api";
import { parseFiltros, recorteParams, serializeFiltros, type Aba, type Filtros } from "@/lib/filters";
import { Analise } from "./analise";
import { Comparacao } from "./comparacao";
import { Button } from "@/components/ui/button";
import { ErroConsulta, NotaMetodologica, Vazio } from "./comuns";
import { BarraRecorte } from "./barra-recorte";
import { useRanking } from "./consultas";
import { Numeros } from "./numeros";
import { SeletorProduto } from "./seletor-produto";
import { Ranking } from "./ranking";
import { Serie } from "./serie";

export function Painel() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filtros = useMemo(() => parseFiltros(new URLSearchParams(searchParams.toString())), [searchParams]);

  // A ref guarda o filtro mais recente, inclusive alterações ainda não refletidas na URL.
  const ultimo = useRef(filtros);
  useEffect(() => {
    ultimo.current = filtros;
  }, [filtros]);

  const navegar = useCallback(
    (patch: Partial<Filtros>) => {
      const proximo = { ...ultimo.current, ...patch };
      ultimo.current = proximo;
      const qs = serializeFiltros(proximo).toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  const produtosQ = useQuery({ queryKey: ["produtos"], queryFn: () => api.produtos() });
  const municipiosQ = useQuery({ queryKey: ["municipios"], queryFn: () => api.municipios() });
  const metaQ = useQuery({ queryKey: ["meta"], queryFn: () => api.meta() });
  const indicadoresQ = useQuery({
    queryKey: ["indicadores", filtros.produto],
    queryFn: () => api.indicadores(filtros.produto),
    enabled: Boolean(filtros.produto),
  });

  const produtos = useMemo(() => produtosQ.data ?? [], [produtosQ.data]);
  const municipios = useMemo(() => municipiosQ.data ?? [], [municipiosQ.data]);
  const indicadores = useMemo(() => indicadoresQ.data ?? [], [indicadoresQ.data]);

  const produtoAtual = produtos.find((p) => p.slug === filtros.produto);
  const segmento = filtros.segmento || produtoAtual?.segmento || "agricultura";

  // Indicador inválido ou ausente vira o primeiro disponível do produto.
  useEffect(() => {
    if (!filtros.produto || indicadoresQ.isPending || indicadoresQ.isError || indicadores.length === 0) return;
    if (!indicadores.some((i) => i.slug === filtros.indicador)) navegar({ indicador: indicadores[0]!.slug });
  }, [filtros.produto, filtros.indicador, indicadores, indicadoresQ.isPending, indicadoresQ.isError, navegar]);

  const indicadorValido = indicadores.some((i) => i.slug === filtros.indicador);
  const periodoAusente = filtros.inicio === null || filtros.fim === null;

  // Período ausente vira o padrão do servidor: os 10 últimos anos com dados do recorte.
  const padraoQ = useQuery({
    queryKey: ["periodo-padrao", filtros.produto, filtros.indicador],
    queryFn: () => api.ranking(`produto=${encodeURIComponent(filtros.produto)}&indicador=${encodeURIComponent(filtros.indicador)}`),
    enabled: Boolean(filtros.produto) && indicadorValido && periodoAusente,
    select: (r) => ({ inicio: r.inicio, fim: r.fim }),
  });
  useEffect(() => {
    if (!periodoAusente || !padraoQ.data) return;
    navegar({ inicio: filtros.inicio ?? padraoQ.data.inicio, fim: filtros.fim ?? padraoQ.data.fim });
  }, [periodoAusente, padraoQ.data, filtros.inicio, filtros.fim, navegar]);

  const pronto = Boolean(filtros.produto) && indicadorValido && filtros.inicio !== null && filtros.fim !== null;

  // Produto inexistente ou recorte sem dados: mostra o erro e uma saída, em vez de "carregando" para sempre.
  const erroDoRecorte = indicadoresQ.isError
    ? { erro: indicadoresQ.error, refazer: () => indicadoresQ.refetch() }
    : padraoQ.isError
      ? { erro: padraoQ.error, refazer: () => padraoQ.refetch() }
      : null;
  const voltarAoPadrao = useCallback(() => {
    ultimo.current = parseFiltros(new URLSearchParams());
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  const paramsPdf = recorteParams(filtros);
  if (filtros.municipio) paramsPdf.set("municipio", filtros.municipio);
  if (filtros.aba === "comparacao" && filtros.modo === "municipios" && filtros.municipios.length >= 2) {
    paramsPdf.set("municipios", filtros.municipios.join(","));
  }

  // Link antigo com `aba`: ao abrir o recorte, rola até a seção equivalente (uma vez).
  // Espera as consultas terminarem: com o conteúdo acima ainda carregando, a seção se deslocaria depois da rolagem.
  const rolou = useRef(false);
  const consultasAbertas = useIsFetching();
  useEffect(() => {
    if (!pronto || consultasAbertas > 0 || rolou.current) return;
    rolou.current = true;
    const alvo = SECOES.find((sec) => sec.aba === filtros.aba && sec.id !== "numeros" && sec.id !== "ranking");
    if (alvo) requestAnimationFrame(() => document.getElementById(alvo.id)?.scrollIntoView());
  }, [pronto, consultasAbertas, filtros.aba]);

  return (
    <>
      <section aria-labelledby="painel-titulo" className="bg-gradient-to-br from-brand-dark to-brand text-white">
        <div className="container py-10 md:py-14">
          <h1 id="painel-titulo" className="text-3xl font-bold md:text-5xl">
            Painel Agro Analítico RO
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-white/90">
            Lavouras e rebanhos dos 52 municípios de Rondônia, com dados oficiais do IBGE. Escolha um produto e veja quem lidera, como evoluiu e
            como se compara.
          </p>
          <div className="mt-8">
            <SeletorProduto filtros={filtros} segmento={segmento} produtos={produtos} carregandoProdutos={produtosQ.isPending} onChange={navegar} />
            {produtosQ.isError && (
              <p role="alert" className="mt-3 rounded-lg bg-white px-3 py-2 text-sm text-danger-ink">
                Não foi possível carregar o catálogo de produtos.{" "}
                <button type="button" className="underline" onClick={() => produtosQ.refetch()}>
                  Tentar novamente
                </button>
              </p>
            )}
          </div>
        </div>
      </section>

      {!pronto ? (
        <div className="container py-8">
          {erroDoRecorte ? (
            <div className="space-y-4">
              <ErroConsulta erro={erroDoRecorte.erro} onRetry={() => erroDoRecorte.refazer()} />
              <Button variant="outline" size="sm" onClick={voltarAoPadrao}>
                Voltar ao padrão
              </Button>
            </div>
          ) : (
            <Vazio>
              {filtros.produto
                ? "Carregando os indicadores do produto…"
                : "Escolha um segmento e um produto para ver os números, o ranking, a evolução, a comparação e a análise."}
            </Vazio>
          )}
          <NotaMetodologica meta={null} />
        </div>
      ) : (
        <>
          <div className="z-30 border-b border-line bg-card/95 backdrop-blur lg:sticky lg:top-[var(--altura-header,4.5rem)]">
            <BarraRecorte
              filtros={filtros}
              indicadores={indicadores}
              municipios={municipios}
              anos={metaQ.data?.anos}
              paramsPdf={paramsPdf.toString()}
              onChange={navegar}
            />
            <NavSecoes onIr={(aba) => navegar({ aba })} />
          </div>

          <Numeros filtros={filtros} />
          <Ranking filtros={filtros} />
          <Serie filtros={filtros} />
          <Comparacao filtros={filtros} municipios={municipios} produtos={produtos} onChange={navegar} />
          <Analise filtros={filtros} />

          <div className="container pb-12">
            <NotaDoRecorte filtros={filtros} />
          </div>
        </>
      )}
    </>
  );
}

function NotaDoRecorte({ filtros }: { filtros: Filtros }) {
  const { data } = useRanking(filtros);
  return <NotaMetodologica meta={data?.meta} />;
}

function NavSecoes({ onIr }: { onIr: (aba: Aba) => void }) {
  return (
    <nav aria-label="Seções do painel" className="container pb-2">
      <ul className="flex flex-wrap gap-1">
        {SECOES.map((sec) => (
          <li key={sec.id}>
            <a
              href={`#${sec.id}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(sec.id)?.scrollIntoView();
                onIr(sec.aba);
              }}
              className="inline-block rounded-lg px-3.5 py-2 text-sm font-medium text-ink hover:bg-brand-soft"
            >
              {sec.rotulo}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
