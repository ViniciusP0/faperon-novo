import { describe, expect, it } from "vitest";
// @ts-expect-error -- a configuração do Next é JavaScript puro, sem declaração de tipos
import nextConfig from "../../next.config.mjs";

describe("redirects", () => {
  it("/blog (endereço do Wix) leva permanentemente para /noticias", async () => {
    const regras = await nextConfig.redirects();
    expect(regras).toContainEqual({ source: "/blog", destination: "/noticias", permanent: true });
  });
});
