"""Recorta as 3 poses do Zétele da arte original, remove o fundo e grava em public/zetele/.

Uso (raiz do repo):
  uv run --with pillow --with scipy --with "rembg[cpu]==2.0.85" \\
    python apps/web/scripts/recortar-zetele.py ARTE.jpeg
A arte original tem 2752x1536; as caixas abaixo isolam cada pose, e o que entrar de enfeite
(folhas, trator) cai fora por não estar ligado ao personagem.
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image
from rembg import new_session, remove
from scipy import ndimage

CAIXAS = {
    "acenando": (150, 70, 1000, 1510),
    "tablet": (1090, 70, 1720, 1510),
    "apontando": (1800, 70, 2590, 1510),
}
LARGURA = 320
LIMITE_BYTES = 60_000
# Em pixels da arte original: olho, dente e camiseta ficam abaixo; vão entre braço e tronco, acima.
AREA_DETALHE = 2_000
# Faixa de baixo do corpo onde fica a sombra elíptica do chão.
FAIXA_SOMBRA = 0.08
DESTINO = Path(__file__).resolve().parent.parent / "public" / "zetele"


def rotulos_por_area(mascara: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    rotulos, _ = ndimage.label(mascara)
    return rotulos, np.bincount(rotulos.ravel())


def recortar(pose: Image.Image, mascara: Image.Image) -> Image.Image:
    """Aplica a máscara do rembg corrigindo o que o u2net erra nesta arte."""
    rgb = np.asarray(pose).astype(int)
    bruta = np.asarray(mascara)
    claro = rgb.min(axis=-1) >= 225

    # Só o maior pedaço é o Zétele: folha ou trator que entre na caixa fica de fora.
    rotulos, areas = rotulos_por_area(bruta >= 128)
    corpo = rotulos == areas[1:].argmax() + 1
    alfa = np.where(ndimage.binary_dilation(corpo, iterations=3), bruta, 0)

    # O u2net deixa o corpo levemente translúcido e vaza detalhes claros pequenos (decote):
    # o miolo e os buracos pequenos voltam opacos.
    rotulos, areas = rotulos_por_area(ndimage.binary_fill_holes(corpo) & ~corpo)
    opaco = ndimage.binary_erosion(corpo, iterations=2)
    opaco |= (areas < AREA_DETALHE)[rotulos] & (rotulos > 0)
    alfa[opaco] = 255

    # E toma por corpo o fundo cercado pelo braço: mancha clara grande dentro do corpo é fundo.
    rotulos, areas = rotulos_por_area(claro & corpo)
    vao = (areas >= AREA_DETALHE)[rotulos] & (rotulos > 0)
    alfa[ndimage.binary_dilation(vao, iterations=2)] = 0

    # Sombra do chão: cinza claro sem saturação junto das botas (que são marrons).
    linhas = np.nonzero(corpo.any(axis=1))[0]
    inicio = int(linhas[-1] - FAIXA_SOMBRA * (linhas[-1] - linhas[0]))
    faixa = rgb[inicio:]
    sombra = (faixa.min(axis=-1) >= 150) & (faixa.max(axis=-1) - faixa.min(axis=-1) <= 40)
    alfa[inicio:][sombra] = 0

    # Na borda suave a cor escurece com a máscara (como o rembg faz), para não deixar halo claro.
    cor = np.where(opaco[..., None], rgb, rgb * bruta[..., None] // 255)
    return Image.fromarray(np.dstack([cor, alfa]).astype(np.uint8), "RGBA")


def main(arte: Path) -> None:
    DESTINO.mkdir(parents=True, exist_ok=True)
    original = Image.open(arte).convert("RGB")
    # u2net fixo: o padrão do rembg 2.0.85 (bria-rmbg) vaza o branco dos olhos e tem licença
    # não comercial.
    sessao = new_session("u2net")
    for nome, caixa in CAIXAS.items():
        pose = original.crop(caixa)
        mascara = remove(pose, session=sessao, only_mask=True)
        assert isinstance(mascara, Image.Image)
        recorte = recortar(pose, mascara)
        recorte = recorte.crop(recorte.getbbox())
        altura = round(recorte.height * LARGURA / recorte.width)
        final = recorte.resize((LARGURA, altura), Image.Resampling.LANCZOS)
        png = DESTINO / f"{nome}.png"
        webp = DESTINO / f"{nome}.webp"
        final.save(png, optimize=True)
        tamanho = png.stat().st_size
        if tamanho > LIMITE_BYTES:
            final.save(webp, quality=85, method=6)
            png.unlink()
            print(f"{nome}: PNG com {tamanho} B passou do teto; WebP com {webp.stat().st_size} B")
        else:
            webp.unlink(missing_ok=True)
            print(f"{nome}: {png.name} {final.size} {tamanho} B")


if __name__ == "__main__":
    main(Path(sys.argv[1]))
