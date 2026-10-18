"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { historicoDeExemplo } from "@/content/sistema/exemplo";
import { FUNCIONARIOS } from "@/content/sistema/funcionarios";
import { gravar, gravarSessao, ler } from "@/lib/sistema/armazenamento";
import { anotar } from "@/lib/sistema/atividades";
import { agoraISO, hojeISO } from "@/lib/sistema/datas";
import { novoId } from "@/lib/sistema/estado";
import type { RegistroHistorico } from "@/lib/sistema/tipos";

/** Protótipo: no lugar de e-mail e senha, a pessoa escolhe um funcionário fictício. */
export function EscolhaFuncionario() {
  const router = useRouter();

  function entrar(id: string) {
    gravarSessao(id);
    // a entrada fica no histórico; o SistemaProvider ainda não tem funcionário nesta tela
    const historico = ler<RegistroHistorico[]>("historico", historicoDeExemplo(hojeISO()));
    gravar("historico", anotar(historico, { id: novoId("historico"), quando: agoraISO(), funcionarioId: id, modulo: "acesso", acao: "Entrou no sistema" }));
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
            {f.coordenador && <Badge>Coordenador e gestor</Badge>}
          </button>
        </li>
      ))}
    </ul>
  );
}
