// Servidor mock da API FAPERON (docs/api-contract.md). Dados FICTÍCIOS, formato exato do contrato.
// Uso: npm run mock  (porta 8000, ou MOCK_PORT)
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_PORT ?? 8000);

const MUNICIPIOS = [
  ["1100015", "Alta Floresta D'Oeste"], ["1100023", "Ariquemes"], ["1100031", "Cabixi"], ["1100049", "Cacoal"],
  ["1100056", "Cerejeiras"], ["1100064", "Colorado do Oeste"], ["1100072", "Corumbiara"], ["1100080", "Costa Marques"],
  ["1100098", "Espigão D'Oeste"], ["1100106", "Guajará-Mirim"], ["1100114", "Jaru"], ["1100122", "Ji-Paraná"],
  ["1100130", "Machadinho D'Oeste"], ["1100148", "Nova Brasilândia D'Oeste"], ["1100155", "Ouro Preto do Oeste"],
  ["1100189", "Pimenta Bueno"], ["1100205", "Porto Velho"], ["1100254", "Presidente Médici"], ["1100262", "Rio Crespo"],
  ["1100288", "Rolim de Moura"], ["1100296", "Santa Luzia D'Oeste"], ["1100304", "Vilhena"],
  ["1100320", "São Miguel do Guaporé"], ["1100338", "Nova Mamoré"], ["1100346", "Alvorada D'Oeste"],
  ["1100379", "Alto Alegre dos Parecis"], ["1100403", "Alto Paraíso"], ["1100452", "Buritis"],
  ["1100502", "Novo Horizonte do Oeste"], ["1100601", "Cacaulândia"], ["1100700", "Campo Novo de Rondônia"],
  ["1100809", "Candeias do Jamari"], ["1100908", "Castanheiras"], ["1100924", "Chupinguaia"], ["1100940", "Cujubim"],
  ["1101005", "Governador Jorge Teixeira"], ["1101104", "Itapuã do Oeste"], ["1101203", "Ministro Andreazza"],
  ["1101302", "Mirante da Serra"], ["1101401", "Monte Negro"], ["1101435", "Nova União"], ["1101450", "Parecis"],
  ["1101468", "Pimenteiras do Oeste"], ["1101476", "Primavera de Rondônia"], ["1101484", "São Felipe D'Oeste"],
  ["1101492", "São Francisco do Guaporé"], ["1101500", "Seringueiras"], ["1101559", "Teixeirópolis"],
  ["1101609", "Theobroma"], ["1101708", "Urupá"], ["1101757", "Vale do Anari"], ["1101807", "Vale do Paraíso"],
].map(([codigo_ibge, nome]) => ({ codigo_ibge, nome }));

if (MUNICIPIOS.length !== 52) throw new Error(`mock precisa de 52 municípios, tem ${MUNICIPIOS.length}`);

const ANO_MIN = 2000;
const ANO_MAX = 2024;
const ATUALIZADO_EM = "2026-09-24T14:00:00Z";

const IND = {
  "area-plantada": { slug: "area-plantada", nome: "Área plantada", unidade: "Hectares", agregacao: "soma" },
  "area-colhida": { slug: "area-colhida", nome: "Área colhida", unidade: "Hectares", agregacao: "soma" },
  "quantidade-produzida": { slug: "quantidade-produzida", nome: "Quantidade produzida", unidade: "Toneladas", agregacao: "soma" },
  "rendimento-medio": { slug: "rendimento-medio", nome: "Rendimento médio", unidade: "Quilogramas por hectare", agregacao: "media_ponderada" },
  "valor-da-producao": { slug: "valor-da-producao", nome: "Valor da produção", unidade: "Mil reais", agregacao: "soma" },
  efetivo: { slug: "efetivo", nome: "Efetivo dos rebanhos", unidade: "Cabeças", agregacao: "soma" },
  "producao-de-origem-animal": { slug: "producao-de-origem-animal", nome: "Produção de origem animal", unidade: "Mil litros", agregacao: "soma" },
};

const AGRI = ["area-plantada", "area-colhida", "quantidade-produzida", "rendimento-medio", "valor-da-producao"];

