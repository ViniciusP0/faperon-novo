"use client";

import { Mail, MapPin, Phone, Search } from "lucide-react";
import { useId, useMemo, useState } from "react";
import type { Sindicato } from "@/content/sindicatos";
import { cn } from "@/lib/utils";

/** Sem acento e em minúsculas, para a busca achar "Ji-Parana" ao digitar "ji-paraná". */
const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const TILE = "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-fg";

const telefoneHref = (t: string) => `tel:+55${t.replace(/\D/g, "")}`;

/** Busca por município ou presidente sobre o cadastro dos sindicatos rurais. */
export function ListaSindicatos({ sindicatos }: { sindicatos: Sindicato[] }) {
  const id = useId();
  const [busca, setBusca] = useState("");

  const visiveis = useMemo(() => {
    const q = normalizar(busca.trim());
    if (!q) return sindicatos;
    return sindicatos.filter((s) => normalizar(`${s.nome} ${s.presidente}`).includes(q));
  }, [busca, sindicatos]);

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold">
        Buscar por município ou presidente
      </label>
      <div className="relative mt-2 max-w-xl">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" />
        <input
          id={id}
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Ex.: Vilhena"
          className="h-12 w-full rounded-xl border border-field bg-surface pl-11 pr-3 text-ink placeholder:text-ink-muted"
        />
      </div>
      <p role="status" aria-live="polite" className="mt-3 text-sm text-ink-muted">
        {visiveis.length === sindicatos.length ? `${sindicatos.length} sindicatos listados` : `${visiveis.length} de ${sindicatos.length} sindicatos`}
      </p>

      {visiveis.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-line p-8 text-center text-ink-muted">
          Nenhum sindicato encontrado para “{busca}”. Confira a grafia ou apague a busca.
        </p>
      ) : (
        <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visiveis.map((s) => (
            <li key={s.nome} className="flex">
              <article className="revela group flex w-full flex-col overflow-hidden rounded-2xl border-2 border-line bg-card shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-brand-fg hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                <div aria-hidden="true" className="h-2 bg-gradient-to-r from-brand via-brand-light to-brand-lime" />
                <header className="flex items-center gap-3.5 bg-brand-soft px-5 py-4">
                  <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white ring-2 ring-brand-light/60">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/sistema/simbolo.png" alt="" className="h-7 w-auto" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold leading-snug text-brand-strong">{s.nome}</h3>
                    <p className="mt-0.5 text-sm text-ink-muted">
                      <span className="font-semibold text-ink">Presidente:</span> {s.presidente}
                    </p>
                  </div>
                </header>
                <dl className="grid flex-1 content-start gap-3.5 p-5 text-sm">
                  {s.endereco && (
                    <div className="flex items-start gap-3">
                      <dt className="sr-only">Endereço</dt>
                      <span aria-hidden="true" className={TILE}>
                        <MapPin className="h-4 w-4" />
                      </span>
                      <dd className="pt-1 leading-snug text-ink-muted">{s.endereco}</dd>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <dt className="sr-only">E-mail</dt>
                    <span aria-hidden="true" className={TILE}>
                      <Mail className="h-4 w-4" />
                    </span>
                    <dd className="min-w-0 break-words pt-1">
                      <a href={`mailto:${s.email}`} className="font-medium text-brand-fg underline-offset-2 hover:underline">
                        {s.email}
                      </a>
                    </dd>
                  </div>
                </dl>
                <div className="flex flex-wrap gap-2 border-t-2 border-line bg-surface-alt px-5 py-4">
                  <span className="sr-only">Telefone</span>
                  {s.telefones.map((t, i) => (
                    <a
                      key={t}
                      href={telefoneHref(t)}
                      className={cn(
                        "inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors",
                        i === 0
                          ? "bg-brand text-white hover:bg-brand-dark dark:bg-brand-lime dark:text-brand-dark dark:hover:bg-[#a3df6a]"
                          : "border-2 border-brand-fg text-brand-fg hover:bg-brand-soft",
                      )}
                    >
                      <Phone aria-hidden="true" className="h-4 w-4" />
                      {t}
                    </a>
                  ))}
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
