"""Recorta as 3 poses do Zétele da arte original, remove o fundo e grava em public/zetele/.
Arte atual: Zétele com a camisa da FAPERON. Na pose acenando, desenha uma enxada no mesmo traço.

Uso (raiz do repo):
  uv run --with pillow --with scipy --with "rembg[cpu]==2.0.85" \\
    python apps/web/scripts/recortar-zetele.py ARTE.jpeg
A arte original tem 2752x1536; as caixas abaixo isolam cada pose, e o que entrar de enfeite
(folhas, trator) cai fora por não estar ligado ao personagem.
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
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
    # Fundo da arte é branco puro; o bege do chapéu e o xadrez claro da camisa ficam abaixo disso.
    branco = rgb.min(axis=-1) >= 250

    # Só o maior pedaço é o Zétele: folha ou trator que entre na caixa fica de fora.
    rotulos, areas = rotulos_por_area(bruta >= 128)
    corpo = rotulos == areas[1:].argmax() + 1
    alfa = np.where(ndimage.binary_dilation(corpo, iterations=3), bruta, 0)

    # O u2net deixa partes claras translúcidas ou furadas (decote, chapéu bege): dentro da
    # silhueta tudo volta opaco, menos o fundo visto entre braço e tronco, que é mancha grande
    # de branco puro.
    silhueta = ndimage.binary_fill_holes(corpo)
    rotulos, areas = rotulos_por_area(branco & silhueta)
    vao = ndimage.binary_dilation((areas >= AREA_DETALHE)[rotulos] & (rotulos > 0), iterations=2)
    opaco = ndimage.binary_erosion(silhueta, iterations=2) & ~vao
    alfa[opaco] = 255
    alfa[vao] = 0

    # Sombra do chão: cinza claro sem saturação junto das botas (que são marrons).
    linhas = np.nonzero(corpo.any(axis=1))[0]
    inicio = int(linhas[-1] - FAIXA_SOMBRA * (linhas[-1] - linhas[0]))
    faixa = rgb[inicio:]
    sombra = (faixa.min(axis=-1) >= 150) & (faixa.max(axis=-1) - faixa.min(axis=-1) <= 40)
    alfa[inicio:][sombra] = 0

    # Na borda suave a cor escurece com a máscara (como o rembg faz), para não deixar halo claro.
    cor = np.where(opaco[..., None], rgb, rgb * bruta[..., None] // 255)
    return Image.fromarray(np.dstack([cor, alfa]).astype(np.uint8), "RGBA")


# Coordenadas da enxada, pensadas na largura final (LARGURA = 320) da pose acenando.
REF = 320
FOLGA = 20  # à esquerda, para a lâmina caber


def segurar_enxada(img: Image.Image) -> Image.Image:
    """Enxada desenhada no mesmo traço, atrás do personagem: a mão aberta repousa sobre o cabo
    e a lâmina fica rente ao chão, ao lado da bota."""
    s = img.width / REF
    p = lambda x, y: ((x + FOLGA) * s, y * s)
    contorno = (52, 36, 28, 255)
    lona = Image.new("RGBA", (img.width + int(FOLGA * s), img.height + int(4 * s)), (0, 0, 0, 0))
    d = ImageDraw.Draw(lona)
    topo, base = (66, 250), (22, 572)
    d.line([p(*topo), p(*base)], fill=contorno, width=round(9.4 * s))
    d.line([p(*topo), p(*base)], fill=(176, 122, 69, 255), width=round(5 * s))
    d.line([p(65.2, 254), p(22.6, 562)], fill=(214, 160, 98, 255), width=round(1.4 * s))  # brilho
    ox, oy = base[0] + 5, base[1] - 7  # olho da enxada, logo acima da ponta do cabo
    lamina = [p(ox + 6, oy + 2), p(ox - 33, oy - 9), p(ox - 37, oy + 23), p(ox + 5, oy + 18)]
    d.polygon(lamina, fill=(142, 152, 156, 255))
    fio = [p(ox - 33, oy - 9), p(ox - 28, oy - 8), p(ox - 31, oy + 23), p(ox - 37, oy + 23)]
    d.polygon(fio, fill=(198, 206, 208, 255))
    d.line(lamina + [lamina[0]], fill=contorno, width=round(2.6 * s), joint="curve")
    d.rounded_rectangle(
        [p(ox - 6, oy), p(ox + 10, oy + 12)],
        radius=2 * s,
        fill=(110, 118, 122, 255),
        outline=contorno,
        width=round(2.2 * s),
    )
    lona.alpha_composite(img, (int(FOLGA * s), 0))
    return lona.crop(lona.getbbox())


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
        if nome == "acenando":
            # pedido do usuário (17/10/2026): o Zétele acenando segura uma enxada
            recorte = segurar_enxada(recorte)
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