const PRODUTOS = [
  { slug: "soja-em-grao", nome: "Soja (em grão)", segmento: "agricultura", tabela_sidra: 5457, escala: 60000, preco: 2.4, inds: AGRI },
  { slug: "milho-em-grao", nome: "Milho (em grão)", segmento: "agricultura", tabela_sidra: 5457, escala: 30000, preco: 1.1, inds: AGRI },
  { slug: "cafe-em-grao-canephora", nome: "Café (em grão) Canephora", segmento: "agricultura", tabela_sidra: 5457, escala: 8000, preco: 12, inds: AGRI },
  { slug: "cacau-em-amendoa", nome: "Cacau (em amêndoa)", segmento: "agricultura", tabela_sidra: 5457, escala: 1500, preco: 20, inds: AGRI },
  { slug: "bovino", nome: "Bovino", segmento: "pecuaria", tabela_sidra: 3939, escala: 220000, preco: 0, inds: ["efetivo"] },
  { slug: "leite", nome: "Leite", segmento: "pecuaria", tabela_sidra: 74, escala: 12000, preco: 1.9, inds: ["producao-de-origem-animal", "valor-da-producao"] },
];

const TABELAS = {
  5457: { fonte: "IBGE – Pesquisa Agrícola Municipal (PAM)", url_fonte: "https://sidra.ibge.gov.br/Tabela/5457" },
  3939: { fonte: "IBGE – Pesquisa da Pecuária Municipal (PPM)", url_fonte: "https://sidra.ibge.gov.br/Tabela/3939" },
  74: { fonte: "IBGE – Pesquisa da Pecuária Municipal (PPM)", url_fonte: "https://sidra.ibge.gov.br/tabela/74" },
};

// ---------- geração determinística ----------
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

function statusDe(produto, mi, ano) {
  const r = hash(`s|${produto.slug}|${mi}|${ano}`);
  if (mi % 13 === 5 && ano === ANO_MAX) return "sigiloso";
  if (produto.slug === "cacau-em-amendoa" && mi % 4 === 0) return "inexistente";
  if (r < 0.03) return "inexistente";
  return "ok";
}

function base(produto, mi, ano) {
  const peso = 0.15 + hash(`p|${produto.slug}|${mi}`) * 1.85;
  const crescimento = 0.6 + ((ano - ANO_MIN) / (ANO_MAX - ANO_MIN)) * 0.9;
  const ruido = 0.85 + hash(`r|${produto.slug}|${mi}|${ano}`) * 0.3;
  const colhida = Math.round((produto.escala / 6) * peso * crescimento * ruido);
  const rend = 1800 + hash(`y|${produto.slug}|${mi}`) * 2200 * (0.8 + (ano - ANO_MIN) / 60);
  return { colhida, qtd: Math.round((colhida * rend) / 1000), plantada: Math.round(colhida * 1.03), rend };
}

function celula(produto, indSlug, mi, ano) {
  const status = statusDe(produto, mi, ano);
  if (status !== "ok") return { valor: null, status, partes: null };
  const b = base(produto, mi, ano);
  switch (indSlug) {
    case "area-plantada": return { valor: b.plantada, status, partes: null };
    case "area-colhida": return { valor: b.colhida, status, partes: null };
    case "quantidade-produzida": return { valor: b.qtd, status, partes: null };
    case "rendimento-medio":
      return { valor: b.colhida ? Math.round((b.qtd * 1000) / b.colhida) : null, status, partes: { qtd: b.qtd, area: b.colhida } };
    case "valor-da-producao": return { valor: Math.round(b.qtd * produto.preco * 1000), status, partes: null };
    case "efetivo": return { valor: Math.round((produto.escala / 6) * (0.15 + hash(`p|${produto.slug}|${mi}`) * 1.85) * (0.7 + (ano - ANO_MIN) / 50) * (0.9 + hash(`r|${ano}|${mi}`) * 0.2)), status, partes: null };
    case "producao-de-origem-animal":
      return { valor: Math.round((produto.escala / 6) * (0.15 + hash(`p|${produto.slug}|${mi}`) * 1.85) * (0.6 + (ano - ANO_MIN) / 40) * (0.9 + hash(`r|${ano}|${mi}`) * 0.2)), status, partes: null };
    default: return { valor: null, status: "inexistente", partes: null };
  }
}

