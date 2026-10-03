import { Download, FileText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CtaDuplo } from "@/components/site/cta-duplo";
import { FaixaNumeros } from "@/components/site/faixa-numeros";
import { Destaque, HeroPagina } from "@/components/site/hero-pagina";
import { LinkAuto } from "@/components/sistema/link-auto";
import { IndiceSecoes } from "@/components/sobre/indice-secoes";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { type Cargo, SOBRE as s } from "@/content/sobre";
import { formatData } from "@/lib/format";
import { ROTAS, WIX_PAGINAS } from "@/lib/site";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: s.seo.titulo,
  description: s.seo.descricao,
  alternates: { canonical: "/sobre" },
};

const presidente = s.diretoria.grupos[0]!.membros[0]!;
const iniciais = presidente.nome
  .split(" ")
  .filter((p) => p[0] === p[0]?.toUpperCase())
  .map((p) => p[0])
  .slice(0, 2)
  .join("");

/** Junta os grupos da mesma coluna e tira o presidente da lista (ele tem destaque próprio). */
function colunasDiretoria() {
  const colunas = new Map<string, Cargo[]>();
  for (const g of s.diretoria.grupos) {
    const membros = g.membros.filter((m) => m !== presidente);
    colunas.set(g.coluna, [...(colunas.get(g.coluna) ?? []), ...membros]);
  }
  return [...colunas].map(([titulo, membros]) => ({ titulo, membros }));
}

const tituloSecao = "text-[1.75rem] font-semibold tracking-tight";
const rotuloMvv = "text-[0.8rem] font-semibold uppercase tracking-wider text-brand-fg";

