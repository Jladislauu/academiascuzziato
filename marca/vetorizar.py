"""
Vetoriza a logo da Academia Scuzziato (PNG branco e cinza sobre fundo preto) em SVG.

Uso:
    python3 marca/vetorizar.py marca/logo-original.png  saida.svg --cor-branco '#FFFFFF' --cor-cinza '#ABABAB' --cinza-ate 310
    python3 marca/vetorizar.py marca/icone-original.png saida.svg

Precisa de: potrace (apt install potrace), Pillow e numpy.

Como funciona: amplia a imagem 6x, separa o branco (letras e "S") do cinza (contorno do
hexágono), vetoriza cada cor com potrace e junta as duas num SVG recortado rente.
--cinza-ate N: o cinza só vale até a coluna N (px do original). No logo, evita que a borda
suavizada das linhas finas do "JIU-JITSU" vire cinza.
"""
import argparse, os, re, subprocess, tempfile
import numpy as np
from PIL import Image, ImageFilter

ESCALA = 6

def mascaras(caminho, cinza_ate):
    im = Image.open(caminho).convert('L')
    im = im.resize((im.width * ESCALA, im.height * ESCALA), Image.LANCZOS).filter(ImageFilter.GaussianBlur(ESCALA * 0.35))
    a = np.array(im).astype(int)
    branco = a >= 205
    perto_branco = np.array(Image.fromarray((branco * 255).astype('uint8')).filter(ImageFilter.MaxFilter(ESCALA * 2 + 1))) > 0
    cinza = (a >= 110) & (a < 205) & ~perto_branco
    c = Image.fromarray((cinza * 255).astype('uint8')).filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MaxFilter(5))
    cinza = (np.array(c) > 0) | ((a >= 90) & (a < 205) & ~perto_branco & (np.array(c.filter(ImageFilter.MaxFilter(ESCALA + 1))) > 0))
    if cinza_ate:
        cinza[:, cinza_ate * ESCALA:] = False
    return branco, cinza

def potrace(mask, pasta, nome):
    pbm, svg = os.path.join(pasta, f'{nome}.pbm'), os.path.join(pasta, f'{nome}.svg')
    Image.fromarray(np.where(mask, 0, 255).astype('uint8')).convert('1').save(pbm)
    subprocess.run(['potrace', pbm, '-s', '--flat', '-t', '150', '-a', '0.9', '-O', '0.6', '-o', svg], check=True)
    g = re.search(r'<g transform="([^"]+)"[^>]*>\s*<path d="([^"]+)"', open(svg).read(), re.S)
    return g.group(1), ' '.join(g.group(2).split())

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('entrada'); ap.add_argument('saida')
    ap.add_argument('--cor-branco', default='#FFFFFF'); ap.add_argument('--cor-cinza', default='#ABABAB')
    ap.add_argument('--cinza-ate', type=int, default=0); ap.add_argument('--titulo', default='Academia Scuzziato')
    a = ap.parse_args()
    branco, cinza = mascaras(a.entrada, a.cinza_ate)
    with tempfile.TemporaryDirectory() as pasta:
        partes = []
        if cinza.any():
            t, d = potrace(cinza, pasta, 'cinza'); partes.append(f'<path fill="{a.cor_cinza}" transform="{t}" d="{d}"/>')
        t, d = potrace(branco, pasta, 'branco'); partes.append(f'<path fill="{a.cor_branco}" transform="{t}" d="{d}"/>')
    ys, xs = np.where(branco | cinza); m = ESCALA * 2
    x0, y0, x1, y1 = int(xs.min()) - m, int(ys.min()) - m, int(xs.max()) + m, int(ys.max()) + m
    open(a.saida, 'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0} {y0} {x1 - x0} {y1 - y0}" role="img" '
                             f'aria-label="{a.titulo}"><title>{a.titulo}</title>{"".join(partes)}</svg>\n')

if __name__ == '__main__':
    main()