function indicadorDo(produto, slug) {
  const ind = { ...IND[slug] };
  // Unidade divergente de propósito: exercita o 422 da comparação entre produtos.
  if (produto.slug === "cacau-em-amendoa" && slug === "quantidade-produzida") ind.unidade = "Quilogramas";
  return ind;
}

function totalEstadual(produto, indSlug, ano) {
  let soma = 0, qtd = 0, area = 0, algum = false;
  for (let mi = 0; mi < MUNICIPIOS.length; mi++) {
    const c = celula(produto, indSlug, mi, ano);
    if (c.valor === null) continue;
    algum = true;
    soma += c.valor;
    if (c.partes) { qtd += c.partes.qtd; area += c.partes.area; }
  }
  if (!algum) return null;
  if (IND[indSlug].agregacao === "media_ponderada") return area ? Math.round((qtd * 1000) / area) : null;
  return soma;
}

// ---------- parâmetros ----------
class HttpError extends Error {
  constructor(status, erro, campos) { super(erro); this.status = status; this.body = campos ? { erro, campos } : { erro }; }
}

function produtoDe(slug) {
  if (!slug) throw new HttpError(400, "Parâmetro obrigatório ausente", { produto: "obrigatório" });
  const p = PRODUTOS.find((x) => x.slug === slug);
  if (!p) throw new HttpError(404, `Produto '${slug}' não encontrado`);
  return p;
}

function indicadorDeProduto(produto, slug) {
  if (!slug) throw new HttpError(400, "Parâmetro obrigatório ausente", { indicador: "obrigatório" });
  if (!produto.inds.includes(slug)) throw new HttpError(404, `Indicador '${slug}' não existe para ${produto.nome}`);
  return indicadorDo(produto, slug);
}

function periodo(sp) {
  const fim = sp.get("fim") ? Number(sp.get("fim")) : ANO_MAX;
  const inicio = sp.get("inicio") ? Number(sp.get("inicio")) : fim - 9;
  if (!Number.isInteger(fim) || !Number.isInteger(inicio)) throw new HttpError(400, "Período inválido", { inicio: "inteiro", fim: "inteiro" });
  if (inicio > fim) throw new HttpError(400, "Ano inicial maior que o final", { inicio: "deve ser ≤ fim" });
  if (inicio < ANO_MIN || fim > ANO_MAX) throw new HttpError(400, `Período fora de ${ANO_MIN}–${ANO_MAX}`, { fim: "fora do intervalo" });
  return { inicio, fim };
}

const meta = (produto) => ({ ...TABELAS[produto.tabela_sidra], tabela_sidra: produto.tabela_sidra, atualizado_em: ATUALIZADO_EM });
const resumo = (p) => ({ slug: p.slug, nome: p.nome, segmento: p.segmento });
const semAcento = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function pontosSerie(produto, indSlug, inicio, fim, mi) {
  const pontos = [];
  for (let ano = inicio; ano <= fim; ano++) {
    if (mi === null) {
      const v = totalEstadual(produto, indSlug, ano);
      pontos.push({ ano, valor: v, status: v === null ? "inexistente" : "ok" });
    } else {
      const c = celula(produto, indSlug, mi, ano);
      pontos.push({ ano, valor: c.valor, status: c.status });
    }
  }
  return pontos;
}

function municipioIdx(codigo) {
  const mi = MUNICIPIOS.findIndex((m) => m.codigo_ibge === codigo);
  if (mi < 0) throw new HttpError(404, `Município '${codigo}' não encontrado`);
  return mi;
}

