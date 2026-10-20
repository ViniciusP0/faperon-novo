import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FUNCIONARIOS, funcionarioPorId } from "@/content/sistema/funcionarios";
import { api } from "../api";
import { gravarSessao } from "./armazenamento";
import { podeVerBoletim, rotuloDia } from "./boletim";
import { useFuncionarioDaSessao } from "./sessao";

describe("podeVerBoletim", () => {
  it("libera a coordenação e a gestão (Marcos) e nega aos demais", () => {
    const por = (id: string) => FUNCIONARIOS.find((f) => f.id === id) ?? null;
    expect(podeVerBoletim(por("marcos"))).toBe(true);
    for (const id of ["carla", "ana", "joao", "luiza"]) expect(podeVerBoletim(por(id))).toBe(false);
    expect(podeVerBoletim(null)).toBe(false);
  });
});

describe("rotuloDia", () => {
  it("monta 'dd/mm · dia da semana' sem deslocar o dia por fuso", () => {
    expect(rotuloDia("2026-10-20")).toBe("20/10 · ter");
    expect(rotuloDia("2026-10-18")).toBe("18/10 · dom");
    expect(rotuloDia("2026-10-24")).toBe("24/10 · sáb");
    expect(rotuloDia("2026-09-30")).toBe("30/09 · qua");
    expect(rotuloDia("2026-10-01")).toBe("01/10 · qui");
  });
});

describe("api do boletim", () => {
  const fetchFalso = vi.fn();
  beforeEach(() => {
    fetchFalso.mockReset();
    fetchFalso.mockImplementation(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchFalso);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("boletimDias consulta /boletim/dias", async () => {
    await api.boletimDias();
    expect(fetchFalso.mock.calls[0]![0]).toBe("/api/v1/boletim/dias");
  });

  it("boletimDia sem filtros não leva query", async () => {
    await api.boletimDia("2026-10-20");
    expect(fetchFalso.mock.calls[0]![0]).toBe("/api/v1/boletim/dia/2026-10-20");
  });

  it("boletimDia leva origem quando não é 'todas'", async () => {
    await api.boletimDia("2026-10-20", "estado");
    expect(fetchFalso.mock.calls[0]![0]).toBe("/api/v1/boletim/dia/2026-10-20?origem=estado");
  });

  it("boletimDia leva todas=1 só quando verdadeiro", async () => {
    await api.boletimDia("2026-10-20", "uniao", true);
    expect(fetchFalso.mock.calls[0]![0]).toBe("/api/v1/boletim/dia/2026-10-20?origem=uniao&todas=1");
    await api.boletimDia("2026-10-20", "todas", true);
    expect(fetchFalso.mock.calls[1]![0]).toBe("/api/v1/boletim/dia/2026-10-20?todas=1");
  });
});

describe("useFuncionarioDaSessao", () => {
  beforeEach(() => gravarSessao(null));

  it("lê a sessão após montar e acompanha as gravações seguintes", () => {
    gravarSessao("carla");
    const { result } = renderHook(() => useFuncionarioDaSessao());
    expect(result.current).toEqual(funcionarioPorId("carla"));
    act(() => gravarSessao("marcos"));
    expect(result.current?.id).toBe("marcos");
    act(() => gravarSessao(null));
    expect(result.current).toBeNull();
  });

  it("gravarSessao dispara o evento 'sistema:sessao'", () => {
    const ouvinte = vi.fn();
    window.addEventListener("sistema:sessao", ouvinte);
    gravarSessao("ana");
    window.removeEventListener("sistema:sessao", ouvinte);
    expect(ouvinte).toHaveBeenCalledTimes(1);
  });
});
