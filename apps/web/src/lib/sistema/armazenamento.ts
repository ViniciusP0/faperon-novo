/** Storage do protótipo: tudo fica no navegador, com prefixo `sistema:`.
 *  Navegador que bloqueia storage (aba privada, política) não quebra: cai para memória da página. */

const PREFIXO = "sistema:";
const CHAVE_SESSAO = `${PREFIXO}sessao`;
const memoria = new Map<string, string>();
// chaves cuja última gravação não coube no storage (cota cheia): a versão certa está na memória
const soNaMemoria = new Set<string>();

/** Evento disparado quando o navegador fica sem espaço para o protótipo (a barra avisa a pessoa). */
export const ARMAZENAMENTO_CHEIO = "sistema:armazenamento-cheio";

/** Evento disparado depois de gravar a sessão, para quem está fora do provider (cabeçalho) acompanhar quem entrou. */
export const EVENTO_SESSAO = "sistema:sessao";

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

/** A memória só vale quando o storage não existe ou lança erro; com storage funcionando, ele manda. */
function lerBruto(storage: Storage | null, chave: string): string | null {
  if (soNaMemoria.has(chave)) return memoria.get(chave) ?? null;
  if (storage) {
    try {
      return storage.getItem(chave);
    } catch {
      // storage bloqueado: cai para a memória
    }
  }
  return memoria.get(chave) ?? null;
}

function gravarBruto(storage: Storage | null, chave: string, valor: string | null): void {
  if (storage) {
    try {
      if (valor == null) storage.removeItem(chave);
      else storage.setItem(chave, valor);
      soNaMemoria.delete(chave);
      return;
    } catch {
      // storage bloqueado ou cheio: guarda em memória e passa a ler dela (senão voltaria a versão velha)
      soNaMemoria.add(chave);
      if (typeof window !== "undefined") window.dispatchEvent(new Event(ARMAZENAMENTO_CHEIO));
    }
  }
  if (valor == null) memoria.delete(chave);
  else memoria.set(chave, valor);
}

/** O dado lido tem o formato do padrão? (lista é lista; objeto tem as listas que o padrão tem) */
function formatoCompativel(valor: unknown, padrao: unknown): boolean {
  if (padrao == null) return true;
  if (Array.isArray(padrao)) return Array.isArray(valor);
  if (typeof padrao === "object") {
    if (valor == null || typeof valor !== "object" || Array.isArray(valor)) return false;
    return Object.entries(padrao).every(([k, v]) => !Array.isArray(v) || Array.isArray((valor as Record<string, unknown>)[k]));
  }
  return typeof valor === typeof padrao;
}

/** JSON inválido ou de formato errado (editado à mão, versão antiga) cai no padrão em vez de quebrar a tela. */
export function ler<T>(chave: string, padrao: T): T {
  const bruto = lerBruto(local(), PREFIXO + chave);
  if (bruto == null) return padrao;
  try {
    const valor: unknown = JSON.parse(bruto);
    return formatoCompativel(valor, padrao) ? (valor as T) : padrao;
  } catch {
    return padrao;
  }
}

export function gravar(chave: string, valor: unknown): void {
  gravarBruto(local(), PREFIXO + chave, JSON.stringify(valor));
}

const CHAVE_ACESSO = `${PREFIXO}acesso`;

/** Login do protótipo feito nesta aba (some ao fechar a aba). */
export function lerAcesso(): boolean {
  return lerBruto(sessao(), CHAVE_ACESSO) === "1";
}

export function gravarAcesso(liberado: boolean): void {
  gravarBruto(sessao(), CHAVE_ACESSO, liberado ? "1" : null);
}

export function lerSessao(): string | null {
  return lerBruto(sessao(), CHAVE_SESSAO);
}

export function gravarSessao(id: string | null): void {
  gravarBruto(sessao(), CHAVE_SESSAO, id);
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(EVENTO_SESSAO));
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