// ---------- rotas ----------
function ranking(sp) {
  const produto = produtoDe(sp.get("produto"));
  const ind = indicadorDeProduto(produto, sp.get("indicador"));
  const { inicio, fim } = periodo(sp);
  const total = totalEstadual(produto, ind.slug, fim);
  const linhas = MUNICIPIOS.map((m, mi) => ({ m, c: celula(produto, ind.slug, mi, fim) }));
  const ok = linhas.filter((l) => l.c.status === "ok" && l.c.valor !== null).sort((a, b) => b.c.valor - a.c.valor);
  const sig = linhas.filter((l) => l.c.status === "sigiloso");
  const ine = linhas.filter((l) => l.c.status === "inexistente" || (l.c.status === "ok" && l.c.valor === null));
  const itens = [
    ...ok.map((l, i) => ({
      posicao: i + 1, municipio: l.m, valor: l.c.valor, status: "ok",
      percentual_total: ind.agregacao === "soma" && total ? Math.round((l.c.valor / total) * 10000) / 100 : null,
    })),
    ...sig.map((l) => ({ posicao: null, municipio: l.m, valor: null, status: "sigiloso", percentual_total: null })),
    ...ine.map((l) => ({ posicao: null, municipio: l.m, valor: null, status: "inexistente", percentual_total: null })),
  ];
  return { produto: resumo(produto), indicador: ind, inicio, fim, ano_referencia: fim, total_estadual: ind.agregacao === "nao_agregavel" ? null : total, itens, meta: meta(produto) };
}

function serie(sp) {
  const produto = produtoDe(sp.get("produto"));
  const ind = indicadorDeProduto(produto, sp.get("indicador"));
  const { inicio, fim } = periodo(sp);
  const cod = sp.get("municipio");
  const mi = cod ? municipioIdx(cod) : null;
  return { produto: resumo(produto), indicador: ind, municipio: mi === null ? null : MUNICIPIOS[mi], inicio, fim, pontos: pontosSerie(produto, ind.slug, inicio, fim, mi), meta: meta(produto) };
}

function comparacao(sp) {
  const { inicio, fim } = periodo(sp);
  const indSlug = sp.get("indicador");
  const lista = (v) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : []);
  const anos = Array.from({ length: fim - inicio + 1 }, (_, i) => inicio + i);
  if (sp.get("produtos")) {
    const slugs = lista(sp.get("produtos"));
    if (slugs.length < 2 || slugs.length > 5) throw new HttpError(400, "Informe de 2 a 5 produtos", { produtos: "2 a 5" });
    const prods = slugs.map(produtoDe);
    const inds = prods.map((p) => indicadorDeProduto(p, indSlug));
    const unidades = new Set(inds.map((i) => i.unidade));
    if (unidades.size > 1) throw new HttpError(422, `Unidades diferentes não podem ser comparadas: ${[...unidades].join(" × ")}`, { produtos: "unidades diferentes" });
    const cod = sp.get("municipio");
    const mi = cod ? municipioIdx(cod) : null;
    return {
      modo: "produtos", indicador: inds[0], unidade: inds[0].unidade, inicio, fim, anos,
      series: prods.map((p) => ({ id: p.slug, nome: p.nome, pontos: pontosSerie(p, indSlug, inicio, fim, mi) })),
      meta: meta(prods[0]),
    };
  }
  const produto = produtoDe(sp.get("produto"));
  const ind = indicadorDeProduto(produto, indSlug);
  const cods = lista(sp.get("municipios"));
  if (cods.length < 2 || cods.length > 5) throw new HttpError(400, "Informe de 2 a 5 municípios", { municipios: "2 a 5" });
  return {
    modo: "municipios", indicador: ind, unidade: ind.unidade, inicio, fim, anos,
    series: cods.map((c) => { const mi = municipioIdx(c); return { id: c, nome: MUNICIPIOS[mi].nome, pontos: pontosSerie(produto, ind.slug, inicio, fim, mi) }; }),
    meta: meta(produto),
  };
}

const br = (n, casas = 0) => n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

