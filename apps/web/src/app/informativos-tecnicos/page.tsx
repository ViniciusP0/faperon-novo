import type { Metadata } from "next";
import { ArquivoInformativos } from "@/components/informativos/arquivo-informativos";
import { BoletinsEmLivros, UltimasEdicoes } from "@/components/informativos/livros-em-destaque";
import { CtaDuplo } from "@/components/site/cta-duplo";
import { FaixaNumeros } from "@/components/site/faixa-numeros";
import { Destaque, HeroPagina } from "@/components/site/hero-pagina";
import { buttonVariants } from "@/components/ui/button";
import { INFORMATIVOS as inf } from "@/content/informativos";
import { livroDoBoletim, livroDoInformativo, maisRecente } from "@/lib/informativos";
import { CNA_COMMODITIES_URL } from "@/lib/site";
import { cn } from "@/lib/utils";
import { Revelar } from "@/components/site/revelar";

export const metadata: Metadata = {
  title: inf.seo.titulo,
  description: inf.seo.descricao,
  alternates: { canonical: "/informativos-tecnicos" },
};

export default function InformativosPage() {
  const [corte, leite] = inf.categorias;
  const ultimas = inf.categorias.map((c) => livroDoInformativo(maisRecente(c.itens), c));
  const boletins = inf.boletins.map((b) => livroDoBoletim(b, inf.categorias));
  return (
    <>
      <HeroPagina
        id="informativos-titulo"
        atual="Informativos Técnicos"
        imagem={{ src: "/hero/campo-rondonia.jpg", posicao: "50% 68%" }}
        titulo={
          <>
            Informativos mensais do <Destaque>agro de Rondônia</Destaque>, em um só lugar.
          </>
        }
      >
        <p>
          Acompanhamento mensal do setor agropecuário de Rondônia: bovinocultura de corte e de leite, além dos boletins técnicos. Escolha a edição, veja a
          capa e baixe o PDF.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href="#arquivo" className={cn(buttonVariants({ size: "lg" }), "bg-brand-lime text-brand-dark hover:bg-[#9bdc60]")}>
            Abrir a estante
          </a>
          <a href="#boletins" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "border-white/85 text-white hover:bg-white/15")}>
            Boletins técnicos
          </a>
        </div>
      </HeroPagina>

      <FaixaNumeros
        rotulo="Publicações"
        itens={[
          { rotulo: corte!.titulo, valor: String(corte!.itens.length), detalhe: "informativos mensais" },
          { rotulo: leite!.titulo, valor: String(leite!.itens.length), detalhe: "informativos mensais" },
          { rotulo: "Boletins técnicos", valor: String(inf.boletins.length), detalhe: "edição 2024.2" },
        ]}
      />

      <Revelar as="section" aria-labelledby="ultimas-titulo" className="container pt-16">
        <h2 id="ultimas-titulo" className="text-[1.75rem] font-semibold tracking-tight">
          Últimas edições
        </h2>
        <p className="mt-1 max-w-[60ch] text-ink-muted">As publicações mais recentes de cada categoria, em destaque.</p>
        <UltimasEdicoes edicoes={ultimas} />
      </Revelar>

      <Revelar as="section" id="arquivo" aria-labelledby="arquivo-titulo" className="container scroll-mt-24 pt-16">
        <h2 id="arquivo-titulo" className="text-[1.75rem] font-semibold tracking-tight">
          Estante de informativos
        </h2>
        <p className="mb-5 mt-1 max-w-[60ch] text-ink-muted">Todo o arquivo mensal. Escolha a categoria, o ano e a forma de visualizar.</p>
        <ArquivoInformativos categorias={inf.categorias} />
      </Revelar>

      <div className="mt-16 border-y border-line bg-gradient-to-br from-warm to-surface-alt">
        <Revelar as="section" id="boletins" aria-labelledby="boletins-titulo" className="container scroll-mt-24 py-16">
          <h2 id="boletins-titulo" className="text-[1.75rem] font-semibold tracking-tight">
            Boletins técnicos
          </h2>
          <p className="mt-1 max-w-[60ch] text-ink-muted">Edições com mais profundidade que o informativo mensal.</p>
          <BoletinsEmLivros boletins={boletins} />
        </Revelar>
      </div>

      <CtaDuplo
        principal={{
          titulo: "Central de Inteligência Agropecuária",
          texto: "Ranking dos municípios, série histórica, comparação, análise pronta e relatório em PDF, tudo em um painel.",
          rotulo: "Conheça a Central de Inteligência",
          href: "/central-de-inteligencia",
        }}
        secundaria={{
          titulo: "Preços das commodities",
          texto: "A CNA atualiza todos os dias as cotações das principais bolsas do mundo e das praças brasileiras.",
          rotulo: "Confira os preços na CNA",
          href: CNA_COMMODITIES_URL,
          externo: true,
        }}
      />
    </>
  );
}
