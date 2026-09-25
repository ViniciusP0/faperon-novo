import { Facebook, Instagram, Linkedin, MessageCircle, Youtube, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import { FormularioContato } from "@/components/contato/formulario-contato";
import { CtaDuplo } from "@/components/site/cta-duplo";
import { Destaque, HeroPagina } from "@/components/site/hero-pagina";
import { buttonVariants } from "@/components/ui/button";
import { CONTATO as c, type RedeSocial } from "@/content/contato";
import { ROTAS, WIX_PAGINAS } from "@/lib/site";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: c.seo.titulo,
  description: c.seo.descricao,
  alternates: { canonical: "/fale-conosco" },
};

const ICONES_REDE: Record<Exclude<RedeSocial, "whatsapp">, LucideIcon> = {
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin,
  youtube: Youtube,
};

const rotuloCanal = "text-[0.75rem] font-semibold uppercase tracking-wider text-ink-muted";

export default function FaleConoscoPage() {
  const redes = c.redes.filter((r) => r.rede !== "whatsapp");
  return (
    <>
      <HeroPagina
        id="contato-titulo"
        atual="Fale Conosco"
        titulo={
          <>
            Fale com a FAPERON pelos <Destaque>canais oficiais</Destaque>.
          </>
        }
      >
        <p>Envie sua mensagem pelo formulário, ligue ou chame no WhatsApp. Nossa sede fica em Porto Velho.</p>
      </HeroPagina>

      <div className="border-t-2 border-ink">
        <div className="container grid gap-10 pt-14 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
          <section aria-labelledby="form-contato-titulo">
            <h2 id="form-contato-titulo" className="text-[1.6rem] font-semibold tracking-tight">
              Envie sua mensagem
            </h2>
            <div className="mt-5">
              <FormularioContato numeroWhatsApp={c.whatsapp.numero} campos={c.campos} />
            </div>
          </section>

          <aside
            aria-labelledby="canais-titulo"
            className="self-start rounded-md border-t-4 border-brand-light bg-surface-alt p-7"
          >
            <h2 id="canais-titulo" className="text-xl font-semibold">
              Outros canais
            </h2>

            <div className="mt-2 divide-y divide-line">
              <div className="grid gap-1 py-4">
                <h3 className={rotuloCanal}>Telefone</h3>
                <a href={c.telefone.href} className="font-medium hover:text-brand hover:underline">
                  {c.telefone.texto}
                </a>
              </div>

              <div className="grid gap-1 py-4">
                <h3 className={rotuloCanal}>WhatsApp</h3>
                <p className="font-medium">{c.whatsapp.texto}</p>
                <a
                  href={`https://wa.me/${c.whatsapp.numero}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(buttonVariants({ size: "lg" }), "mt-2 bg-brand-lime text-[#003329] hover:bg-[#9bdc60]")}
                >
                  <MessageCircle aria-hidden="true" className="h-4 w-4" />
                  Chamar no WhatsApp
                  <span className="sr-only"> (abre em nova aba)</span>
                </a>
              </div>

              <div className="grid gap-1 py-4">
                <h3 className={rotuloCanal}>Endereço</h3>
                <address className="font-medium not-italic">
                  {c.endereco.linhas.map((linha) => (
                    <span key={linha} className="block">
                      {linha}
                    </span>
                  ))}
                </address>
              </div>

              <div className="grid gap-2 py-4">
                <h3 className={rotuloCanal}>Redes sociais</h3>
                <ul className="flex flex-wrap gap-2">
                  {redes.map((rede) => {
                    const Icone = ICONES_REDE[rede.rede as keyof typeof ICONES_REDE];
                    return (
                      <li key={rede.rede}>
                        <a
                          href={rede.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-1.5 text-sm font-medium text-brand hover:bg-brand hover:text-white"
                        >
                          <Icone aria-hidden="true" className="h-4 w-4" />
                          {rede.rotulo}
                          <span className="sr-only"> (abre em nova aba)</span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </aside>
        </div>

        <div className="container mt-14">
          <div className="grid items-center gap-6 rounded-md bg-[#e4edf3] px-8 py-6 md:grid-cols-[1fr_auto]">
            <div>
              <h2 className="text-lg font-semibold">Como chegar</h2>
              <p className="text-ink-muted">{c.endereco.linhas.join(", ")}</p>
            </div>
            <a
              href={c.mapaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "border-2 border-steel text-steel hover:bg-steel hover:text-white",
              )}
            >
              Abrir no Google Maps
              <span className="sr-only"> (abre em nova aba)</span>
            </a>
          </div>
        </div>
      </div>

      <CtaDuplo
        principal={{
          titulo: "Conheça a FAPERON",
          texto: "Missão, visão, valores e a diretoria da gestão 2024-2027.",
          rotulo: "Ir para Sobre",
          href: ROTAS.sobre,
        }}
        secundaria={{
          titulo: "Transparência",
          texto: "Consulte a prestação de contas da entidade no Portal da Transparência.",
          rotulo: "Portal da Transparência",
          href: WIX_PAGINAS.transparencia,
          externo: true,
        }}
      />
    </>
  );
}
