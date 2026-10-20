import { useEffect, useState } from "react";
import { funcionarioPorId } from "@/content/sistema/funcionarios";
import { EVENTO_SESSAO, lerSessao } from "./armazenamento";
import type { Funcionario } from "./tipos";

/** Quem está logado, para quem está fora do `SistemaProvider` (o cabeçalho do site). Começa em null
 *  e só lê o storage depois de montar, para a primeira renderização do cliente igualar a do servidor. */
export function useFuncionarioDaSessao(): Funcionario | null {
  const [funcionario, setFuncionario] = useState<Funcionario | null>(null);
  useEffect(() => {
    const atualizar = () => setFuncionario(funcionarioPorId(lerSessao()));
    atualizar();
    window.addEventListener(EVENTO_SESSAO, atualizar);
    return () => window.removeEventListener(EVENTO_SESSAO, atualizar);
  }, []);
  return funcionario;
}
