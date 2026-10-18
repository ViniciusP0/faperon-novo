"""Recorta as 3 poses do Zétele da arte original, remove o fundo e grava em public/zetele/.
Arte atual: Zétele com a camisa da FAPERON. Na pose acenando, desenha um celular na mão baixa,
no mesmo traço do tablet da outra pose (a arte original traz a mão vazia).

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


# Coordenadas do celular, pensadas na largura final (LARGURA = 320) da pose acenando.
REF = 320
CONTORNO = (52, 36, 28, 255)
# Centro, tamanho e inclinação do aparelho (graus; positivo tomba o topo para a esquerda).
CELULAR = {"centro": (48.5, 424.0), "largura": 35.0, "altura": 72.0, "angulo": -4.0}
# Polegar: a base é o polegar original (que aponta para a perna); o segmento novo dobra para
# baixo por cima da borda direita da tela.
POLEGAR = {"base": (66.0, 385.0), "ponta": (59.5, 419.0), "raio": 5.5}
# Pontas dos dedos que dobram sobre a borda esquerda da tela: (x inicial, x final, y, raio).
DEDOS = [(26.0, 44.5, 412.0, 5.4), (26.0, 45.0, 426.5, 5.5), (26.0, 44.0, 441.0, 5.3)]


def mediana_pele(img: Image.Image, caixa: tuple[int, int, int, int]) -> tuple[int, int, int, int]:
    """Cor de pele amostrada da própria mão: mediana dos pixels opacos e alaranjados da caixa."""
    px = np.asarray(img.crop(caixa)).reshape(-1, 4)
    pele = px[(px[:, 3] == 255) & (px[:, 0] > 150) & (px[:, 0] > px[:, 2] + 50)]
    r, g, b = np.median(pele[:, :3], axis=0).astype(int)
    return int(r), int(g), int(b), 255


def capsula(d: ImageDraw.ImageDraw, a, b, raio: float, cor, borda: float) -> None:
    """Dedo de a até b: ponta redonda em b, sombra embaixo e contorno. O lado de a fica reto e
    sem contorno, para o dedo nascer da pele que já existe na mão."""
    ax, ay = a
    bx, by = b
    ang = np.arctan2(by - ay, bx - ax)
    arco = np.linspace(ang - np.pi / 2, ang + np.pi / 2, 14)
    pontos = [(bx + raio * np.cos(t), by + raio * np.sin(t)) for t in arco]
    nx, ny = -np.sin(ang) * raio, np.cos(ang) * raio
    pontos += [(ax + nx, ay + ny), (ax - nx, ay - ny)]
    pele, sombra = cor
    d.polygon(pontos, fill=sombra)
    # Parte clara encolhida e puxada para cima/esquerda: sobra a sombra embaixo, sem vazar do
    # contorno; o lado reto não encolhe, para continuar colado na pele.
    mx, my = (ax + bx) / 2, (ay + by) / 2
    dx, dy = -0.12 * raio, -0.15 * raio
    claro = [(mx + (x - mx) * 0.85 + dx, my + (y - my) * 0.85 + dy) for x, y in pontos[:-2]]
    claro += [(ax + nx * 0.85 + dx, ay + ny * 0.85 + dy), (ax - nx * 0.85 + dx, ay - ny * 0.85 + dy)]
    d.polygon(claro, fill=pele)
    d.line([pontos[-1]] + pontos[:-2] + [pontos[-2]], fill=CONTORNO, width=round(borda), joint="curve")


def desenhar_celular(s: float) -> Image.Image:
    """Smartphone de pé, no traço do tablet da outra pose: contorno grosso, aro claro, tela em
    degradê com brilho diagonal e um toque do verde FAPERON no alto, câmera frontal."""
    w, h = round(CELULAR["largura"] * s), round(CELULAR["altura"] * s)
    borda = round(2.4 * s)
    raio = 4.2 * s
    aparelho = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(aparelho)
    # Corpo: aro claro (como o do tablet) dentro do contorno grosso.
    d.rounded_rectangle(
        [0, 0, w - 1, h - 1], radius=raio, fill=(168, 178, 188, 255), outline=CONTORNO, width=borda
    )
    aro = borda + round(1.1 * s)
    tela = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    yy, xx = np.mgrid[0:h, 0:w]
    t = np.clip((yy / h) * 0.75 + (xx / w) * 0.25, 0, 1)[..., None]
    topo, fundo = np.array([188, 214, 206]), np.array([98, 120, 132])
    cor = (topo * (1 - t) + fundo * t).astype(np.uint8)
    tela_rgb = Image.fromarray(np.dstack([cor, np.full((h, w), 255, np.uint8)]), "RGBA")
    mascara = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mascara).rounded_rectangle(
        [aro, aro, w - 1 - aro, h - 1 - aro], radius=raio * 0.55, fill=255
    )
    tela.paste(tela_rgb, (0, 0), mascara)
    dt = ImageDraw.Draw(tela)
    # Barra verde no alto da tela (verde FAPERON) e brilho diagonal translúcido.
    dt.rectangle([aro, aro + 2.6 * s, w - 1 - aro, aro + 5.2 * s], fill=(0, 96, 78, 255))
    brilho = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(brilho).polygon(
        [(aro, aro + 24 * s), (aro, aro + 36 * s), (w - aro, aro + 9 * s), (w - aro, aro + 2 * s)],
        fill=(255, 255, 255, 78),
    )
    brilho.putalpha(Image.fromarray(np.asarray(brilho)[..., 3] * (np.asarray(mascara) > 0)))
    tela.alpha_composite(brilho)
    aparelho.alpha_composite(tela)
    d = ImageDraw.Draw(aparelho)
    cx, cy, r = w / 2, aro + 1.3 * s, 0.9 * s
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(60, 50, 44, 255))  # câmera frontal
    return aparelho.rotate(CELULAR["angulo"], resample=Image.Resampling.BICUBIC, expand=True)


def segurar_celular(img: Image.Image) -> Image.Image:
    """Celular na mão baixa, como se segurado de verdade: aparelho à frente da palma, pontas
    dos dedos dobrando sobre a borda esquerda da tela e polegar cruzando o canto de cima.
    Desenha em 2x e reduz, para o traço sair suave."""
    s = 2 * img.width / REF
    p = lambda x, y: (x * s, y * s)
    lona = Image.new("RGBA", (img.width * 2, img.height * 2), (0, 0, 0, 0))
    celular = desenhar_celular(s)
    cx, cy = p(*CELULAR["centro"])
    lona.alpha_composite(celular, (round(cx - celular.width / 2), round(cy - celular.height / 2)))
    d = ImageDraw.Draw(lona)
    # Pele amostrada do dorso da mão (acima do aparelho); a sombra é a mesma pele mais quente e escura.
    f = img.width / REF
    pele = mediana_pele(img, (int(30 * f), int(355 * f), int(50 * f), int(375 * f)))
    sombra = (int(pele[0] * 0.86), int(pele[1] * 0.72), int(pele[2] * 0.62), 255)
    borda = 2.4 * s
    for x0, x1, y, raio in DEDOS:
        capsula(d, p(x0, y), p(x1, y), raio * s, (pele, sombra), borda)
    capsula(d, p(*POLEGAR["base"]), p(*POLEGAR["ponta"]), POLEGAR["raio"] * s, (pele, sombra), borda)
    sobre = lona.resize(img.size, Image.Resampling.LANCZOS)
    saida = img.copy()
    saida.alpha_composite(sobre)
    return saida


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
            # pedido do usuário (18/10/2026): o Zétele acenando segura um celular, no lugar da
            # enxada de 17/10
            recorte = segurar_celular(recorte)
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
