import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AcessoSistema } from "@/components/login/acesso-sistema";
import { OndasRodape } from "@/components/login/ondas-rodape";

export const metadata: Metadata = {
  title: "Acessar o sistema",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  // -mb-20 anula a margem de topo do rodapé do site: as ondas encostam nele
  return (
    <div className="area-sistema relative -mb-20 flex min-h-[calc(100vh-72px)] items-center justify-center overflow-hidden px-4 pb-32 pt-12 sm:pb-40 lg:pb-48">
      {/* cartão em vidro sobre o fundo de folhas do site */}
      <div className="vidro-cartao relative z-10 w-full max-w-md rounded-2xl p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image src="/marca-faperon.png" alt="" width={56} height={56} className="h-14 w-14" />
          <h1 className="mt-3 text-xl font-semibold text-ink">Acessar o sistema</h1>
          <p className="mt-1 text-sm text-ink-muted">Entre para conhecer a agenda, a frota, os espaços, a prestação de contas e os relatórios.</p>
        </div>

        <AcessoSistema />

        <p className="mt-6 text-center text-sm text-ink-muted">
          <Link href="/" className="font-medium text-brand-fg hover:underline">
            Voltar ao Início
          </Link>
        </p>
      </div>
      <OndasRodape />
    </div>
  );
}
