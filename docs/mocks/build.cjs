// Gera informativos-livros.html a partir do template e dos dados reais em apps/web/src/content/informativos.ts.
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(path.join(__dirname, "../../apps/web/src/content/informativos.ts"), "utf8");
const pdfUrl = (hash) => `https://www.faperon.com.br/_files/ugd/cbbcc7_${hash}.pdf`;

const categorias = [];
let atual = null;
for (const linha of src.split("\n")) {
  let m;
  if ((m = linha.match(/^\s+id: "(corte|leite)",$/))) {
    atual = { id: m[1], itens: [] };
    categorias.push(atual);
  } else if (atual && (m = linha.match(/^\s+titulo: "([^"]+)",$/)) && !atual.titulo) {
    atual.titulo = m[1];
  } else if (atual && (m = linha.match(/curto: "([^"]+)"/))) {
    atual.curto = m[1];
  } else if (atual && (m = linha.match(/\{ titulo: "([^"]+)", data: "([^"]+)", url: pdf\("([0-9a-f]+)"\) \}/))) {
    atual.itens.push({ titulo: m[1], data: m[2], url: pdfUrl(m[3]) });
  }
}

const boletins = [];
const trecho = src.slice(src.indexOf("boletins: ["));
const re = /titulo: "([^"]+)",\s+data: "([^"]+)",\s+categoria: "(\w+)",\s+url: pdf\("([0-9a-f]+)"\)/g;
let m;
while ((m = re.exec(trecho))) boletins.push({ titulo: m[1], data: m[2], categoria: m[3], url: pdfUrl(m[4]) });

console.log(categorias.map((c) => `${c.id}: ${c.itens.length} (${c.titulo} / ${c.curto})`), `boletins: ${boletins.length}`);
const html = fs.readFileSync(path.join(__dirname, "template.html"), "utf8").replace("/*DATA*/", () => JSON.stringify({ categorias, boletins }));
fs.writeFileSync(path.join(__dirname, "informativos-livros.html"), html);