function analise(sp) {
  const s = serie(sp);
  const r = ranking(sp);
  const validos = s.pontos.filter((p) => p.valor !== null);
  const primeiro = validos[0];
  const ultimo = validos[validos.length - 1];
  const nome = s.indicador.nome.toLowerCase();
  const paragrafos = [];
  const m = {
    variacao_absoluta: null, variacao_percentual: null, cagr_percentual: null, maior_ano: null, menor_ano: null,
    top5: [], concentracao_top5_percentual: null,
  };
  if (primeiro && ultimo && primeiro.ano !== ultimo.ano) {
    m.variacao_absoluta = ultimo.valor - primeiro.valor;
    if (primeiro.valor > 0) {
      m.variacao_percentual = Math.round(((ultimo.valor / primeiro.valor - 1) * 100) * 10) / 10;
      m.cagr_percentual = Math.round((Math.pow(ultimo.valor / primeiro.valor, 1 / (ultimo.ano - primeiro.ano)) - 1) * 1000) / 10;
      paragrafos.push(`A ${nome} de ${s.produto.nome} em Rondônia passou de ${br(primeiro.valor)} em ${primeiro.ano} para ${br(ultimo.valor)} em ${ultimo.ano} (${m.variacao_percentual >= 0 ? "+" : ""}${br(m.variacao_percentual, 1)}%), crescimento médio anual de ${br(m.cagr_percentual, 1)}%.`);
    }
  }
  if (validos.length) {
    const max = validos.reduce((a, b) => (b.valor > a.valor ? b : a));
    const min = validos.reduce((a, b) => (b.valor < a.valor ? b : a));
    m.maior_ano = { ano: max.ano, valor: max.valor };
    m.menor_ano = { ano: min.ano, valor: min.valor };
    paragrafos.push(`O maior valor do período foi em ${max.ano} (${br(max.valor)}) e o menor em ${min.ano} (${br(min.valor)}).`);
  }
  m.top5 = r.itens.filter((i) => i.status === "ok").slice(0, 5).map((i) => ({ municipio: i.municipio, valor: i.valor, percentual: i.percentual_total }));
  if (r.indicador.agregacao === "soma" && m.top5.length) {
    m.concentracao_top5_percentual = Math.round(m.top5.reduce((a, i) => a + (i.percentual ?? 0), 0) * 10) / 10;
    paragrafos.push(`Em ${r.fim}, os cinco maiores municípios (${m.top5.map((i) => i.municipio.nome).join(", ")}) concentraram ${br(m.concentracao_top5_percentual, 1)}% do total estadual.`);
  }
  return { titulo: `${s.produto.nome} — ${s.indicador.nome}, ${s.inicio}–${s.fim}`, paragrafos, metricas: m, meta: s.meta };
}

function pdfMinimo(titulo) {
  const texto = titulo.replace(/[()\\]/g, "").normalize("NFD").replace(/[^\x20-\x7e]/g, "");
  const stream = `BT /F1 18 Tf 72 720 Td (FAPERON - relatorio mock) Tj 0 -28 Td /F1 12 Tf (${texto}) Tj ET`;
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offs = [];
  objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(out, "latin1");
}

const DESTAQUES = [
  ["soja", "Soja", "soja-em-grao", "quantidade-produzida"],
  ["milho", "Milho", "milho-em-grao", "quantidade-produzida"],
  ["cafe", "Café canéfora", "cafe-em-grao-canephora", "quantidade-produzida"],
  ["cacau", "Cacau", "cacau-em-amendoa", "quantidade-produzida"],
  ["bovino", "Rebanho bovino", "bovino", "efetivo"],
  ["leite", "Leite", "leite", "producao-de-origem-animal"],
];

function destaques() {
  const itens = DESTAQUES.map(([chave, rotulo, produtoSlug, indSlug]) => {
    const params = new URLSearchParams({ produto: produtoSlug, indicador: indSlug });
    const r = ranking(params);
    const pontos = pontosSerie(produtoDe(produtoSlug), indSlug, ANO_MAX - 9, ANO_MAX, null);
    const validos = pontos.filter((p) => p.valor !== null);
    const variacao = validos.length > 1 && validos[0].valor ? Math.round(((validos.at(-1).valor - validos[0].valor) / validos[0].valor) * 10000) / 100 : null;
    return {
      chave, rotulo, produto: r.produto, indicador: r.indicador, ano_referencia: ANO_MAX, total: r.total_estadual, serie: pontos, variacao_percentual: variacao,
      top: r.itens.filter((i) => i.status === "ok").slice(0, 5).map((i) => ({ municipio: i.municipio, valor: i.valor, percentual_total: i.percentual_total })),
      meta: r.meta,
    };
  });
  return { itens, meta: { atualizado_em: ATUALIZADO_EM } };
}

