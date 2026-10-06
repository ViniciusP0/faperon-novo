import type { Metadata } from "next";
import { NoticiaChamada } from "@/components/inicio/noticia-chamada";
import { FiltroCategorias } from "@/components/noticias/filtro-categorias";
import { Paginacao } from "@/components/noticias/paginacao";
import { Destaque, HeroPagina } from "@/components/site/hero-pagina";
import { Revelar } from "@/components/site/revelar";
import { NOTICIAS } from "@/content/noticias";
import { categoriasDisponiveis, listarNoticias, type ParametrosLista } from "@/lib/noticias-lista";

export const metadata: Metadata = {
  title: "Notícias",
  description: "Todas as notícias da FAPERON e do Sistema FAPERON/SENAR: representação, capacitação e ações pelo produtor rural de Rondônia.",
  alternates: { canonical: "/noticias" },
};

const contagem = (total: number) => `${total} ${total === 1 ? "notícia" : "notícias"}`;

export default async function NoticiasPage({ searchParams }: { searchParams: Promise<ParametrosLista> }) {
  const resultado = listarNoticias(NOTICIAS, await searchParams);
  const { itens, total, pagina, totalPaginas, categoria } = resultado;
  const opcoes = categoriasDisponiveis(NOTICIAS);

  return (
    <>
      <HeroPagina
        id="noticias-titulo"
        atual="Notícias"
        titulo={
          <>
            Todas as <Destaque>notícias</Destaque>
          </>
        }
      >
        <p>
          Acompanhe o que a FAPERON e o Sistema FAPERON/SENAR fazem pelo produtor rural de Rondônia. O texto completo de cada notícia abre no site atual.
        </p>
      </HeroPagina>

      <section aria-label="Lista de notícias" className="container pb-4 pt-2">
        <FiltroCategorias opcoes={opcoes} ativa={categoria?.slug ?? null} total={NOTICIAS.length} />

        <p role="status" aria-live="polite" className="mt-5 text-sm text-ink-muted">
          {contagem(total)}
          {categoria ? ` em ${categoria.nome}` : ""}
          {totalPaginas > 1 ? `, página ${pagina} de ${totalPaginas}` : ""}
        </p>

        {itens.length === 0 ? (
          <p className="mt-8 rounded-xl border border-line bg-surface-alt p-6 text-ink-muted">Nenhuma notícia publicada por enquanto.</p>
        ) : (
          <ul className="mt-6 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {itens.map((n, i) => (
              <Revelar as="li" indice={i} key={n.slug}>
                <NoticiaChamada noticia={n} mostrarCategorias />
              </Revelar>
            ))}
          </ul>
        )}

        <Paginacao pagina={pagina} totalPaginas={totalPaginas} categoria={categoria?.slug ?? null} />
      </section>
    </>
  );
}
