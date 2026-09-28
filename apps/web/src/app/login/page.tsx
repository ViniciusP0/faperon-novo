import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FormularioLogin } from "@/components/login/formulario-login";

export const metadata: Metadata = {
  title: "Acessar o sistema",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-surface-alt px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border-t-4 border-brand-light bg-white p-8 shadow-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image src="/marca-faperon.png" alt="" width={56} height={56} className="h-14 w-14" />
          <h1 className="mt-3 text-xl font-semibold text-ink">Acessar o sistema</h1>
          <p className="mt-1 text-sm text-ink-muted">Entre com seu e-mail e senha da FAPERON.</p>
        </div>

        <FormularioLogin />

        <p className="mt-6 text-center text-sm text-ink-muted">
          <Link href="/" className="font-medium text-brand hover:underline">
            Voltar ao Início
          </Link>
        </p>
      </div>
    </div>
  );
}
