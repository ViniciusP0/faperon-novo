"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { FUNCIONARIOS } from "@/content/sistema/funcionarios";
import { gravarSessao } from "@/lib/sistema/armazenamento";

/** Protótipo: no lugar de e-mail e senha, a pessoa escolhe um funcionário fictício. */
export function EscolhaFuncionario() {
  const router = useRouter();

  function entrar(id: string) {
    gravarSessao(id);
    router.push("/sistema");
  }

  return (
    <ul aria-label="Funcionários do protótipo" className="grid gap-2">
      {FUNCIONARIOS.map((f) => (
        <li key={f.id}>
          <button
            type="button"
            onClick={() => entrar(f.id)}
            aria-label={`Entrar como ${f.nome}`}
            className="vidro-claro flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left transition duration-150 ease-out"
          >
            <span>
              <span className="block font-medium text-ink">{f.nome}</span>
              <span className="block text-sm text-ink-muted">{f.area}</span>
            </span>
            {(f.gestorFrota || f.gestorEspacos) && <Badge>Gestor da frota e dos espaços</Badge>}
          </button>
        </li>
      ))}
    </ul>
  );
}