export default function SobrePage() {
  const numeros = s.quem_somos.numeros;
  return (
    <>
      <HeroPagina
        id="sobre-titulo"
        atual="Sobre"
        titulo={
          <>
            {s.destaque.antes} <Destaque>{s.destaque.forte}</Destaque> {s.destaque.depois}
          </>
        }
      >
        <p>{s.quem_somos.paragrafos[0]}</p>
        <Link href={ROTAS.faleConosco} className={cn(buttonVariants({ size: "lg" }), "mt-4")}>
          Fale com a FAPERON
        </Link>
      </HeroPagina>

      <FaixaNumeros
        rotulo="A FAPERON em números"
        itens={[
          { rotulo: "Fundação", valor: numeros[0]!.valor, detalhe: "mais de 40 anos de representação" },
          { rotulo: "Sindicatos rurais", valor: numeros[1]!.valor, detalhe: "filiados à federação" },
          { rotulo: "Municípios", valor: numeros[2]!.valor, detalhe: "com atuação em todo o estado" },
        ]}
      />

      <div className="container grid lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:gap-14">
        <IndiceSecoes secoes={s.secoes} />

        <div className="min-w-0">
          <section id="quem-somos" aria-labelledby="quem-somos-titulo" className="scroll-mt-32 pt-14 lg:pt-[4.5rem]">
            <h2 id="quem-somos-titulo" className={tituloSecao}>
              Quem somos
            </h2>
            <div className="prose-faperon mt-5 max-w-[64ch] text-ink">
              {s.quem_somos.paragrafos.map((p) => (
                <p key={p}>{p}</p>
              ))}
              <p className="font-semibold">Seus objetivos são:</p>
              <ul>
                {s.quem_somos.objetivos.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            </div>
          </section>

          <section id="missao-visao-valores" aria-labelledby="mvv-titulo" className="scroll-mt-32 pt-16">
            <h2 id="mvv-titulo" className={tituloSecao}>
              Missão, visão e valores
            </h2>
            <div className="mt-6 grid border-t-[3px] border-ink md:grid-cols-[1.2fr_1fr_1fr]">
              <article className="py-5 md:pr-7">
                <h3 className={rotuloMvv}>Missão</h3>
                <p className="mt-2.5 text-lg leading-snug">{s.missao}</p>
              </article>
              <article className="border-t border-line py-5 md:border-l md:border-t-0 md:px-7">
                <h3 className={rotuloMvv}>Visão</h3>
                <p className="mt-2.5 text-lg leading-snug">{s.visao}</p>
              </article>
              <article className="border-t border-line py-5 md:border-l md:border-t-0 md:pl-7">
                <h3 className={rotuloMvv}>Valores</h3>
                <ul className="mt-2.5">
                  {s.valores.map((v) => (
                    <li key={v} className="border-t border-line py-1.5 font-medium first:border-t-0">
                      {v}
                    </li>
                  ))}
                </ul>
              </article>
            </div>
          </section>

          <section id="diretoria" aria-labelledby="diretoria-titulo" className="scroll-mt-32 pt-16">
            <div className="flex flex-wrap items-center gap-3">
              <h2 id="diretoria-titulo" className={tituloSecao}>
                Diretoria
              </h2>
              <Badge>{s.diretoria.gestao}</Badge>
            </div>
            <div className="mt-6 flex items-center gap-6 rounded-md border-l-4 border-brand-light bg-surface-alt px-8 py-7">
              <div
                aria-hidden="true"
                className="grid h-[4.5rem] w-[4.5rem] shrink-0 place-items-center rounded-full bg-brand text-2xl font-semibold text-white"
              >
                {iniciais}
              </div>
              <div>
                <p className="text-sm font-medium text-ink-muted">{presidente.cargo}</p>
                <p className="mt-0.5 text-2xl font-semibold tracking-tight">{presidente.nome}</p>
              </div>
            </div>
            <div className="mt-8 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
              {colunasDiretoria().map((coluna) => (
                <div key={coluna.titulo}>
                  <h3 className="border-b-2 border-ink pb-2.5 text-base font-semibold">{coluna.titulo}</h3>
                  <dl>
                    {coluna.membros.map((m) => (
                      <div key={`${coluna.titulo}-${m.nome}`} className="border-b border-line py-2.5">
                        <dt className="text-sm text-ink-muted">{m.cargo}</dt>
                        <dd className="mt-0.5 font-medium">{m.nome}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          </section>

          <section id="estatuto" aria-labelledby="estatuto-titulo" className="scroll-mt-32 pt-16">
            <h2 id="estatuto-titulo" className={tituloSecao}>
              Estatuto
            </h2>
            <a
              href={s.estatuto.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${s.estatuto.titulo} (PDF, abre em nova aba)`}
              className="mt-6 grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-md border border-l-4 border-line border-l-steel px-6 py-5 hover:bg-steel-soft"
            >
              <span aria-hidden="true" className="grid h-14 w-11 place-items-center rounded bg-steel text-white">
                <FileText className="h-6 w-6" />
              </span>
              <span>
                <span className="block text-[1.05rem] font-semibold leading-snug">{s.estatuto.titulo}</span>
                <span className="block text-sm text-ink-muted">{s.estatuto.descricao}</span>
                <span className="block text-sm text-ink-muted">
                  Publicado em <time dateTime={s.estatuto.data}>{formatData(s.estatuto.data)}</time>
                </span>
              </span>
              <span
                aria-hidden="true"
                className={cn(buttonVariants({ variant: "outline" }), "hidden border-2 border-steel text-steel sm:inline-flex")}
              >
                <Download className="h-4 w-4" />
                Baixar PDF
              </span>
            </a>
            <p className="mt-3 text-sm text-ink-muted">
              Outros documentos de prestação de contas estão no{" "}
              <a
                href={WIX_PAGINAS.transparencia}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-brand-fg underline underline-offset-2"
              >
                Portal da Transparência
                <span className="sr-only"> (abre em nova aba)</span>
              </a>
              .
            </p>
          </section>

          <section id="sistema" aria-labelledby="sistema-titulo" className="scroll-mt-32 pt-16">
            <h2 id="sistema-titulo" className={tituloSecao}>
              Sistema FAPERON
            </h2>
            <ul className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {s.sistema.entidades.map((e) => (
                <li key={e.nome} className="flex">
                  <LinkAuto
                    href={e.url}
                    className="flex w-full flex-col gap-1.5 rounded-md border border-t-4 border-line border-t-brand-light p-5 hover:bg-surface-alt"
                  >
                    <span className="font-semibold">{e.nome}</span>
                    <span className="text-sm text-ink-muted">{e.descricao}</span>
                    <span className="mt-auto pt-2.5 text-sm font-semibold text-brand-fg">{e.acao} →</span>
                  </LinkAuto>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-5 rounded-md bg-steel-soft px-7 py-5">
              <div>
                <p className="text-lg font-semibold">{s.sistema.calendario.titulo}</p>
                <p className="mt-0.5 text-sm text-ink-muted">{s.sistema.calendario.descricao}</p>
              </div>
              <a
                href={s.sistema.calendario.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "border-2 border-steel text-steel hover:bg-steel hover:text-white",
                )}
              >
                <Download aria-hidden="true" className="h-4 w-4" />
                Baixar o calendário (PDF)
                <span className="sr-only"> (abre em nova aba)</span>
              </a>
            </div>
          </section>
        </div>
      </div>

      <CtaDuplo
        principal={{
          titulo: "Transparência em tudo o que fazemos",
          texto: "Consulte a prestação de contas da entidade no Portal da Transparência.",
          rotulo: "Abrir o Portal da Transparência",
          href: WIX_PAGINAS.transparencia,
          externo: true,
        }}
        secundaria={{
          titulo: "Quer falar com a FAPERON?",
          texto: "Envie sua mensagem ou ligue: nossa equipe responde pelos canais oficiais.",
          rotulo: "Ir para Fale Conosco",
          href: ROTAS.faleConosco,
        }}
      />
    </>
  );
}
