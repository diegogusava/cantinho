# Desenhos para colorir

Folhas de atividades publicadas pelos titulares das personagens. Os créditos
estão no rodapé da página de pintura.

- `olaf.png`: página 1 do conjunto Frozen II, Disney Publishing Worldwide.
  Fonte: https://cdnvideo.dolimg.com/cdn_assets/1592b3ec681ecd7417ea8a3a144c6562dd911da5.pdf
- `barbie.png`: Mermaid Activity Sheet 03, disponível em https://kids.mattel.com/barbie.
  Fonte: https://assets.contentstack.io/v3/assets/bltfe66deb587a77004/blt617336eba71a1023/630ea458f86a7b0f54595497/BB_YCB20_Mermaid_ActivitySheet_03.pdf
- `fada.png`: Fairy Activity Sheet 02, também em https://kids.mattel.com/barbie.
  Fonte: https://assets.contentstack.io/v3/assets/bltfe66deb587a77004/blt35ab2428eaff8cb8/630ea482f86a7b0f545954a3/BB_YCB20_Fairy_ActivitySheet_02.pdf
- `elsa.png`: página 10 do mesmo conjunto Frozen II do Olaf.
- `peppa.png`: Colour in — Peppa & George, disponível em https://us.peppapig.com/en-us/activities.
  Fonte: https://assets-us-01.kc-usercontent.com/500e0a65-283d-00ef-33b2-7f1f20488fe2/5944c566-f1d4-4e5c-af7e-a636d4a78213/Colour%20in%20-%20Peppa%20_%20George.pdf
- `bluey.png`: Bluey Colouring Sheet, disponível em https://www.bluey.tv/make/bluey-colouring-sheet/.
  Fonte: https://www.bluey.tv/wp-content/uploads/2019/07/Bluey.pdf
- `bingo.png`: Bingo Colouring Sheet, disponível em https://www.bluey.tv/make/bingo-colouring-sheet/.
  Fonte: https://www.bluey.tv/wp-content/uploads/2019/07/Bingo.pdf

Prefira desenhos simples: traço fechado e áreas grandes, fáceis de acertar
com o dedo. `fada.png` e `elsa.png` são as exceções, cheias de detalhes
pequenos. Para elas existe o zoom com dois dedos.

As páginas foram rasterizadas com `pdftoppm -singlefile -scale-to 2000 -png`
(Olaf com `-f 1`, Elsa com `-f 10`). Cada uma foi recortada no personagem, sem título, moldura
e logo, e centralizada em 720x960, o tamanho do canvas. Assim o desenho ocupa
a tela toda. Nenhum desenho gerado por IA é usado nesta página.

Onde o traço original deixava a tinta do balde vazar para o fundo, o recorte
fecha o desenho: uma linha na base da sereia e da Elsa, que saem da folha, e
traço um pouco mais grosso no Olaf, na Bluey e na Bingo.

As fotos do quebra-cabeça (`images/*.jpg`) também aparecem na página, em
cinza. Foto não tem áreas fechadas, então nelas só há lápis e borracha, e a
cor é pintada por cima da foto.

`pintar.html` contém o CSS, o JavaScript e as imagens em data URLs. A página
funciona quando aberta diretamente e quando apenas o HTML está disponível
na prévia. O canvas usa a mesma imagem incorporada que aparece na escolha,
para não depender de caminhos relativos ou de permissões para arquivos locais.

Os PNGs nesta pasta são as fontes das imagens incorporadas. Ao trocar um
desenho, atualize também o `src` do respectivo cartão em `pintar.html`.

Na pintura, o canvas usa os traços neutros escuros.
