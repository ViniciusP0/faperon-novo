"""Extrai o fundo da capa do boletim da FAPERON para o modelo de relatórios do sistema.

Uso (raiz do repo):
  uv run --with pymupdf --with pillow python apps/web/scripts/extrair-capa-relatorio.py BOLETIM.pdf

No PDF, a capa é uma única imagem (fundo verde, logo e mosaico de ilustrações) com o título, os
dados e a linha verde desenhados por cima: extrair essa imagem já dá a capa sem texto. Os textos
voltam como campos editáveis no modelo (apps/web/src/lib/sistema/documento.ts).
"""

import io
import sys
from pathlib import Path

import pymupdf
from PIL import Image

LARGURA = 1240  # A4 a 150 dpi: nítido na impressão e leve no site
DESTINO = Path(__file__).resolve().parent.parent / "public" / "relatorios" / "capa.webp"


def main(pdf: Path) -> None:
    pagina = pymupdf.open(pdf)[0]
    # a imagem que cobre a página inteira é o fundo da capa
    xref = next(
        info["xref"]
        for info in pagina.get_image_info(xrefs=True)
        if pymupdf.Rect(info["bbox"]).contains(pagina.rect * 0.99)
    )
    pix = pymupdf.Pixmap(pagina.parent, xref)
    imagem = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
    altura = round(imagem.height * LARGURA / imagem.width)
    DESTINO.parent.mkdir(parents=True, exist_ok=True)
    imagem.resize((LARGURA, altura), Image.Resampling.LANCZOS).save(DESTINO, quality=82, method=6)
    print(f"{DESTINO.name}: {LARGURA}x{altura}, {DESTINO.stat().st_size} B")


if __name__ == "__main__":
    main(Path(sys.argv[1]))
