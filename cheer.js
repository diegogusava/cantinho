const CHEERS = {
  win: ["mandou-bem", "parabens-voce-conseguiu"],
  retry: ["tente-denovo-voce-consegue", "voce-quase-conseguiu-nao-desista"],
};

function cheer(kind) {
  const names = CHEERS[kind];
  new Audio("sounds/" + names[Math.floor(Math.random() * names.length)] + ".mp3").play();
}
