"""
Gera marca/logo-sem-subtitulo.png a partir de marca/logo-original.png: tira a linha
"— JIU-JITSU —" (a academia tem várias modalidades) e desce "ACADEMIA SCUZZIATO" para
ficar centralizado na altura do ícone.

Medidas do original (px): ícone y 10–277 (centro 143,5); texto começa em x 310;
"ACADEMIA" + "SCUZZIATO" y 65–184 (centro 124,5); subtítulo y 211–242.

Uso: python3 marca/sem-subtitulo.py  (depois: marca/vetorizar.py, ver CLAUDE.md)
"""
import os
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
X_TEXTO, Y_TOPO, Y_FIM_NOME, Y_FIM = 310, 55, 195, 283
DESLOCAMENTO = round(143.5 - 124.5)  # centro do ícone − centro do nome

im = Image.open(os.path.join(AQUI, 'logo-original.png')).convert('RGB')
nome = im.crop((X_TEXTO, Y_TOPO, im.width, Y_FIM_NOME))
im.paste((0, 0, 0), (X_TEXTO, 0, im.width, Y_FIM))               # apaga todo o texto (inclusive o subtítulo)
im.paste(nome, (X_TEXTO, Y_TOPO + DESLOCAMENTO))                 # devolve só o nome, mais abaixo
im.save(os.path.join(AQUI, 'logo-sem-subtitulo.png'))
