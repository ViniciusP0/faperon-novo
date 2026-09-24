"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, FileDown, Link2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { buttonVariants, Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api, relatorioUrl } from "@/lib/api";
import { ABAS, parseFiltros, recorteParams, serializeFiltros, type Aba, type Filtros } from "@/lib/filters";
import { cn } from "@/lib/utils";
import { Analise } from "./analise";
import { Comparacao } from "./comparacao";
import { NotaMetodologica, Vazio } from "./comuns";
import { FiltrosPainel } from "./filtros";
import { Ranking } from "./ranking";
import { Serie } from "./serie";

const ROTULO_ABA: Record<Aba, string> = {
  ranking: "Ranking",
  serie: "Série histórica",
  comparacao: "Comparação",
  analise: "Análise estratégica",
};

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

  const paramsPdf = recorteParams(filtros);
  if (filtros.municipio) paramsPdf.set("municipio", filtros.municipio);
  if (filtros.aba === "comparacao" && filtros.modo === "municipios" && filtros.municipios.length >= 2) {
    paramsPdf.set("municipios", filtros.municipios.join(","));
  }

  return (
    <>
      <section aria-labelledby="painel-titulo" className="bg-gradient-to-br from-brand-dark to-brand text-white">
        <div className="container py-10 md:py-14">
          <h1 id="painel-titulo" className="text-3xl font-bold md:text-4xl">
            Painel Agro Analítico RO
          </h1>
          <p className="mt-2 max-w-2xl text-white/90">
            Lavouras e rebanhos dos 52 municípios de Rondônia, com dados oficiais do IBGE. Todos os filtros ficam no endereço da página:
            copie o link para compartilhar a consulta.
          </p>
        </div>
      </section>

      <div className="container py-8">
        <Card className="p-5">
          <FiltrosPainel
            filtros={filtros}
            segmento={segmento}
            produtos={produtos}
            indicadores={indicadores}
            anos={metaQ.data?.anos}
            carregandoProdutos={produtosQ.isPending}
            onChange={navegar}
          />
          {produtosQ.isError && (
            <p role="alert" className="mt-3 text-sm text-danger">
              Não foi possível carregar o catálogo de produtos.{" "}
              <button type="button" className="underline" onClick={() => produtosQ.refetch()}>
                Tentar novamente
              </button>
            </p>
          )}
        </Card>

        {!pronto ? (
          <div className="mt-8">
            <Vazio>
              {filtros.produto
                ? "Carregando os indicadores do produto…"
                : "Escolha um segmento e um produto para ver o ranking, a série histórica, a comparação e a análise."}
            </Vazio>
            <NotaMetodologica meta={null} />
          </div>
        ) : (
          <div className="mt-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Abas aba={filtros.aba} onChange={(aba) => navegar({ aba })} />
              <div className="flex flex-wrap gap-2">
                <CopiarLink />
                <a
                  href={relatorioUrl(paramsPdf.toString())}
                  className={cn(buttonVariants({ variant: "primary", size: "md" }))}
                  download
                >
                  <FileDown aria-hidden="true" className="h-4 w-4" />
                  Gerar PDF
                </a>
              </div>
            </div>

            <div
              role="tabpanel"
              id={`painel-${filtros.aba}`}
              aria-labelledby={`aba-${filtros.aba}`}
              tabIndex={0}
              className="mt-6"
            >
              {filtros.aba === "ranking" && <Ranking filtros={filtros} />}
              {filtros.aba === "serie" && (
                <Serie filtros={filtros} municipios={municipios} onMunicipio={(municipio) => navegar({ municipio })} />
              )}
              {filtros.aba === "comparacao" && (
                <Comparacao filtros={filtros} municipios={municipios} produtos={produtos} onChange={navegar} />
              )}
              {filtros.aba === "analise" && <Analise filtros={filtros} />}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function Abas({ aba, onChange }: { aba: Aba; onChange: (aba: Aba) => void }) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const aoTeclar = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    let destino: number | null = null;
    if (e.key === "ArrowRight") destino = (i + 1) % ABAS.length;
    if (e.key === "ArrowLeft") destino = (i - 1 + ABAS.length) % ABAS.length;
    if (e.key === "Home") destino = 0;
    if (e.key === "End") destino = ABAS.length - 1;
    if (destino === null) return;
    e.preventDefault();
    const nova = ABAS[destino]!;
    onChange(nova);
    refs.current[nova]?.focus();
  };

  return (
    <div role="tablist" aria-label="Visualizações do painel" className="flex flex-wrap gap-1 rounded-xl bg-surface-alt p-1">
      {ABAS.map((a, i) => (
        <button
          key={a}
          ref={(el) => {
            refs.current[a] = el;
          }}
          role="tab"
          type="button"
          id={`aba-${a}`}
          aria-selected={aba === a}
          aria-controls={`painel-${a}`}
          tabIndex={aba === a ? 0 : -1}
          onClick={() => onChange(a)}
          onKeyDown={(e) => aoTeclar(e, i)}
          className={cn(
            "rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
            aba === a ? "bg-brand text-white shadow-sm" : "text-ink hover:bg-brand-soft",
          )}
        >
          {ROTULO_ABA[a]}
        </button>
      ))}
    </div>
  );
}

function CopiarLink() {
  const [copiado, setCopiado] = useState(false);
  return (
    <>
      <Button
        variant="outline"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(window.location.href);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2500);
          } catch {
            window.prompt("Copie o link da consulta:", window.location.href);
          }
        }}
      >
        {copiado ? <Check aria-hidden="true" className="h-4 w-4" /> : <Link2 aria-hidden="true" className="h-4 w-4" />}
        Copiar link
      </Button>
      <span role="status" className="sr-only">
        {copiado ? "Link copiado" : ""}
      </span>
    </>
  );
}
