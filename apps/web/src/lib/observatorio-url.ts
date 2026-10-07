import type { BlocoObservatorio } from "./api-types";

export const PREFIXOS: Record<BlocoObservatorio, string> = {
  panorama: "pan_",
  crescimento: "cre_",
  territorio: "ter_",
  pecuaria: "pec_",
};

export function parametrosDoBloco(sp: URLSearchParams, bloco: BlocoObservatorio): URLSearchParams {
  const prefixo = PREFIXOS[bloco];
  const saida = new URLSearchParams();
  for (const [k, v] of sp) if (k.startsWith(prefixo) && v) saida.set(k.slice(prefixo.length), v);
  return saida;
}

export function comFiltro(
  sp: URLSearchParams,
  bloco: BlocoObservatorio,
  chave: string,
  valor: string | null,
): URLSearchParams {
  const novo = new URLSearchParams(sp);
  const k = PREFIXOS[bloco] + chave;
  if (valor) novo.set(k, valor);
  else novo.delete(k);
  return novo;
}

export function semFiltrosDoBloco(sp: URLSearchParams, bloco: BlocoObservatorio): URLSearchParams {
  const novo = new URLSearchParams();
  for (const [k, v] of sp) if (!k.startsWith(PREFIXOS[bloco])) novo.append(k, v);
  return novo;
}
