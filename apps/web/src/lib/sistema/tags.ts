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
