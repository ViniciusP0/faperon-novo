/** Storage do protótipo: tudo fica no navegador, com prefixo `sistema:`.
 *  Navegador que bloqueia storage (aba privada, política) não quebra: cai para memória da página. */

const PREFIXO = "sistema:";
const CHAVE_SESSAO = `${PREFIXO}sessao`;
const memoria = new Map<string, string>();

function local(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function sessao(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

function lerBruto(storage: Storage | null, chave: string): string | null {
  try {
    const valor = storage?.getItem(chave);
    if (valor != null) return valor;
  } catch {
    // storage bloqueado: vale o que está em memória
  }
  return memoria.get(chave) ?? null;
}

function gravarBruto(storage: Storage | null, chave: string, valor: string | null): void {
  if (valor == null) memoria.delete(chave);
  else memoria.set(chave, valor);
  try {
    if (valor == null) storage?.removeItem(chave);
    else storage?.setItem(chave, valor);
  } catch {
    // já ficou em memória
  }
}

export function ler<T>(chave: string, padrao: T): T {
  const bruto = lerBruto(local(), PREFIXO + chave);
  if (bruto == null) return padrao;
  try {
    return JSON.parse(bruto) as T;
  } catch {
    return padrao;
  }
}

export function gravar(chave: string, valor: unknown): void {
  gravarBruto(local(), PREFIXO + chave, JSON.stringify(valor));
}

export function lerSessao(): string | null {
  return lerBruto(sessao(), CHAVE_SESSAO);
}

export function gravarSessao(id: string | null): void {
  gravarBruto(sessao(), CHAVE_SESSAO, id);
}

/** "Restaurar dados de exemplo": apaga agenda e frota, mantém quem está logado. */
export function apagarTudo(): void {
  for (const chave of [...memoria.keys()]) if (chave !== CHAVE_SESSAO) memoria.delete(chave);
  const storage = local();
  try {
    if (!storage) return;
    const chaves: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const chave = storage.key(i);
      if (chave?.startsWith(PREFIXO)) chaves.push(chave);
    }
    for (const chave of chaves) storage.removeItem(chave);
  } catch {
    // nada a apagar fora da memória
  }
}
