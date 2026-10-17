const REPASSAR = ["content-type", "content-disposition", "cache-control", "retry-after", "etag", "last-modified"];

const PERMITIDOS = ["/api/v1/"];

/** Acima do timeout do gunicorn (60 s): uma API travada não segura a conexão do Next para sempre. */
const TEMPO_LIMITE_MS = 65_000;
const CORPO_MAXIMO = 16_384; // bytes; o Zétele manda no máximo ~9 KB (pergunta + 6 mensagens)

/** Último item do X-Forwarded-For: o que o Funnel (único proxy confiável) acrescentou. O resto pode ter vindo do cliente. */
export function ipDoCliente(valor: string | null): string | null {
  const itens = (valor ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return itens.at(-1) ?? null;
}

/**
 * Lê o corpo contando bytes e para assim que passa do limite: route handlers do App Router não limitam o corpo,
 * e ler tudo antes de checar deixaria um POST de centenas de MB derrubar o container.
 */
async function lerCorpoLimitado(req: Request): Promise<string | Response> {
  const grandeDemais = () => Response.json({ erro: "Corpo grande demais" }, { status: 413 });
  if (Number(req.headers.get("content-length")) > CORPO_MAXIMO) return grandeDemais();
  if (!req.body) return "";
  const leitor = req.body.getReader();
  const pedacos: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await leitor.read();
      if (done) break;
      total += value.byteLength;
      if (total > CORPO_MAXIMO) {
        leitor.cancel().catch(() => {});
        return grandeDemais();
      }
      pedacos.push(value);
    }
  } catch {
    // Cliente que desconecta no meio do envio.
    return Response.json({ erro: "Corpo inválido" }, { status: 400 });
  }
  const bytes = new Uint8Array(total);
  let posicao = 0;
  for (const pedaco of pedacos) {
    bytes.set(pedaco, posicao);
    posicao += pedaco.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

/** Encaminha ao Django só a API pública (schema e docs ficam fora do Funnel); GET/HEAD sem corpo, POST com corpo limitado. Lê API_INTERNAL_URL em runtime (rewrites do next.config são fixados no build). */
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
  // Sem X-Forwarded-For (acesso direto à porta, proxy que só define X-Real-IP), o X-Real-IP evita que todos dividam o IP do container.
  const ip = ipDoCliente(req.headers.get("x-forwarded-for")) ?? ipDoCliente(req.headers.get("x-real-ip"));
  if (ip) headers.set("x-forwarded-for", ip);

  const temCorpo = req.method !== "GET" && req.method !== "HEAD";
  let corpo: string | undefined;
  if (temCorpo) {
    const lido = await lerCorpoLimitado(req);
    if (lido instanceof Response) return lido;
    corpo = lido;
    const tipo = req.headers.get("content-type");
    if (tipo) headers.set("content-type", tipo);
  }

  try {
    const res = await fetch(destino, { method: req.method, headers, body: corpo, redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
    });
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
