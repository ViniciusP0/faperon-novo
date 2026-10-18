import { describe, expect, it } from "vitest";
import { COR_TIPO, LEGENDA, TIPO_DA_ATIVIDADE, TIPO_DO_ESPACO, TIPO_DO_EVENTO, tipoDoEvento, tiposPresentes } from "./legenda";
import type { Evento, TipoLegenda } from "./tipos";

const evento = (e: Partial<Evento>): Evento => ({
  id: "e1",
  titulo: "X",
  data: "2026-10-20",
  inicio: "09:00",
  fim: "10:00",
  local: "",
  descricao: "",
  tipo: "reuniao",
  origem: "pessoal",
  ...e,
});

describe("legenda única de tipos", () => {
  it("os tipos de cada módulo apontam para o catálogo", () => {
    expect(TIPO_DO_EVENTO).toEqual({ reuniao: "reuniao", viagem: "viagem", compromisso: "compromisso" });
    expect(TIPO_DO_ESPACO).toEqual({ reuniao: "reuniao", curso: "capacitacao", palestra: "palestra", institucional: "institucional", outro: "outro" });
    expect(TIPO_DA_ATIVIDADE).toEqual({
      visita_tecnica: "visita_tecnica",
      atendimento: "atendimento",
      reuniao: "reuniao",
      capacitacao: "capacitacao",
      evento: "institucional",
      viagem: "viagem",
      administrativo: "administrativo",
      outro: "outro",
    });
  });

  it("cada tipo tem nome e classes de cor forte, suave e contorno", () => {
    expect(Object.keys(LEGENDA)).toHaveLength(10);
    expect(LEGENDA.atendimento).toBe("Atendimento ao produtor");
    for (const cor of Object.values(COR_TIPO)) {
      expect(cor.texto).toMatch(/^text-tipo-[a-z-]+$/);
      expect(cor.fundo).toMatch(/^bg-tipo-[a-z-]+-suave$/);
      expect(cor.contorno).toMatch(/^ring-tipo-[a-z-]+$/);
      expect(cor.ponto).toMatch(/^bg-tipo-[a-z-]+$/);
    }
  });

  it("o evento usa o tipo da legenda quando vem de outro módulo; senão, o próprio tipo", () => {
    expect(tipoDoEvento(evento({ tipo: "compromisso" }))).toBe("compromisso");
    expect(tipoDoEvento(evento({ origem: "espaco", tipo: "reuniao", tipoNaLegenda: "palestra" }))).toBe("palestra");
    expect(tipoDoEvento(evento({ origem: "frota", tipo: "viagem" }))).toBe("viagem");
  });

  it("tiposPresentes tira repetidos e segue a ordem do catálogo", () => {
    const tipos: TipoLegenda[] = ["outro", "viagem", "reuniao", "viagem"];
    expect(tiposPresentes(tipos)).toEqual(["reuniao", "viagem", "outro"]);
    expect(tiposPresentes([])).toEqual([]);
  });
});
