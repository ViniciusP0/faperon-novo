const REPASSAR = ["content-type", "content-disposition", "cache-control", "retry-after", "etag", "last-modified"];

const PERMITIDOS = ["/api/v1/"];

/** Encaminha ao Django só a API pública (schema e docs ficam fora do Funnel), lendo API_INTERNAL_URL em runtime (rewrites do next.config são fixados no build). */
export async function proxyParaApi(req: Request): Promise<Response> {
  const base = process.env.API_INTERNAL_URL ?? "http://localhost:8000";
  const origem = new URL(req.url);
  if (!PERMITIDOS.some((prefixo) => origem.pathname.startsWith(prefixo))) {
    return Response.json({ erro: "Não encontrado" }, { status: 404 });
  }
  const destino = `${base}${origem.pathname}${origem.search}`;

  const headers = new Headers();
  for (const nome of ["accept", "accept-language", "if-none-match", "if-modified-since"]) {
    const valor = req.headers.get(nome);
    if (valor) headers.set(nome, valor);
  }
  const ip = req.headers.get("x-forwarded-for");
  if (ip) headers.set("x-forwarded-for", ip);

  try {
    const res = await fetch(destino, { method: req.method, headers, redirect: "manual", cache: "no-store" });
    const saida = new Headers();
    for (const nome of REPASSAR) {
      const valor = res.headers.get(nome);
      if (valor) saida.set(nome, valor);
    }
    return new Response(req.method === "HEAD" || res.status === 304 ? null : res.body, { status: res.status, headers: saida });
  } catch {
    return Response.json({ erro: "API indisponível no momento" }, { status: 502 });
  }
}
