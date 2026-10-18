import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ALBUNS, filtrarAlbuns, totalDeFotos } from "./galeria";

const PUBLIC = path.resolve(__dirname, "../../public");

describe("galeria de eventos", () => {
  it("cada foto e miniatura existe em public e o álbum tem ao menos 3 fotos", () => {
    for (const album of ALBUNS) {
      expect(album.fotos.length, album.titulo).toBeGreaterThanOrEqual(3);
      for (const f of album.fotos) {
        expect(existsSync(path.join(PUBLIC, f.src)), f.src).toBe(true);
        expect(existsSync(path.join(PUBLIC, f.miniatura)), f.miniatura).toBe(true);
      }
    }
  });

  it("vem da mais recente para a mais antiga, com link da matéria e categoria válida", () => {
    const datas = ALBUNS.map((a) => a.data);
    expect(datas).toEqual([...datas].sort().reverse());
    for (const a of ALBUNS) {
      expect(["faperon", "senar"]).toContain(a.categoria);
      expect(a.url).toMatch(/^https:\/\/(www\.faperon\.com\.br|sistemafaperon\.org\.br)\//);
    }
  });

  it("filtra por categoria sem perder álbuns", () => {
    const f = filtrarAlbuns(ALBUNS, "faperon");
    const s = filtrarAlbuns(ALBUNS, "senar");
    expect(f.length + s.length).toBe(ALBUNS.length);
    expect(filtrarAlbuns(ALBUNS, null)).toHaveLength(ALBUNS.length);
    expect(totalDeFotos(f) + totalDeFotos(s)).toBe(totalDeFotos(ALBUNS));
  });
});
