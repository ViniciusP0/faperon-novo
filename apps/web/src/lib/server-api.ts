import type { Destaques } from "./api-types";

const BASE = process.env.API_INTERNAL_URL ?? "http://localhost:8000";

async function getServer<T>(path: string, revalidate = 60): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}`, { next: { revalidate } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const destaques = () => getServer<Destaques>("/api/v1/destaques");
export const contarProdutos = async (segmento: "agricultura" | "pecuaria") =>
  (await getServer<unknown[]>(`/api/v1/produtos?segmento=${segmento}`, 3600))?.length ?? null;
export const contarMunicipios = async () => (await getServer<unknown[]>("/api/v1/municipios", 3600))?.length ?? null;
