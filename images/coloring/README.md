# Desenhos para colorir

Folhas de atividades publicadas pelos titulares das personagens. Os créditos
originais estão nas imagens e no rodapé da página de pintura.

- `elsa.png`: página 10 do conjunto Frozen II, Disney Publishing Worldwide.
  Fonte: https://cdnvideo.dolimg.com/cdn_assets/1592b3ec681ecd7417ea8a3a144c6562dd911da5.pdf
- `barbie.png`: Fairy Activity Sheet 02, disponível em https://kids.mattel.com/barbie.
  Fonte: https://assets.contentstack.io/v3/assets/bltfe66deb587a77004/blt35ab2428eaff8cb8/630ea482f86a7b0f545954a3/BB_YCB20_Fairy_ActivitySheet_02.pdf
- `peppa.png`: Colour in — Peppa & George, disponível em https://us.peppapig.com/en-us/activities.
  Fonte: https://assets-us-01.kc-usercontent.com/500e0a65-283d-00ef-33b2-7f1f20488fe2/5944c566-f1d4-4e5c-af7e-a636d4a78213/Colour%20in%20-%20Peppa%20_%20George.pdf
- `bluey.png`: Bluey Colouring Sheet, disponível em https://www.bluey.tv/make/bluey-colouring-sheet/.
  Fonte: https://www.bluey.tv/wp-content/uploads/2019/07/Bluey.pdf

As páginas foram rasterizadas com `pdftoppm -singlefile -scale-to 1400 -png`.
Para Elsa, foram usados também `-f 10`. As ilustrações e os créditos foram
preservados. Nenhum desenho gerado por IA é usado nesta página.

`pintar.html` contém o CSS, o JavaScript e as imagens em data URLs. A página
funciona quando aberta diretamente e quando apenas o HTML está disponível
na prévia. O canvas usa a mesma imagem incorporada que aparece na escolha,
para não depender de caminhos relativos ou de permissões para arquivos locais.

Os PNGs nesta pasta são as fontes das imagens incorporadas. Ao trocar um
desenho, atualize também o `src` do respectivo cartão em `pintar.html`.

Na pintura, o canvas usa os traços neutros escuros. Cores presentes nos logos
e nas decorações das folhas não viram áreas pretas sobre o desenho.
