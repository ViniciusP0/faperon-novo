import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="container py-24 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-brand-fg">Erro 404</p>
      <h1 className="mt-2 text-3xl font-bold">Página não encontrada</h1>
      <p className="mt-2 text-ink-muted">O endereço não existe neste protótipo. As demais páginas do site continuam no site atual da FAPERON.</p>
      <Link href="/" className={cn(buttonVariants({ size: "lg" }), "mt-6")}>
        Voltar ao Início
      </Link>
    </div>
  );
}
