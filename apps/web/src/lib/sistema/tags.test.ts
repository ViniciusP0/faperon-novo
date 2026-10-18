import { describe, expect, it } from "vitest";
import { FUNCIONARIOS } from "@/content/sistema/funcionarios";
import { alternarTag, comTag, limparTags, nomesDasTags, podeGerirTags, removerTag, sanearTags, tagsDoItem, tagsDeExemplo, validarNomeTag } from "./tags";
import type { Funcionario, Tag } from "./tipos";

const tags: Tag[] = [
  { id: "t1", nome: "Dia de campo", cor: "azul" },
  { id: "t2", nome: "SENAR", cor: "laranja" },
];

const pessoa = (f: Partial<Funcionario>): Funcionario => ({
  id: "x",
  nome: "X",
  area: "Técnica",
  gestorFrota: false,
  gestorEspacos: false,
  gestorContas: false,
  coordenador: false,
  ...f,
});

describe("validarNomeTag", () => {
  it("não aceita nome vazio", () => {
    expect(validarNomeTag("", tags)).toBe("Informe o nome da tag.");
    expect(validarNomeTag("   ", tags)).toBe("Informe o nome da tag.");
  });

  it("não aceita nome repetido, sem diferenciar maiúsculas, acentos e espaços", () => {
    expect(validarNomeTag("senar", tags)).toBe("Já existe a tag “SENAR”.");
    expect(validarNomeTag("  DIA  DE CÂMPO ", tags)).toBe("Já existe a tag “Dia de campo”.");
  });

  it("aceita nome novo e o mesmo nome da própria tag (renomear para outra caixa)", () => {
    expect(validarNomeTag("Sindicatos", tags)).toBeNull();
    expect(validarNomeTag("Senar", tags, "t2")).toBeNull();
    expect(validarNomeTag("Senar", tags, "t1")).toBe("Já existe a tag “SENAR”.");
  });

  it("limita o tamanho do nome", () => {
    expect(validarNomeTag("x".repeat(31), tags)).toBe("Use até 30 caracteres.");
  });
});

describe("podeGerirTags", () => {
  it("vale para coordenador ou qualquer gestor; hoje, o Marcos", () => {
    expect(FUNCIONARIOS.filter((f) => podeGerirTags(f)).map((f) => f.id)).toEqual(["marcos"]);
    expect(podeGerirTags(pessoa({ coordenador: true }))).toBe(true);
    expect(podeGerirTags(pessoa({ gestorFrota: true }))).toBe(true);
    expect(podeGerirTags(pessoa({ gestorEspacos: true }))).toBe(true);
    expect(podeGerirTags(pessoa({ gestorContas: true }))).toBe(true);
    expect(podeGerirTags(pessoa({}))).toBe(false);
    expect(podeGerirTags(null)).toBe(false);
  });
});

describe("aplicar, filtrar e apagar", () => {
  const itens = [
    { id: "a", tags: ["t1", "t2"] },
    { id: "b", tags: ["t2"] },
    { id: "c" },
  ];

  it("removerTag tira a tag de todos os itens e não mexe nos que não a têm", () => {
    const depois = removerTag(itens, "t1");
    expect(depois.map((i) => i.tags)).toEqual([["t2"], ["t2"], undefined]);
    expect(depois[1]).toBe(itens[1]);
    expect(depois[2]).toBe(itens[2]);
  });

  it("comTag filtra por uma tag; sem tag escolhida, vale tudo", () => {
    expect(comTag(itens, "t2").map((i) => i.id)).toEqual(["a", "b"]);
    expect(comTag(itens, "").map((i) => i.id)).toEqual(["a", "b", "c"]);
  });

  it("alternarTag marca e desmarca", () => {
    expect(alternarTag(["t1"], "t2")).toEqual(["t1", "t2"]);
    expect(alternarTag(["t1", "t2"], "t1")).toEqual(["t2"]);
  });

  it("tagsDoItem ignora ids de tags apagadas e nomesDasTags junta os nomes", () => {
    expect(tagsDoItem(["t2", "sumiu", "t1"], tags).map((t) => t.id)).toEqual(["t2", "t1"]);
    expect(tagsDoItem(undefined, tags)).toEqual([]);
    expect(nomesDasTags(["t1", "t2"], tags)).toBe("Dia de campo, SENAR");
    expect(nomesDasTags([], tags)).toBe("");
  });
});

describe("tags de exemplo", () => {
  it("trazem as seis combinadas, com ids e cores distintos", () => {
    const exemplo = tagsDeExemplo();
    expect(exemplo.map((t) => t.nome)).toEqual(["Dia de campo", "Sindicatos", "SENAR", "Assembleia", "Safra 2026/27", "Urgente"]);
    expect(new Set(exemplo.map((t) => t.id)).size).toBe(6);
    expect(new Set(exemplo.map((t) => t.cor)).size).toBe(6);
  });
});

describe("saneamento", () => {
  it("limparTags tira ids de tags que não existem e não mexe no que já está limpo", () => {
    const itens = [{ id: "a", tags: ["t1", "sumiu"] }, { id: "b", tags: ["t2"] }, { id: "c" }];
    const depois = limparTags(itens, tags);
    expect(depois.map((i) => i.tags)).toEqual([["t1"], ["t2"], undefined]);
    expect(depois[1]).toBe(itens[1]);
    expect(depois[2]).toBe(itens[2]);
  });

  it("sanearTags descarta entradas sem id ou nome e troca cor desconhecida", () => {
    expect(
      sanearTags([
        { id: "t1", nome: " SENAR ", cor: "ciano" },
        { id: "t2", nome: "Sem cor", cor: "verde-limao" },
        { id: "t1", nome: "Repetida", cor: "azul" },
        { id: "", nome: "Sem id", cor: "azul" },
        { id: "t3", nome: "  ", cor: "azul" },
        { id: 4, nome: "Id número" },
        "texto solto",
        null,
      ]),
    ).toEqual([
      { id: "t1", nome: "SENAR", cor: "ciano" },
      { id: "t2", nome: "Sem cor", cor: "azul" },
    ]);
  });
});