// ---- Observatório (/api/v1/observatorio/*): formato exato do contrato, dados fictícios ----
const META_OBS = {
  fontes: [{ fonte: "IBGE – Pesquisa Agrícola Municipal (PAM)", tabela_sidra: 5457, url_fonte: "https://sidra.ibge.gov.br/Tabela/5457" }],
  atualizado_em: "2026-10-01T12:00:00Z",
};
const qualidadeObs = (avisos = [], sigilosos = 0) => ({ municipios_sigilosos: sigilosos, ano_ref_monetario: 2024, avisos });
const COMO_LER = ["Explicação fictícia do mock.", "Segunda explicação."];
const ANOS_OBS = Array.from({ length: 10 }, (_, i) => 2015 + i);
const CULTURAS_OBS = [{ slug: "soja-em-grao", nome: "Soja (em grão)" }, { slug: "cafe-em-grao-canephora", nome: "Café (em grão) Canephora" }, { slug: "milho-em-grao", nome: "Milho (em grão)" }];
const REBANHOS_OBS = [{ slug: "bovino", nome: "Bovino" }, { slug: "suino-total", nome: "Suíno - total" }];

// Valida o parâmetro como a API real: valor fora das opções → 400 {erro, campos}.
function escolha(sp, campo, validos, padrao) {
  const bruto = sp.get(campo);
  if (bruto === null || bruto === "") return padrao;
  const valor = typeof padrao === "number" ? Number(bruto) : bruto;
  if (!validos.includes(valor)) throw new HttpError(400, "Parâmetros inválidos", { [campo]: `"${bruto}" não é uma escolha válida.` });
  return valor;
}

