import Link from "next/link";
import type { ReactNode } from "react";

/** Link interno (mesma aba) para caminhos do próprio site; link externo (nova aba, avisado a leitores de tela) para o resto. */
export function LinkAuto({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  if (href.startsWith("/"))
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
      <span className="sr-only"> (abre em nova aba)</span>
    </a>
  );
}
