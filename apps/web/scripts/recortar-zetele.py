"""Recorta as 3 poses do Zétele da arte original, remove o fundo e grava em public/zetele/.
Na pose acenando, troca o chapéu que ele segura por uma enxada desenhada no mesmo traço.

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


# Coordenadas da troca chapéu → enxada, pensadas na largura final (LARGURA = 320).
REF = 320


def trocar_chapeu_por_enxada(img: Image.Image) -> Image.Image:
    s = img.width / REF
    p = lambda x, y: (x * s, y * s)  # noqa: E731
    a = np.asarray(img.convert("RGBA")).copy()
    h, w = a.shape[:2]

    # 1) a mão fecha sobre a aba: ela fica; o resto do chapéu sai
    mao = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mao).polygon([p(34, 314), p(86, 314), p(86, 350), p(82, 368), p(70, 377), p(50, 377), p(37, 367), p(33, 340)], fill=255)
    mao_arr = np.asarray(mao) > 0
    ys, xs = np.mgrid[0:h, 0:w]
    y320, x320 = ys / s, xs / s
    borda = 84 - (y320 - 336) * (10 / 142)  # contorno esquerdo da perna esquerda
    regiao = (y320 >= 336) & (y320 <= 478) & (x320 <= 114) & ~mao_arr
    perna = regiao & (x320 > borda)
    fora = regiao & ~perna

    # 2) a calça coberta pelo chapéu volta com a textura da própria perna logo abaixo
    linha_fonte = int(482 * s)
    a[perna] = a[linha_fonte, xs[perna]]
    a[fora, 3] = 0

    img2 = Image.fromarray(a, "RGBA")
    d2 = ImageDraw.Draw(img2)
    contorno = (52, 36, 28, 255)
    d2.line([p(84, 336), p(74, 482)], fill=contorno, width=round(2.6 * s))

    # 3) enxada atrás do personagem: o cabo some atrás do braço e aparece no punho fechado
    enxada = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(enxada)
    topo, base = p(80, 210), p(41, 540)
    d.line([topo, base], fill=contorno, width=round(9.4 * s))
    d.line([topo, base], fill=(176, 122, 69, 255), width=round(5 * s))
    d.line([p(79.2, 214), p(41.6, 530)], fill=(214, 160, 98, 255), width=round(1.4 * s))
    # lâmina da enxada: estreita junto ao olho, larga no fio (à esquerda, rente ao chão)
    lamina = [p(46, 533), p(7, 522), p(3, 554), p(45, 549)]
    d.polygon(lamina, fill=(142, 152, 156, 255))
    d.polygon([p(7, 522), p(12, 523), p(9, 554), p(3, 554)], fill=(198, 206, 208, 255))  # fio afiado
    d.line([p(14, 530), p(40, 537)], fill=(170, 180, 183, 255), width=round(1.4 * s))  # brilho
    d.line(lamina + [lamina[0]], fill=contorno, width=round(2.6 * s), joint="curve")
    d.rounded_rectangle([p(35, 531), p(51, 543)], radius=2 * s, fill=(110, 118, 122, 255), outline=contorno, width=round(2.2 * s))  # olho da enxada
    enxada.alpha_composite(img2)
    return enxada


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
            # pedido do usuário (17/10/2026): sai o chapéu da mão, entra uma enxada
            recorte = trocar_chapeu_por_enxada(recorte)
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