function observatorio(bloco, sp) {
  if (bloco === "panorama") {
    const ano = escolha(sp, "ano", ANOS_OBS, 2024);
    const janela = escolha(sp, "janela", [5, 10, 20], 10);
    const anos = ANOS_OBS.filter((a) => a <= ano && a > ano - janela);
    const composicao = [["soja-em-grao", "Soja (em grão)", 45], ["cafe-em-grao-canephora", "Café (em grão) Canephora", 20], ["milho-em-grao", "Milho (em grão)", 15], ["leite", "Leite", 12], ["demais", "Demais produtos", 8]]
      .map(([slug, nome, p]) => ({ slug, nome, valor: p * 1000, participacao: p }));
    return {
      filtros: { valores: { ano, janela, inicio: ano - janela + 1 }, opcoes: { anos: ANOS_OBS, janelas: [5, 10, 20] } },
      metricas: { valor_total_real: 100000, valor_lavouras_real: 88000, valor_origem_animal_real: 12000, variacao_real_pct: 42.5, area_colhida_ha: 1500000 },
      series: {
        composicao,
        evolucao: { anos, itens: composicao.map((c) => ({ slug: c.slug, nome: c.nome, valores: anos.map((_, i) => Math.round(c.valor * (0.6 + i * 0.04))) })) },
      },
      texto: { manchete: `Em ${ano}, Soja (em grão) respondeu por 45,0% do valor da produção agropecuária de Rondônia (mock).`, como_ler: COMO_LER },
      qualidade: qualidadeObs(["O valor da produção soma lavouras (PAM) e produtos de origem animal (PPM); não inclui carne bovina nem abate, que a PPM não publica."]),
      meta: META_OBS,
    };
  }
  if (bloco === "crescimento") {
    const cultura = escolha(sp, "cultura", CULTURAS_OBS.map((c) => c.slug), "soja-em-grao");
    const inicio = escolha(sp, "inicio", ANOS_OBS, 2015);
    const fim = escolha(sp, "fim", ANOS_OBS, 2024);
    if (inicio > fim) throw new HttpError(400, "O ano inicial não pode ser maior que o ano final", { inicio: "maior que fim" });
    const nome = CULTURAS_OBS.find((c) => c.slug === cultura).nome;
    const anos = ANOS_OBS.filter((a) => a >= inicio && a <= fim);
    return {
      filtros: { valores: { cultura, inicio, fim }, opcoes: { culturas: CULTURAS_OBS, anos: ANOS_OBS } },
      metricas: { variacao_producao_pct: 120, parte_area_pct: 35, parte_rendimento_pct: 65, perda_media_pct: 2.1, perda_ultimo_ano_pct: 1.8 },
      series: {
        indices: { anos, area: anos.map((_, i) => 100 + i * 4), rendimento: anos.map((_, i) => 100 + i * 7), producao: anos.map((_, i) => 100 + i * 12) },
        perda: anos.map((ano, i) => ({ ano, valor: 1 + (i % 3) })),
        valor_por_hectare: [{ slug: "cafe-em-grao-canephora", nome: "Café (em grão) Canephora", valor: 18000, participacao: null }, { slug: "soja-em-grao", nome: "Soja (em grão)", valor: 6500, participacao: null }],
      },
      texto: { manchete: `A produção de ${nome} cresceu 120,0% entre ${inicio} e ${fim} (mock).`, como_ler: COMO_LER },
      qualidade: qualidadeObs(),
      meta: META_OBS,
    };
  }
  if (bloco === "territorio") {
    const metrica = escolha(sp, "metrica", ["valor", "area", "rebanho", "dominante"], "valor");
    const cultura = escolha(sp, "cultura", CULTURAS_OBS.map((c) => c.slug), null);
    const ano = escolha(sp, "ano", ANOS_OBS, 2024);
    const municipios = MUNICIPIOS.map((m, i) => ({
      codigo_ibge: m.codigo_ibge, nome: m.nome, microrregiao: i % 2 ? "Ariquemes" : "Cacoal",
      valor: i < 2 ? null : (52 - i) * 100, status: i === 0 ? "sigiloso" : i === 1 ? "sem_dado" : "ok",
      categoria: metrica === "dominante" && i > 1 ? (i % 2 ? "soja-em-grao" : "cafe-em-grao-canephora") : null,
    }));
    return {
      filtros: {
        valores: { metrica, cultura, ano },
        opcoes: {
          metricas: [["valor", "Valor da produção", "Mil Reais"], ["area", "Área colhida", "Hectares"], ["rebanho", "Rebanho bovino", "Cabeças"], ["dominante", "Cultura dominante", ""]].map(([slug, nome, unidade]) => ({ slug, nome, unidade })),
          culturas: CULTURAS_OBS, anos: ANOS_OBS,
        },
      },
      metricas: { unidade: metrica === "area" ? "Hectares" : metrica === "rebanho" ? "Cabeças" : "Mil Reais", total: 130000, top5_pct: 38.4, hhi: 520, concentracao: "baixa" },
      series: {
        municipios,
        microrregioes: [{ nome: "Ariquemes", valor: 70000 }, { nome: "Cacoal", valor: 60000 }],
        dependentes: [{ codigo_ibge: MUNICIPIOS[2].codigo_ibge, nome: MUNICIPIOS[2].nome, cultura: "Soja (em grão)", participacao: 71.2 }],
        categorias: metrica === "dominante" ? CULTURAS_OBS.slice(0, 2) : [],
      },
      texto: { manchete: `Em ${ano}, os cinco maiores municípios concentraram 38,4% do total (mock).`, como_ler: COMO_LER },
      qualidade: qualidadeObs(["1 município com dado sigiloso (X) ficou fora da soma e da conclusão; o total é parcial."], 1),
      meta: META_OBS,
    };
  }
  const rebanho = escolha(sp, "rebanho", REBANHOS_OBS.map((r) => r.slug), "bovino");
  const inicio = escolha(sp, "inicio", ANOS_OBS, 2015);
  const fim = escolha(sp, "fim", ANOS_OBS, 2024);
  if (inicio > fim) throw new HttpError(400, "O ano inicial não pode ser maior que o ano final", { inicio: "maior que fim" });
  const anos = ANOS_OBS.filter((a) => a >= inicio && a <= fim);
  return {
    filtros: { valores: { rebanho, inicio, fim }, opcoes: { rebanhos: REBANHOS_OBS, anos: ANOS_OBS } },
    metricas: { efetivo_final: 18000000, variacao_pct: 30.2, top5_pct: 25.1, leite: { volume_mil_litros: 900000, valor_real: 1500000, produtividade_l_vaca: 1900, variacao_produtividade_pct: 22.4 } },
    series: {
      efetivo: anos.map((ano, i) => ({ ano, valor: 14000000 + i * 400000 })),
      municipios: MUNICIPIOS.map((m, i) => ({ codigo_ibge: m.codigo_ibge, nome: m.nome, valor: 1000000 - i * 15000 })),
      composicao: [{ slug: "bovino", nome: "Bovino", valor: 18000000, participacao: 90 }, { slug: "suino-total", nome: "Suíno - total", valor: 2000000, participacao: 10 }],
      leite_polos: MUNICIPIOS.slice(0, 5).map((m, i) => ({ codigo_ibge: m.codigo_ibge, nome: m.nome, volume: 90000 - i * 5000, produtividade: 2100 - i * 50 })),
    },
    texto: { manchete: `O rebanho ${rebanho === "bovino" ? "bovino" : "suíno"} cresceu 30,2% entre ${inicio} e ${fim} (mock).`, como_ler: COMO_LER },
    qualidade: qualidadeObs(),
    meta: META_OBS,
  };
}

