import { WIX_URL } from "@/lib/site";

export type CategoriaInformativo = "corte" | "leite";

export interface Informativo {
  titulo: string;
  data: string;
  url: string;
}

export interface Categoria {
  id: CategoriaInformativo;
  titulo: string;
  /** Rótulo curto para a aba. */
  curto: string;
  itens: Informativo[];
}

const pdf = (hash: string) => `${WIX_URL}/_files/ugd/cbbcc7_${hash}.pdf`;

export const INFORMATIVOS = {
  titulo: "Informativos Técnicos",
  subtitulo: "Acompanhamento mensal de dados do setor agropecuário de Rondônia",
  categorias: [
    {
      id: "corte",
      titulo: "Bovinocultura de Corte",
      curto: "Corte",
      itens: [
        { titulo: "Dezembro/2025", data: "2025-12-01", url: pdf("e54c0da4618845329cfb29cb3b6935e0") },
        { titulo: "Novembro/2025", data: "2025-11-03", url: pdf("863e859b90ed49c59a18b98ac8f584e4") },
        { titulo: "Outubro/2025", data: "2025-10-31", url: pdf("e121129565cd44b9bfb3b1283b78211d") },
        { titulo: "Setembro/2025", data: "2025-09-30", url: pdf("00528760956640b6aa832516336d39ef") },
        { titulo: "Agosto/2025", data: "2025-08-31", url: pdf("7776f79c9f1e40349e4689b061aba2f1") },
        { titulo: "Julho/2025", data: "2025-07-31", url: pdf("da235c7d36514de899a86278ac51d8f5") },
        { titulo: "Junho/2025", data: "2025-06-30", url: pdf("3687b2a213384975a67e626039c1dcf2") },
        { titulo: "Maio/2025", data: "2025-05-31", url: pdf("aa002ea09f7f4fc98645296e48607564") },
        { titulo: "Abril/2025", data: "2025-04-30", url: pdf("81a88189108644e0a6b773e6e84e9781") },
        { titulo: "Março/2025", data: "2025-03-31", url: pdf("f5a473f336be474b83c41f4c31e6622e") },
        { titulo: "Fevereiro/2025", data: "2025-02-28", url: pdf("c95e2feaf69a4063a29651e219acc946") },
        { titulo: "Janeiro/2025", data: "2025-01-31", url: pdf("811e31831ae643409a3256d90a2e8f51") },
      ],
    },
    {
      id: "leite",
      titulo: "Bovinocultura de Leite",
      curto: "Leite",
      itens: [
        { titulo: "Outubro/2025", data: "2025-10-06", url: pdf("508c333d190b42c992ab6b66d402d3d7") },
        { titulo: "Setembro/2025", data: "2025-09-01", url: pdf("a6626c77cda24d9d9976c05b420d30dd") },
        { titulo: "Agosto/2025", data: "2025-08-04", url: pdf("38a24ca3ba344230953929f9676c2708") },
        { titulo: "Julho/2025", data: "2025-07-07", url: pdf("19e29eac3bb34dacbdbabf7f02701612") },
        { titulo: "Junho/2025", data: "2025-06-02", url: pdf("5a1e605b9585438a85eee00dcafcd8df") },
        { titulo: "Maio/2025", data: "2025-05-05", url: pdf("fe063d848a4949fa8952e5cf307eb300") },
        { titulo: "Abril/2025", data: "2025-04-07", url: pdf("d3a74ff36b5e471e9366294475587551") },
        { titulo: "Março/2025", data: "2025-03-03", url: pdf("0791828463bc4c9ba036cd63d765fe22") },
        { titulo: "Fevereiro/2025", data: "2025-02-03", url: pdf("4e86cccbc80d4fc5944cb03e5faef206") },
        { titulo: "Janeiro/2025", data: "2025-01-06", url: pdf("dc42873caeaf44a88c2254f528c164f7") },
        { titulo: "Dezembro/2024", data: "2024-12-02", url: pdf("c54e587e556b473bad53a5506af4b1e0") },
      ],
    },
  ] satisfies Categoria[],
  boletins: [
    {
      titulo: "Boletim Bovinocultura de Corte 2024.2",
      data: "2025-10-10",
      categoria: "corte",
      url: pdf("ce70c6768e4743768bc857a213aaa338"),
    },
    {
      titulo: "Boletim Bovinocultura de Leite 2024.2",
      data: "2025-10-10",
      categoria: "leite",
      url: pdf("0769eb22d9bd466c8d1607173b9e57fc"),
    },
  ] satisfies (Informativo & { categoria: CategoriaInformativo })[],
  seo: {
    titulo: "Informativos Técnicos",
    descricao:
      "Informativos mensais e boletins técnicos da FAPERON sobre bovinocultura de corte e de leite em Rondônia.",
  },
};
