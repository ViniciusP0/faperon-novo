// Importação pontual das notícias do site Wix (ADR 0018). Execução manual: npm run importar:noticias
// Gera src/content/noticias.json e baixa as imagens para public/noticias/.
// Uso:
//   npm run importar:noticias                      lê o RSS do Wix (a home é a reserva)
//   npm run importar:noticias -- --de=arquivo.json  reaproveita um JSON com { titulo, resumo, data, imagem_externa, url_original, categorias? }
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const JSON_SAIDA = path.join(RAIZ, "src/content/noticias.json");
const PASTA_IMAGENS = path.join(RAIZ, "public/noticias");
const FEED_URL = "https://www.faperon.com.br/blog-feed.xml";
const HOME_URL = "https://www.faperon.com.br/";
const LIMITE_RESUMO = 320;
const LARGURA_IMAGEM = 900;

const ENTIDADES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function decodificar(texto) {
  return texto
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(Number.parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, nome) => ENTIDADES[nome.toLowerCase()] ?? m);
}

function textoLimpo(html) {
  const semCdata = html.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  return decodificar(decodificar(semCdata).replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

export function resumir(html) {
  const limpo = textoLimpo(html);
  return limpo.length <= LIMITE_RESUMO ? limpo : `${limpo.slice(0, LIMITE_RESUMO - 1).trimEnd()}…`;
}

export function slugificar(titulo) {
  const base = titulo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return base || "noticia";
}

/** Todas as <category> do item, sem repetição e sem vazias, na ordem do feed. */
function categoriasDoItem(item) {
  const nomes = [...item.matchAll(/<category[^>]*>([\s\S]*?)<\/category>/gi)].map((m) => textoLimpo(m[1])).filter(Boolean);
  return [...new Set(nomes)];
}

function campo(item, tag) {
  const m = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? textoLimpo(m[1]) : "";
}

export function lerFeed(xml) {
  const itens = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((m) => m[1]);
  return itens
    .map((item) => {
      const titulo = campo(item, "title");
      const link = campo(item, "link");
      if (!titulo || !link) return null;
      const publicado = campo(item, "pubDate");
      const data = publicado && !Number.isNaN(Date.parse(publicado)) ? new Date(publicado) : new Date();
      const enclosure = item.match(/<enclosure[^>]*\surl="([^"]+)"/i);
      return {
        titulo,
        resumo: resumir(item.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1] ?? ""),
        data: data.toISOString().slice(0, 10),
        imagem_externa: enclosure ? decodificar(enclosure[1]) : "",
        url_original: link,
        categorias: categoriasDoItem(item),
      };
    })
    .filter(Boolean);
}

export function lerHome(html) {
  const vistos = new Map();
  for (const m of html.matchAll(/<a\b[^>]*href="([^"]*\/post\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = decodificar(m[1]);
    const titulo = textoLimpo(m[2]) || decodeURIComponent(new URL(href, HOME_URL).pathname.split("/").pop() ?? "").replaceAll("-", " ");
    if (href && titulo && !vistos.has(href)) {
      vistos.set(href, { titulo, resumo: "", data: new Date().toISOString().slice(0, 10), imagem_externa: "", url_original: href, categorias: [] });
    }
  }
  return [...vistos.values()];
}

async function buscarTexto(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`${url} respondeu ${res.status}`);
  return res.text();
}

async function buscarNoticias() {
  try {
    const noticias = lerFeed(await buscarTexto(FEED_URL));
    if (noticias.length > 0) return noticias;
    console.warn("Feed do Wix vazio; usando a home");
  } catch (erro) {
    console.warn(`Feed do Wix indisponível (${erro.message}); usando a home`);
  }
  return lerHome(await buscarTexto(HOME_URL));
}

// O Wix serve a imagem no formato pedido no fim da URL: file.jpg gera JPEG, bem menor que PNG.
function urlDaImagem(url) {
  return url
    .replace(/\/v1\/fit\/w_(\d+),h_(\d+)/, (_, w, h) => `/v1/fit/w_${LARGURA_IMAGEM},h_${Math.round((Number(h) * LARGURA_IMAGEM) / Number(w))}`)
    .replace(/\/file\.\w+$/, "/file.jpg");
}

const EXTENSOES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

async function baixarImagem(url, slug) {
  if (!new URL(url).hostname.endsWith("wixstatic.com")) return null; // ex.: enclosure que aponta para um vídeo do YouTube
  try {
    const res = await fetch(urlDaImagem(url), { signal: AbortSignal.timeout(60_000) });
    const tipo = (res.headers.get("content-type") ?? "").split(";")[0];
    const extensao = EXTENSOES[tipo];
    if (!res.ok || !extensao) {
      console.warn(`Imagem não baixada (${slug}): HTTP ${res.status}, tipo ${tipo}`);
      return null;
    }
    const arquivo = `${slug}.${extensao}`;
    await writeFile(path.join(PASTA_IMAGENS, arquivo), Buffer.from(await res.arrayBuffer()));
    return `/noticias/${arquivo}`;
  } catch (erro) {
    console.warn(`Imagem não baixada (${slug}): ${erro.message}`);
    return null;
  }
}

async function principal() {
  const de = process.argv.find((a) => a.startsWith("--de="))?.slice(5);
  const origem = de ? JSON.parse(await readFile(path.resolve(de), "utf8")) : await buscarNoticias();
  if (origem.length === 0) throw new Error("Nenhuma notícia encontrada");

  await mkdir(PASTA_IMAGENS, { recursive: true });
  const usados = new Set();
  const noticias = [];
  for (const n of origem) {
    const base = slugificar(n.titulo);
    let slug = base;
    for (let i = 2; usados.has(slug); i++) slug = `${base}-${i}`;
    usados.add(slug);
    const imagem = n.imagem_externa ? await baixarImagem(n.imagem_externa, slug) : null;
    noticias.push({ slug, titulo: n.titulo, resumo: n.resumo, data: n.data, imagem, url_original: n.url_original || null, categorias: n.categorias ?? [] });
  }
  noticias.sort((a, b) => b.data.localeCompare(a.data));
  await writeFile(JSON_SAIDA, `${JSON.stringify(noticias, null, 2)}\n`, "utf8");
  console.log(`${noticias.length} notícias gravadas em src/content/noticias.json (${noticias.filter((n) => n.imagem).length} com imagem)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal().catch((erro) => {
    console.error(erro.message);
    process.exit(1);
  });
}