function rota(url) {
  const sp = url.searchParams;
  switch (url.pathname.replace(/\/$/, "")) {
    case "/api/v1/saude": return { json: { status: "ok", banco: "ok" } };
    case "/api/v1/produtos": {
      const seg = sp.get("segmento");
      const q = semAcento(sp.get("q") ?? "");
      return { json: PRODUTOS.filter((p) => (!seg || p.segmento === seg) && semAcento(p.nome).includes(q)).map(({ slug, nome, segmento, tabela_sidra }) => ({ slug, nome, segmento, tabela_sidra })).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")) };
    }
    case "/api/v1/indicadores": {
      const p = produtoDe(sp.get("produto"));
      return { json: p.inds.map((s) => indicadorDo(p, s)) };
    }
    case "/api/v1/municipios": return { json: MUNICIPIOS };
    case "/api/v1/meta": return { json: { ultima_carga: ATUALIZADO_EM, cargas: [5457, 3939, 74].map((tabela) => ({ tabela, status: "concluida", concluida_em: ATUALIZADO_EM, linhas: 1000 })), anos: { min: ANO_MIN, max: ANO_MAX } } };
    case "/api/v1/destaques": return { json: destaques() };
    case "/api/v1/ranking": return { json: ranking(sp) };
    case "/api/v1/serie": return { json: serie(sp) };
    case "/api/v1/comparacao": return { json: comparacao(sp) };
    case "/api/v1/analise": return { json: analise(sp) };
    case "/api/v1/observatorio/panorama": return { json: observatorio("panorama", sp) };
    case "/api/v1/observatorio/crescimento": return { json: observatorio("crescimento", sp) };
    case "/api/v1/observatorio/territorio": return { json: observatorio("territorio", sp) };
    case "/api/v1/observatorio/pecuaria": return { json: observatorio("pecuaria", sp) };
    case "/api/v1/relatorio.pdf": {
      const a = analise(sp);
      const { inicio, fim } = periodo(sp);
      return { pdf: pdfMinimo(a.titulo), nome: `faperon-${sp.get("produto")}-${sp.get("indicador")}-${inicio}-${fim}.pdf` };
    }
    default: throw new HttpError(404, "Rota não encontrada");
  }
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  try {
    const r = rota(url);
    if (r.pdf) {
      res.writeHead(200, { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${r.nome}"` });
      res.end(r.pdf);
    } else {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(r.json));
    }
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(e instanceof HttpError ? e.body : { erro: String(e) }));
  }
});

server.listen(PORT, "0.0.0.0", () => console.log(`mock-api em http://localhost:${PORT}`));
