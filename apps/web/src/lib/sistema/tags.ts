import type { CorTag, Funcionario, Tag } from "./tipos";

/** Paleta das tags, distinta da dos tipos; cada cor só aparece como ponto ao lado do nome. */
export const CORES_TAG: Record<CorTag, { rotulo: string; ponto: string }> = {
  azul: { rotulo: "Azul", ponto: "bg-tag-azul" },
  violeta: { rotulo: "Violeta", ponto: "bg-tag-violeta" },
  rosa: { rotulo: "Rosa", ponto: "bg-tag-rosa" },
  laranja: { rotulo: "Laranja", ponto: "bg-tag-laranja" },
  amarelo: { rotulo: "Amarelo", ponto: "bg-tag-amarelo" },
  ciano: { rotulo: "Ciano", ponto: "bg-tag-ciano" },
  magenta: { rotulo: "Magenta", ponto: "bg-tag-magenta" },
  indigo: { rotulo: "Índigo", ponto: "bg-tag-indigo" },
  vermelho: { rotulo: "Vermelho", ponto: "bg-tag-vermelho" },
  coral: { rotulo: "Coral", ponto: "bg-tag-coral" },
  terracota: { rotulo: "Terracota", ponto: "bg-tag-terracota" },
  marrom: { rotulo: "Marrom", ponto: "bg-tag-marrom" },
  dourado: { rotulo: "Dourado", ponto: "bg-tag-dourado" },
  oliva: { rotulo: "Oliva", ponto: "bg-tag-oliva" },
  verde: { rotulo: "Verde", ponto: "bg-tag-verde" },
  esmeralda: { rotulo: "Esmeralda", ponto: "bg-tag-esmeralda" },
  turquesa: { rotulo: "Turquesa", ponto: "bg-tag-turquesa" },
  petroleo: { rotulo: "Petróleo", ponto: "bg-tag-petroleo" },
  celeste: { rotulo: "Celeste", ponto: "bg-tag-celeste" },
  marinho: { rotulo: "Azul-marinho", ponto: "bg-tag-marinho" },
  lavanda: { rotulo: "Lavanda", ponto: "bg-tag-lavanda" },
  ameixa: { rotulo: "Ameixa", ponto: "bg-tag-ameixa" },
  vinho: { rotulo: "Vinho", ponto: "bg-tag-vinho" },
  grafite: { rotulo: "Grafite", ponto: "bg-tag-grafite" },
};

export const TAMANHO_MAXIMO_TAG = 30;

/** Compara nomes sem maiúsculas, acentos nem espaços repetidos. */
const normalizar = (nome: string) =>
  nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/** `idAtual` é a tag sendo renomeada: ela pode manter o próprio nome (trocar só a caixa, por exemplo). */
export function validarNomeTag(nome: string, tags: Tag[], idAtual?: string): string | null {
  const limpo = normalizar(nome);
  if (!limpo) return "Informe o nome da tag.";
  if (nome.trim().length > TAMANHO_MAXIMO_TAG) return `Use até ${TAMANHO_MAXIMO_TAG} caracteres.`;
  const igual = tags.find((t) => t.id !== idAtual && normalizar(t.nome) === limpo);
  return igual ? `Já existe a tag “${igual.nome}”.` : null;
}

/** Quem cria, renomeia e apaga tags: o coordenador ou qualquer gestor. Todos aplicam e filtram. */
export function podeGerirTags(f: Funcionario | null): boolean {
  return !!f && (f.coordenador || f.gestorFrota || f.gestorEspacos || f.gestorContas);
}

/** Apagar uma tag tira o id dela dos itens; os que não a têm voltam iguais (mesma referência). */
export function removerTag<T extends { tags?: string[] }>(itens: T[], id: string): T[] {
  return itens.map((i) => (i.tags?.includes(id) ? { ...i, tags: i.tags.filter((t) => t !== id) } : i));
}

/** Filtro "Tag" das listas: vazio quer dizer todas. */
export function comTag<T extends { tags?: string[] }>(itens: T[], tagId: string): T[] {
  return tagId ? itens.filter((i) => i.tags?.includes(tagId)) : itens;
}

export function alternarTag(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((t) => t !== id) : [...ids, id];
}

/** As tags do item que ainda existem, na ordem do item. */
export function tagsDoItem(ids: string[] | undefined, tags: Tag[]): Tag[] {
  return (ids ?? []).flatMap((id) => tags.find((t) => t.id === id) ?? []);
}

export function nomesDasTags(ids: string[] | undefined, tags: Tag[]): string {
  return tagsDoItem(ids, tags)
    .map((t) => t.nome)
    .join(", ");
}

/** Itens só com ids de tags que existem (formulário aberto com tag já apagada, agenda de exemplo antiga);
 *  os que já estão limpos voltam iguais (mesma referência). */
export function limparTags<T extends { tags?: string[] }>(itens: T[], tags: Tag[]): T[] {
  const existe = new Set(tags.map((t) => t.id));
  return itens.map((i) => (i.tags?.some((id) => !existe.has(id)) ? { ...i, tags: i.tags.filter((id) => existe.has(id)) } : i));
}

/** Lista lida do storage, que pode ter sido editada à mão: descarta entrada sem id ou nome (ou com id
 *  repetido) e troca cor desconhecida pela primeira da paleta, para nenhum chip quebrar. */
export function sanearTags(valor: unknown[]): Tag[] {
  const vistos = new Set<string>();
  return valor.flatMap((v) => {
    if (!v || typeof v !== "object") return [];
    const { id, nome, cor } = v as Record<string, unknown>;
    if (typeof id !== "string" || !id || vistos.has(id) || typeof nome !== "string" || !nome.trim()) return [];
    vistos.add(id);
    return [{ id, nome: nome.trim(), cor: typeof cor === "string" && cor in CORES_TAG ? (cor as CorTag) : "azul" }];
  });
}

/** Lista inicial, a validar com o Tiago Martins. Os ids ficam fixos para os dados de exemplo usarem. */
export function tagsDeExemplo(): Tag[] {
  return [
    { id: "tag-dia-de-campo", nome: "Dia de campo", cor: "laranja" },
    { id: "tag-sindicatos", nome: "Sindicatos", cor: "azul" },
    { id: "tag-senar", nome: "SENAR", cor: "ciano" },
    { id: "tag-assembleia", nome: "Assembleia", cor: "violeta" },
    { id: "tag-safra", nome: "Safra 2026/27", cor: "amarelo" },
    { id: "tag-urgente", nome: "Urgente", cor: "rosa" },
  ];
}
